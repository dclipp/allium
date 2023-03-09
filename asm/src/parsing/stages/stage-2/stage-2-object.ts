import { S2Line } from './s2-line';
import { S2InstructionLine } from './instruction/s2-instruction-line';
import { S2DirectiveLine } from './directive/s2-directive-line';

export interface Stage2Object {
    readonly labelLines: Array<S2Line>;
    readonly instructionLines: Array<S2InstructionLine>;
    readonly directiveLines: Array<S2DirectiveLine>;
    readonly commentLines: Array<S2Line>;
    readonly blankLines: Array<S2Line>;
}