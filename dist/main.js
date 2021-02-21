'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.cleanUrl = exports.hashRE = exports.queryRE = exports.FS_PREFIX = exports.transformMain = void 0
const compiler_sfc_1 = require('@vue/compiler-sfc')
const index_1 = require('./index')
const querystring_1 = __importDefault(require('querystring'))
const descriptorCache_1 = require('./utils/descriptorCache')
const path_1 = __importDefault(require('path'))
const fs_1 = __importDefault(require('fs'))
async function transformMain(code, filePath, options, pluginContext) {
  const descriptor = descriptorCache_1.createDescriptor(code, filePath, options)
  const hasFunctional =
    descriptor.template && descriptor.template.attrs.functional
  // template
  const { code: templateCode, templateRequest } = await genTemplateRequest(
    filePath,
    descriptor,
    pluginContext
  )
  // script
  const scriptVar = 'script'
  const { scriptCode } = await genScriptCode(
    scriptVar,
    descriptor,
    filePath,
    options,
    pluginContext
  )
  // style
  const cssModuleVar = '__cssModules'
  const { scoped, stylesCode } = await genStyleRequest(
    cssModuleVar,
    descriptor,
    filePath,
    pluginContext
  )
  let result =
    `${scriptCode}
${templateCode}
const ${cssModuleVar} = {}
${stylesCode}
/* normalize component */
import normalizer from "${index_1.vueComponentNormalizer}"
var component = normalizer(
  script,
  render,
  staticRenderFns,
  ${hasFunctional ? `true` : `false`},
  injectStyles,
  ${scoped ? JSON.stringify(descriptor.id) : `null`},
  null,
  null
)
  `.trim() + `\n`
  result += `
function injectStyles (context) {
  for(let o in ${cssModuleVar}){
    this[o] = ${cssModuleVar}[o]
  }
}\n`
  // custom block
  code += genCustomBlockCode(filePath, descriptor)
  // Expose filename. This is used by the devtools and Vue runtime warnings.
  if (options.isProduction) {
    // Expose the file's full path in development, so that it can be opened
    // from the devtools.
    code += `\ncomponent.options.__file = ${JSON.stringify(
      path_1.default.relative(options.root, filePath).replace(/\\/g, '/')
    )}`
  }
  // else if (options.exposeFilename) {
  // 	// Libraries can opt-in to expose their components' filenames in production builds.
  // 	// For security reasons, only expose the file's basename in production.
  // 	code += `\ncomponent.options.__file = ${JSON.stringify(filePath)}`
  // }
  if (options.devServer && !options.isProduction) {
    result += genHmrCode(
      options.root,
      descriptor.id,
      !!hasFunctional,
      templateRequest
    )
  }
  result += `\nexport default component.exports`
  return result
}
exports.transformMain = transformMain
const exportDefaultClassRE = /export\s+default\s+class\s+([\w$]+)/
async function genScriptCode(
  scriptVar,
  descriptor,
  filename,
  options,
  pluginContext
) {
  const { script } = descriptor
  let scriptCode = `const ${scriptVar} = {}`
  if (!script) {
    return { scriptCode }
  }
  let map
  if (script) {
    // If the script is js/ts and has no external src, it can be directly placed
    // in the main module.
    if (
      (!script.lang || (script.lang === 'ts' && options.devServer)) &&
      !script.src
    ) {
      const classMatch = script.content.match(exportDefaultClassRE)
      if (classMatch) {
        scriptCode = `${script.content.replace(
          exportDefaultClassRE,
          `class $1`
        )}\nconst ${scriptVar} = ${classMatch[1]}`
      } else {
        scriptCode = compiler_sfc_1.rewriteDefault(script.content, scriptVar)
      }
      map = script.map
      if (script.lang === 'ts') {
        const result = await options.devServer.transformWithEsbuild(
          scriptCode,
          filename,
          { loader: 'ts' },
          map
        )
        scriptCode = result.code
        map = result.map
      }
    } else {
      if (script.src) {
        await linkSrcToDescriptor(
          script.src,
          filename,
          descriptor,
          pluginContext
        )
      }
      const src = script.src || filename
      const langFallback =
        (script.src && path_1.default.extname(src).slice(1)) || 'js'
      const attrsQuery = attrsToQuery(script.attrs, langFallback)
      const srcQuery = script.src ? `&src` : ``
      const query = `?vue&type=script${srcQuery}${attrsQuery}`
      const request = JSON.stringify(src + query)
      scriptCode =
        `import ${scriptVar} from ${request}\n` + `export * from ${request}` // support named exports
    }
  }
  return {
    scriptCode,
    map: map,
  }
}
async function genTemplateRequest(filename, descriptor, pluginContext) {
  const template = descriptor.template
  if (!template) {
    return { code: `let render, staticRenderFns` }
  }
  if (template.src) {
    await linkSrcToDescriptor(template.src, filename, descriptor, pluginContext)
  }
  const src = template.src || filename
  const srcQuery = template.src ? `&src` : ``
  const attrsQuery = attrsToQuery(template.attrs, 'js', true)
  const query = `?vue&type=template${srcQuery}${attrsQuery}`
  const templateRequest = src + query
  return {
    code: `import { render, staticRenderFns } from '${templateRequest}'`,
    templateRequest,
  }
}
function genCustomBlockCode(filename, descriptor) {
  let code = ''
  descriptor.customBlocks.forEach((block, index) => {
    // if (block.src) {
    //   linkSrcToDescriptor(block.src, descriptor)
    // }
    const src = filename
    const attrsQuery = attrsToQuery(block.attrs, block.type)
    // const srcQuery = block.src ? `&src` : ``
    const query = `?vue&type=${block.type}&index=${index}${attrsQuery}`
    const request = JSON.stringify(src + query)
    code += `import block${index} from ${request}\n`
    code += `if (typeof block${index} === 'function') block${index}(component)\n`
  })
  return code
}
function genHmrCode(root, id, functional, templateRequest) {
  return `\n/* hot reload */
import __VUE_HMR_RUNTIME__ from "${index_1.vueHotReload}"
import vue from "vue"
__VUE_HMR_RUNTIME__.install(vue)
if(__VUE_HMR_RUNTIME__.compatible){
  if (!__VUE_HMR_RUNTIME__.isRecorded('${id}')) {
    __VUE_HMR_RUNTIME__.createRecord('${id}', component.options)
  }
   import.meta.hot.accept((update) => {
      __VUE_HMR_RUNTIME__.${
        functional ? 'rerender' : 'reload'
      }('${id}', update.default)
   })
   ${
     templateRequest
       ? `import.meta.hot.accept('${normalizeDevPath(
           root,
           templateRequest
         )}', (update) => {
      __VUE_HMR_RUNTIME__.rerender('${id}', update)
   })`
       : ''
   }
} else {
  console.log("The hmr is not compatible.")
}`
}
async function genStyleRequest(
  cssModuleVar,
  descriptor,
  filename,
  pluginContext
) {
  let scoped = false
  let stylesCode = ''
  for (let i = 0; i < descriptor.styles.length; i++) {
    const style = descriptor.styles[i]
    if (style.src) {
      await linkSrcToDescriptor(style.src, filename, descriptor, pluginContext)
    }
    const src = style.src || filename
    const attrsQuery = attrsToQuery(style.attrs, 'css')
    const srcQuery = style.src ? `&src` : ``
    const query = `?vue&type=style&index=${i}${srcQuery}`
    const styleRequest = src + query + attrsQuery
    if (style.scoped) scoped = true
    if (style.module) {
      stylesCode += genCSSModulesCode(
        i,
        styleRequest,
        style.module,
        cssModuleVar
      )
    } else {
      stylesCode += `\nimport ${JSON.stringify(styleRequest)}`
    }
  }
  return { scoped, stylesCode }
}
function genCSSModulesCode(index, request, moduleName, cssModuleVar) {
  const styleVar = `__style${index}`
  const exposedName = typeof moduleName === 'string' ? moduleName : '$style'
  // inject `.module` before extension so vite handles it as css module
  const moduleRequest = request.replace(/\.(\w+)$/, '.module.$1')
  return (
    `\nimport ${styleVar} from ${JSON.stringify(moduleRequest)}` +
    `\n${cssModuleVar}["${exposedName}"] = ${styleVar}`
  )
}
/**
 * For blocks with src imports, it is important to link the imported file
 * with its owner SFC descriptor so that we can get the information about
 * the owner SFC when compiling that file in the transform phase.
 */
