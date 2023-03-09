import { S4Line } from './s4-line';
import { QuadByte } from '@allium/types';

export interface S4LabelLine extends S4Line {
    readonly blockAddress: QuadByte;
}