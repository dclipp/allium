import { AssemblyEntryPoint } from '../api-types/assembly-entry-point';

export interface ParseOptions {
    readonly treatOversizedInlineValuesAsWarnings: boolean;
    readonly oversizedInlineValueSizing: 'quad' | 'tri' | 'double' | 'min-required';
    readonly useMockForExternalAddresses: boolean;
    readonly entryPoint?: AssemblyEntryPoint;
    readonly baseAddressOffset?: number;
}

export const DEFAULT_PARSE_OPTIONS: ParseOptions = {
    treatOversizedInlineValuesAsWarnings: false,
    oversizedInlineValueSizing: 'min-required',
    useMockForExternalAddresses: false,
    entryPoint: undefined,
    baseAddressOffset: undefined
}