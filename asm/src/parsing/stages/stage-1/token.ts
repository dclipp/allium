export interface Token {
    readonly index: number;
    readonly startPosition: number;
    readonly endPosition: number;
    readonly length: number;
    readonly text: string;
}