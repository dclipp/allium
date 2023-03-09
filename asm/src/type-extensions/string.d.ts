declare interface String {
    // preceedingIndexOf(searchString: string, position?: number): number;
    // preceedingIndexOfNot(notString: string, position?: number): number;
    // indexOfNot(notString: string, position?: number): number;
    indexOfNonWhitespace(position?: number): number;
    nthIndexOf(n: number, searchString: string, position?: number): number;
}