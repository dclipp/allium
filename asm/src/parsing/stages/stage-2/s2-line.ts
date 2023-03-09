import { S2LineKind } from './s2-line-kind';

export interface S2Line {
    readonly tokenIndices: Array<number>;
    readonly lineIndex: number;
    readonly kind: S2LineKind;
}