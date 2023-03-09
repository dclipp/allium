export interface BlockLocationBase {
    readonly lineIndexOfLabel: number;
    readonly lineIndexAfterLabel: number;
    readonly lastLineIndexInclusive: number;
    readonly nominalAddress: number;
}