import { RegexBuilder } from '../../../regex-builder/regex-builder';
import { RegexBuilderTemplate } from '../../../regex-builder/regex-builder-template';
import { ArgParser } from './arg-parser';
import { InstructionArgumentKind } from '../../../shared/kinds/instruction-argument-kind';
import { ASM_MESSAGES } from '../../../../messages/asm-messages';

export class ConstantInjectorArgParser extends ArgParser {
    private static readonly injectorValueTemplate = RegexBuilder.customizeAnyPrintableTemplate(true, false, '.', ']', '[');
    private static readonly injectorValueFloatNumberTemplate = '[0-9]+\\.[0-9]{0,}';

    public constructor() {
        super(InstructionArgumentKind.ConstantInjector, [
            // Valid, no value
            {
                certainty: 'strong',
                isValid: true,
                pattern: RegexBuilder.build(
                    '@',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegexBuilderTemplate.OneOrMoreAlphaCharacters)
            },

            // Valid, with value
            {
                certainty: 'strong',
                isValid: true,
                pattern: RegexBuilder.build(
                    '@',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegexBuilderTemplate.OneOrMoreAlphaCharacters,
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    '=',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    ConstantInjectorArgParser.injectorValueTemplate
                    )
            },

            // Valid, floating point number value
            {
                certainty: 'strong',
                isValid: true,
                pattern: RegexBuilder.build(
                    '@',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegexBuilderTemplate.OneOrMoreAlphaCharacters,
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    '=',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    { custom: ConstantInjectorArgParser.injectorValueFloatNumberTemplate }
                    )
            },

            // Missing value
            {
                certainty: 'strong',
                message: ASM_MESSAGES.Parser.Stage2.ConstantInjectorMissingValue,
                isValid: false,
                pattern: RegexBuilder.build(
                    '@',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegexBuilderTemplate.OneOrMoreAlphaCharacters,
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    '=')
            },

            // Missing key
            {
                certainty: 'strong',
                message: ASM_MESSAGES.Parser.Stage2.ConstantInjectorMissingKey,
                isValid: false,
                pattern: RegexBuilder.build(
                    '@',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    '=',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    ConstantInjectorArgParser.injectorValueTemplate
                    )
            },
        ], {
            certainty: 'weak',
            message: ASM_MESSAGES.Parser.Stage2.InvalidConstantInjector,
            isValid: false,
            pattern: RegexBuilder.build(
                '@',
                RegexBuilderTemplate.AnyLinearWhitespace,
                RegexBuilderTemplate.AnyPrintableCharacter)
        })
    }
}