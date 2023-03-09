export interface InstructionReorderMap {
    findByOriginalIndex(originalIndex: number): {
        readonly originalIndex: number;
        readonly reorderedIndex: number;
        readonly originalObjectName: string;
        readonly lineIndexWithinObject: number;
    } | undefined;
    findByReorderedIndex(reorderedIndex: number): {
        readonly originalIndex: number;
        readonly reorderedIndex: number;
        readonly originalObjectName: string;
        readonly lineIndexWithinObject: number;
    } | undefined;
    findByLineIndex(lineIndexWithinObject: number, originalObjectName: string): {
        readonly originalIndex: number;
        readonly reorderedIndex: number;
        readonly originalObjectName: string;
        readonly lineIndexWithinObject: number;
    } | undefined;
};