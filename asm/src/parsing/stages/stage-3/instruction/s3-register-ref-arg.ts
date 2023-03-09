import { S3InstructionArg } from './s3-instruction-arg';
import { Register, RegisterMask } from '@allium/types';

export interface S3RegisterRefArg extends S3InstructionArg {
    readonly register: Register;
    readonly hasMask: boolean;
    readonly mask?: RegisterMask;
    // readonly ordinalMask?:TODO
}