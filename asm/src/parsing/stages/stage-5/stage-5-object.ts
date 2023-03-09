import { S5Instruction } from './s5-instruction';

export interface Stage5Object {
    readonly instructions: Array<S5Instruction>;
    readonly byteCount: number;
}