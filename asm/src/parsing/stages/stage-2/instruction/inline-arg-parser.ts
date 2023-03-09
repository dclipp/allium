import { RegexBuilder } from '../../../regex-builder/regex-builder';
import { RegexBuilderTemplate } from '../../../regex-builder/regex-builder-template';
import { ArgParser } from './arg-parser';
import { InstructionArgumentKind } from '../../../shared/kinds/instruction-argument-kind';
import { ASM_MESSAGES } from '../../../../messages/asm-messages';

export class InlineArgParser extends ArgParser {
    public constructor() {
        super(InstructionArgumentKind.InlineValue, [
            // Valid, base 10
            {
                certainty: 'strong',
                isValid: true,
                pattern: RegexBuilder.build(RegexBuilderTemplate.OneOrMoreBase10Numbers)
            },

            // Valid, hex
            {
                certainty: 'strong',
                isValid: true,
                pattern: RegexBuilder.build(RegexBuilderTemplate.OneOrMoreHexNumbers)
            },
            
            // Missing hex prefix
            {
                certainty: 'strong',
                message: ASM_MESSAGES.Parser.Stage2.InlineValueMissingHexPrefix,
                isValid: false,
                pattern: RegExp(/^[0-9a-fA-F]+$/)
            }
        ])
    }
}