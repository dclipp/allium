import { S4LabelLine } from './s4-label-line';
import { S4InstructionLine } from './s4-instruction-line';

export interface Stage4Object {
    readonly labelLines: Array<S4LabelLine>;
    readonly instructionLines: Array<S4InstructionLine>;
}