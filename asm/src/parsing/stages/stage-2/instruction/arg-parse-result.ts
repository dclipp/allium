import { InstructionArgumentKind } from '../../../shared/kinds/instruction-argument-kind';
import { AsmMessage } from '../../../../messages/asm-message';

export interface ArgParseResult {
    readonly foundMatch: boolean;
    readonly isValid: boolean;
    readonly matchLength: number;
    readonly certainty: 'strong' | 'weak';
    readonly message: AsmMessage;
    readonly kind: InstructionArgumentKind;
}