import { S2Line } from '../s2-line';
import { S2InstructionArgument } from './s2-instruction-argument';

export interface S2InstructionLine extends S2Line {
    readonly mnemonicTokenIndex: number;
    readonly argumentList: Array<S2InstructionArgument>;
}