import { S3InstructionArg } from './s3-instruction-arg';

export interface S3InlineValueArg extends S3InstructionArg {
    readonly numericValue: number;
}