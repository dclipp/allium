import { BlockLocationBase } from './block-location-base';
import { EmbeddedBlockLocation } from './embedded-block-location';

export interface FirstClassBlockLocation extends BlockLocationBase {
    readonly normalizedName: string;
    readonly embeddedBlocks: Array<EmbeddedBlockLocation>;
}