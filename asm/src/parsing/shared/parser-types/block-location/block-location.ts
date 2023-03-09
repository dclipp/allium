import { BlockLocationBase } from './block-location-base';
import { EmbeddedBlockLocation } from './embedded-block-location';

export type BlockLocation = BlockLocationBase | EmbeddedBlockLocation;