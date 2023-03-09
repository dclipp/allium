import { S3InstructionUnit } from './s3-instruction-unit';
import { InstructionArgumentKind } from '../../../shared/kinds/instruction-argument-kind';

export interface S3InstructionArg extends S3InstructionUnit {
    readonly determinedKind: InstructionArgumentKind;
}