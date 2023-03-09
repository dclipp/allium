import { Mnemonic } from '@allium/types';
import { S3InstructionUnit } from './s3-instruction-unit';

export interface S3Mnemonic extends S3InstructionUnit {
    readonly mnemonic: Mnemonic;
}