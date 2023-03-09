import { SourceElementMeaning } from './source-element-meaning';
import { MachineDataType } from './machine-data-type';
import { ByteSequenceLength } from '@allium/types';

export interface SourceElement {
    readonly meaning: SourceElementMeaning;
    readonly machineDataType: MachineDataType;
    readonly byteLength: 0 | 'less-than-1' | ByteSequenceLength;
    readonly numericValue: number | 'none';
}