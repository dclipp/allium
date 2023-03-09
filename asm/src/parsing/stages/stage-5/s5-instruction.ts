import { Byte, QuadByte } from '@allium/types';
import { S5InstructionArg } from './s5-instruction-arg';

export interface S5Instruction {
    readonly address: QuadByte;
    readonly argCount: 0 | 1 | 2 | 3;
    readonly isFullyResolved: boolean;
    readonly mnemonicValue: Byte;
    readonly mnemonicTokenIndex: number;
    readonly argumentList: Array<S5InstructionArg>;
}