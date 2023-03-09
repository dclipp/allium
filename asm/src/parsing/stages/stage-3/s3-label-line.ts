import { S3Line } from './s3-line';

export interface S3LabelLine extends S3Line {
    readonly nameTokenIndex: number;
    readonly normalizedName: string;
    readonly isEmbedded: boolean;
}