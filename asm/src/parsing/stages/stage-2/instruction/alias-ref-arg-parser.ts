import { RegexBuilder } from '../../../regex-builder/regex-builder';
import { RegexBuilderTemplate } from '../../../regex-builder/regex-builder-template';
import { ArgParser } from './arg-parser';
import { InstructionArgumentKind } from '../../../shared/kinds/instruction-argument-kind';
import { ASM_MESSAGES } from '../../../../messages/asm-messages';

export class AliasRefArgParser extends ArgParser {
    public constructor() {
        super(InstructionArgumentKind.AliasRef, [
            // Valid
            {
                certainty: 'strong',
                isValid: true,
                pattern: RegexBuilder.build(
                    '#',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegexBuilderTemplate.LabelFormat)
            },

            // Missing name
            {
                certainty: 'strong',
                message: ASM_MESSAGES.Parser.Stage2.ConstantInjectorMissingValue,//cTODO
                isValid: false,
                pattern: RegexBuilder.build(
                    '#',
                    RegexBuilderTemplate.AnyLinearWhitespace)
            }
        ])
    }
}