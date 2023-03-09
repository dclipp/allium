import { LanguageConstructKind } from './language-construct-kind';
import { NativeDataType } from './native-data-type';
import { ByteSequenceLength } from '@allium/types';

export interface ConstructDetails {
    readonly kind: LanguageConstructKind;
    readonly dataType: NativeDataType;
    readonly nativeByteLength: ByteSequenceLength | 'none';
    readonly numericValue: number | 'none';
}