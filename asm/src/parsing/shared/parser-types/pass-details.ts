import { QuadByte } from '@allium/types';
import { PassScope } from '../../passes/pass-scope';
import { InstructionReorderMap } from './instruction-reorder-map';
import { ObjectSymbol } from '../symbol/object-symbol';
import { BlockLocationMap } from './block-location/block-location-map';

export interface PassDetails {
    readonly scope: PassScope;
    readonly globalInstructionCount?: number;
    readonly symbols?: Array<{
        readonly objectName: string;
        readonly symbols: Array<ObjectSymbol>;
    }>;
    readonly objectBaseAddress?: QuadByte;
    readonly baseAddressOffset?: QuadByte;
    readonly instructionReorderMap?: InstructionReorderMap;
    readonly blockLocationMap?: BlockLocationMap;
}