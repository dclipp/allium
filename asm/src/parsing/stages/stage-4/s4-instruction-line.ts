import { S4Line } from './s4-line';
import { S4AutoAddressRef } from './s4-auto-address-ref';

export interface S4InstructionLine extends S4Line {
    readonly blockLabelName: string;
    readonly autoAddressRefs: Array<S4AutoAddressRef>;
}