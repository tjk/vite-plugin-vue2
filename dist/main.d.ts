import { ResolvedOptions } from './index'
import { TransformPluginContext } from 'rollup'
export declare function transformMain(
  code: string,
  filePath: string,
  options: ResolvedOptions,
  pluginContext: TransformPluginContext
): Promise<string>
export declare const FS_PREFIX = '/@fs/'
export declare const queryRE: RegExp
export declare const hashRE: RegExp
export declare const cleanUrl: (url: string) => string
