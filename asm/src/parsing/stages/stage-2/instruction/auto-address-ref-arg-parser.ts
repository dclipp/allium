import { RegexBuilder } from '../../../regex-builder/regex-builder';
import { RegexBuilderTemplate } from '../../../regex-builder/regex-builder-template';
import { ArgParser } from './arg-parser';
import { InstructionArgumentKind } from '../../../shared/kinds/instruction-argument-kind';
import { ASM_MESSAGES } from '../../../../messages/asm-messages';

export class AutoAddressRefArgParser extends ArgParser {

    public constructor() {
        super(InstructionArgumentKind.AutoAddressRef, [
            // Valid, block, local label
            {
                certainty: 'strong',
                isValid: true,
                pattern: RegexBuilder.build(
                    '$',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegexBuilderTemplate.LabelFormat)
            },

            // Valid, block, external label
            {
                certainty: 'strong',
                isValid: true,
                pattern: RegexBuilder.build(
                    '$',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegexBuilderTemplate.LabelFormat,
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    ':',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegexBuilderTemplate.LabelFormat)
            },

            // Valid, relative
            {
                certainty: 'strong',
                isValid: true,
                pattern: RegexBuilder.build(
                    '$',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    '(',
                    RegexBuilder.customizeAnyPrintableTemplate(false, true, ')'),
                    ')')
            },

            // Missing label
            {
                certainty: 'strong',
                message: ASM_MESSAGES.Parser.Stage2.AutoAddressRefMissingLabel,
                isValid: false,
                pattern: RegexBuilder.build('$', RegexBuilderTemplate.AnyLinearWhitespace)
            },

            // Missing external target
            {
                certainty: 'strong',
                message: ASM_MESSAGES.Parser.Stage2.AutoAddressRefMissingExternalTarget,
                isValid: false,
                pattern: RegexBuilder.build(
                    '$',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegexBuilderTemplate.LabelFormat,
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    ':')
            }
        ])
    }
}