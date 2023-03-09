import { RegexBuilder } from '../../../regex-builder/regex-builder';
import { RegexBuilderTemplate } from '../../../regex-builder/regex-builder-template';
import { ArgParser } from './arg-parser';
import { InstructionArgumentKind } from '../../../shared/kinds/instruction-argument-kind';
import { ASM_MESSAGES } from '../../../../messages/asm-messages';

export class RegisterArgParser extends ArgParser {
    private static readonly anyPrintableCharExceptDotOrBracket = RegexBuilder.customizeAnyPrintableTemplate(true, false, '.', ']', '[');

    public constructor() {
        super(InstructionArgumentKind.RegisterRef, [
            // Valid, no mask
            {
                certainty: 'strong',
                isValid: true,
                pattern: RegexBuilder.build(
                    '[',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegisterArgParser.anyPrintableCharExceptDotOrBracket,
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    ']')
            },

            // Valid, with mask
            {
                certainty: 'strong',
                isValid: true,
                pattern: RegexBuilder.build(
                    '[',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegisterArgParser.anyPrintableCharExceptDotOrBracket,
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    '.',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegisterArgParser.anyPrintableCharExceptDotOrBracket,
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    ']')
            },

            // Missing opening bracket
            {
                certainty: 'strong',
                message: ASM_MESSAGES.Parser.Stage2.UnopenedRegisterRef,
                isValid: false,
                pattern: RegexBuilder.build(
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegisterArgParser.anyPrintableCharExceptDotOrBracket,
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    ']')
            },

            // Missing closing bracket
            {
                certainty: 'strong',
                message: ASM_MESSAGES.Parser.Stage2.UnterminatedRegisterRef,
                isValid: false,
                pattern: RegexBuilder.build(
                    '[',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegisterArgParser.anyPrintableCharExceptDotOrBracket,
                    RegexBuilderTemplate.AnyLinearWhitespace)
            },

            // Missing opening bracket with mask
            {
                certainty: 'strong',
                message: ASM_MESSAGES.Parser.Stage2.UnopenedRegisterRef,
                isValid: false,
                pattern: RegexBuilder.build(
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegisterArgParser.anyPrintableCharExceptDotOrBracket,
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    '.',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegisterArgParser.anyPrintableCharExceptDotOrBracket,
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    ']')
            },

            // Missing closing bracket with mask
            {
                certainty: 'strong',
                message: ASM_MESSAGES.Parser.Stage2.UnterminatedRegisterRef,
                isValid: false,
                pattern: RegexBuilder.build(
                    '[',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegisterArgParser.anyPrintableCharExceptDotOrBracket,
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    '.',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegisterArgParser.anyPrintableCharExceptDotOrBracket,
                    RegexBuilderTemplate.AnyLinearWhitespace)
            },

            // Has dot but no mask
            {
                certainty: 'strong',
                message: ASM_MESSAGES.Parser.Stage2.InvalidRegisterRef,//todo more specific?
                isValid: false,
                pattern: RegexBuilder.build(
                    '[',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegisterArgParser.anyPrintableCharExceptDotOrBracket,
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    '.',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    ']')
            },

            // Has dot but no register name
            {
                certainty: 'strong',
                message: ASM_MESSAGES.Parser.Stage2.InvalidRegisterRef,//todo more specific?
                isValid: false,
                pattern: RegexBuilder.build(
                    '[',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    '.',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    RegisterArgParser.anyPrintableCharExceptDotOrBracket,
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    ']')
            },

            // Has dot but nothing else
            {
                certainty: 'strong',
                message: ASM_MESSAGES.Parser.Stage2.InvalidRegisterRef,//todo more specific?
                isValid: false,
                pattern: RegexBuilder.build(
                    '[',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    '.',
                    RegexBuilderTemplate.AnyLinearWhitespace,
                    ']')
            },
        ], {
            certainty: 'weak',
            pattern: RegisterArgParser._lastResortPattern,
            message: ASM_MESSAGES.Parser.Stage2.RegisterRefMissingBraces,
            isValid: false
        })
    }

    private static readonly _lastResortPattern = RegExp(/^[ \t]{0,}monday(([ \t]{0,}[.][ \t]{0,}hh[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}hl[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}hx[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}lh[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}ll[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}lx[ \t]{0,})){0,1}$|^[ \t]{0,}tuesday(([ \t]{0,}[.][ \t]{0,}hh[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}hl[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}hx[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}lh[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}ll[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}lx[ \t]{0,})){0,1}$|^[ \t]{0,}wednesday(([ \t]{0,}[.][ \t]{0,}hh[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}hl[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}hx[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}lh[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}ll[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}lx[ \t]{0,})){0,1}$|^[ \t]{0,}thursday(([ \t]{0,}[.][ \t]{0,}hh[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}hl[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}hx[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}lh[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}ll[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}lx[ \t]{0,})){0,1}$|^[ \t]{0,}friday(([ \t]{0,}[.][ \t]{0,}hh[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}hl[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}hx[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}lh[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}ll[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}lx[ \t]{0,})){0,1}$|^[ \t]{0,}instructionptr(([ \t]{0,}[.][ \t]{0,}hh[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}hl[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}hx[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}lh[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}ll[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}lx[ \t]{0,})){0,1}$|^[ \t]{0,}accumulator(([ \t]{0,}[.][ \t]{0,}hh[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}hl[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}hx[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}lh[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}ll[ \t]{0,})|([ \t]{0,}[.][ \t]{0,}lx[ \t]{0,})){0,1}$/i);
    // public static examineLine(line: string): ArgParseResult {

    // }

    // private static 
}