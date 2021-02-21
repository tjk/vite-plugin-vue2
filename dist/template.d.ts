import { SFCBlock } from '@vue/component-compiler-utils'
import { TransformPluginContext } from 'rollup'
import { ResolvedOptions } from './index'
export declare function compileSFCTemplate(
  source: string,
  block: SFCBlock,
  filename: string,
  { root, isProduction, vueTemplateOptions, devServer }: ResolvedOptions,
  pluginContext: TransformPluginContext
): string
export declare function transformRequireToImport(code: string): string
