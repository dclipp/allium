import { SourceEntityKind } from './source-entity-kind';
import { ConstructDetails } from './construct-details';
import { ExtendedAsmMessage } from '../../messages/extended-asm-message';

export interface SourceEntity {
    readonly objectName: string;
    readonly id: string;
    readonly lineIndex: number;
    readonly startPosition: number;
    readonly endPosition: number;
    readonly kind: SourceEntityKind;
    readonly text: string;
    readonly constructDetails: ConstructDetails | 'none';
    readonly group?: string;
    // readonly referencesFromThis: Array<string>;
    readonly referencesToThis: Array<string>;
    readonly messages: Array<ExtendedAsmMessage>;
}