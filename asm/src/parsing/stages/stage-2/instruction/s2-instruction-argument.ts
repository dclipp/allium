import { InstructionArgumentKind } from '../../../shared/kinds/instruction-argument-kind';

export interface S2InstructionArgument {
    readonly tokenIndices: Array<number>;
    readonly lineIndex: number;
    readonly assumedArgKind: InstructionArgumentKind;
}