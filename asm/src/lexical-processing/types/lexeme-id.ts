export const LexemeId: {
    generate: (fileIndex: number, lineIndex: number, startPosition: number, endPosition: number) => string;
} = {
    generate: (fileIndex: number, lineIndex: number, startPosition: number, endPosition: number) => {
        return `${fileIndex},${lineIndex}.${startPosition}:${endPosition}`;
    }
}