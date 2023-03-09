import { InstructionArgumentKind } from '../../shared/kinds/instruction-argument-kind';
import { S3InstructionArg } from '../stage-3/instruction/s3-instruction-arg';

export interface S4ResolvedAlias {
    readonly tokenIndices: Array<number>;
    readonly argKind: InstructionArgumentKind;
    readonly arg: S3InstructionArg;
}