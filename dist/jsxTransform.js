'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.transformVueJsx = void 0
const core_1 = require('@babel/core')
// todo hmr
function transformVueJsx(code, filename) {
  const result = core_1.transform(code, {
    presets: [require('@vue/babel-preset-jsx')],
    filename,
    sourceMaps: true,
  })
  return {
    code: result.code,
    map: result.map,
  }
}
exports.transformVueJsx = transformVueJsx
//# sourceMappingURL=jsxTransform.js.map
