import { ObjectSymbolKind } from './object-symbol-kind';
import { DynamicByteSequence } from '@allium/types';

export interface ObjectSymbol {
    readonly kind: ObjectSymbolKind;
    readonly name: string;
    readonly value: DynamicByteSequence | 'deferred';
    //readonly value: { readonly sequence: DynamicByteSequence, readonly isFixedLength: boolean } | 'deferred';
}