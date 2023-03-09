import { SourceEntity } from './source-entity';

export interface SourceLine {
    readonly objectName: string;
    readonly lineIndex: number;
    readonly entities: Array<SourceEntity>;
    // readonly fullText: string;
}