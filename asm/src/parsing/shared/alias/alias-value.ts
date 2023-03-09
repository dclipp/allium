import { DynamicByteSequence } from '@allium/types';

// export type AliasValue = {
//     readonly sequence: DynamicByteSequence;
//     readonly isFixedLength: boolean;
// } | 'error' | 'deferred' | { readonly dependsOn: string }
export type AliasValue = DynamicByteSequence | 'error' | 'deferred' | { readonly dependsOn: string }