import { DynamicByteSequence, ByteSequenceLength } from '@allium/types';

export interface S5InstructionArg {
    readonly argNumber: ByteSequenceLength;
    readonly isResolved: boolean;
    readonly numericValue?: DynamicByteSequence;
    readonly tokenIndices: Array<number>;
}