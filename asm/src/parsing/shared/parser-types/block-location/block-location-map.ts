import { EmbeddedBlockLocation } from './embedded-block-location';
import { FirstClassBlockLocation } from './first-class-block-location';

export interface BlockLocationMap {
    firstClassBlocks(): ReadonlyArray<FirstClassBlockLocation>;
    getEmbeddedBlock(embeddedBlockName: string, fromLineIndex: number): EmbeddedBlockLocation | null;
    getUnlabeledEmbeddedBlock(fromLineIndex: number): EmbeddedBlockLocation | null;
    getFirstClassBlockContainingLine(fromLineIndex: number): FirstClassBlockLocation | null;
}