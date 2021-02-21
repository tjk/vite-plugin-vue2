import { TemplateCompileOptions } from '@vue/component-compiler-utils/lib/compileTemplate'
import { ViteDevServer, Plugin } from 'vite'
export declare const vueComponentNormalizer = '\0/vite/vueComponentNormalizer'
export declare const vueHotReload = '\0/vite/vueHotReload'
declare module '@vue/component-compiler-utils' {
  interface SFCDescriptor {
    id: string
  }
}
export interface VueViteOptions {
  include?: string | RegExp | (string | RegExp)[]
  exclude?: string | RegExp | (string | RegExp)[]
  /**
   * The options for `@vue/component-compiler-utils`.
   */
  vueTemplateOptions?: Partial<TemplateCompileOptions>
  /**
   * The options for jsx transform
   * @default false
   */
  jsx?: boolean
}
export interface ResolvedOptions extends VueViteOptions {
  root: string
  devServer?: ViteDevServer
  isProduction: boolean
}
export declare function createVuePlugin(rawOptions?: VueViteOptions): Plugin