async function linkSrcToDescriptor(src, filename, descriptor, pluginContext) {
  var _a
  const srcFile =
    ((_a = await pluginContext.resolve(src, filename)) === null || _a === void 0
      ? void 0
      : _a.id) || src
  descriptorCache_1.setDescriptor(srcFile, descriptor)
}
// these are built-in query parameters so should be ignored
// if the user happen to add them as attrs
const ignoreList = ['id', 'index', 'src', 'type', 'lang', 'module']
function attrsToQuery(attrs, langFallback, forceLangFallback = false) {
  let query = ``
  for (const name in attrs) {
    const value = attrs[name]
    if (!ignoreList.includes(name)) {
      query += `&${querystring_1.default.escape(name)}${
        value ? `=${querystring_1.default.escape(String(value))}` : ``
      }`
    }
  }
  if (langFallback || attrs.lang) {
    query +=
      `lang` in attrs
        ? forceLangFallback
          ? `&lang.${langFallback}`
          : `&lang.${attrs.lang}`
        : `&lang.${langFallback}`
  }
  return query
}
exports.FS_PREFIX = `/@fs/`
function normalizeDevPath(root, id) {
  if (id.startsWith(root + '/')) {
    return id.slice(root.length)
  } else if (fs_1.default.existsSync(exports.cleanUrl(id))) {
    return exports.FS_PREFIX + id
  }
  return id
}
exports.queryRE = /\?.*$/
exports.hashRE = /#.*$/
const cleanUrl = (url) =>
  url.replace(exports.hashRE, '').replace(exports.queryRE, '')
exports.cleanUrl = cleanUrl
//# sourceMappingURL=main.js.map
