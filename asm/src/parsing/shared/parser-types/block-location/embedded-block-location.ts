import { BlockLocationBase } from './block-location-base';

export interface LabeledEmbeddedBlockLocation extends BlockLocationBase {
    readonly normalizedName: string;
    readonly isLabeled: 'labeled';
}

export interface UnlabeledEmbeddedBlockLocation extends BlockLocationBase {
    readonly isLabeled: '';
}

export type EmbeddedBlockLocation = (LabeledEmbeddedBlockLocation | UnlabeledEmbeddedBlockLocation) & {
    readonly isEmbedded: true;
};