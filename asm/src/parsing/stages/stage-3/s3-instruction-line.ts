import { S3Line } from './s3-line';
import { S3Mnemonic } from './instruction/s3-mnemonic';
import { S3InstructionArg } from './instruction/s3-instruction-arg';

export interface S3InstructionLine extends S3Line {
    readonly mnemonic: S3Mnemonic;
    readonly argumentList: Array<S3InstructionArg>;
}