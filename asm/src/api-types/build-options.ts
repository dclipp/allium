import { ParseOptions } from '../parsing/parse-options';

export interface BuildOptions extends ParseOptions {
    readonly generateSourceMap: boolean;
}

export const DEFAULT_BUILD_OPTIONS: BuildOptions = {
    generateSourceMap: false,
    treatOversizedInlineValuesAsWarnings: false,
    oversizedInlineValueSizing: 'min-required',
    useMockForExternalAddresses: false,
    entryPoint: undefined,
    baseAddressOffset: undefined
}