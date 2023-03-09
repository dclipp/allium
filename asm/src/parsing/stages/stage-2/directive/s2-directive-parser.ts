import { RegexBuilder } from '../../../regex-builder/regex-builder';
import { RegexBuilderTemplate } from '../../../regex-builder/regex-builder-template';
import { Token } from '../../stage-1/token';
import { S2DirectiveParameter } from './s2-directive-parameter';
import { S2Line } from '../s2-line';
import { S2DirectiveLine } from './s2-directive-line';
import { S2LineKind } from '../s2-line-kind';
import { S2Directive } from './s2-directive';
import { AsmMessage } from '../../../../messages/asm-message';
import { AsmMessageHelper } from '../../../../messages/asm-message-helper';
import { ASM_MESSAGES } from '../../../../messages/asm-messages';

export interface DirectiveParseResult {
    messages: Array<AsmMessage>;
    line: S2DirectiveLine;
}

export class S2DirectiveParser {
    
    public static parseDirectiveLine(line: S2Line, allTokens: Array<Token>): DirectiveParseResult {
        // const tokenIndices = new Array<number>();
        // let directiveCommandTokenIndices = new Array<number>();
        // let directiveParameterTokenIndices = new Array<number>();
        // let hasParameter = false;

        // const messages = new Array<AsmMessage>();
        const directiveStartTokenIndex = line.tokenIndices[0];
        const lastTokenIndexInLine = line.tokenIndices.last();
        const normalizedLine = allTokens
            .filter(t => t.index >= directiveStartTokenIndex && t.index <= lastTokenIndexInLine)
            .reduce((x, y) => !!x ? `${x} ${y.text}` : y.text, '');

        const allTokensInLine = allTokens.filter(t => t.index >= directiveStartTokenIndex && t.index <= lastTokenIndexInLine);
        const result = S2DirectiveParser.parseDirective(allTokensInLine, directiveStartTokenIndex, normalizedLine);
        // if (result.messages.length > 0) {
        //     result.messages.forEach(m => messages.push(m));
        // }
        if (result.foundMatch) {
            return {
                messages: result.messages,
                line: {
                    tokenIndices: result.tokenIndices,
                    lineIndex: line.lineIndex,
                    directiveIndex: 0,//TODO,
                    kind: S2LineKind.Directive,
                    directive: result.directive
                }
            }
        } else {
            return {
                messages: [AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.Directives.InvalidDirective, {
                    startPosition: allTokens[directiveStartTokenIndex].startPosition,
                    endPosition: allTokens[lastTokenIndexInLine].endPosition })],
                line: {
                    tokenIndices: result.tokenIndices,
                    lineIndex: line.lineIndex,
                    directiveIndex: 0,//TODO,
                    kind: S2LineKind.Directive,
                    directive: null
                }
            }
        }

        // const commandResult = StructuralViewDirectiveParser.parseCommand(allTokensInLine, directiveStartTokenIndex, normalizedLine);
        // if (!!commandResult.messages && commandResult.messages.length > 0) {
        //     commandResult.messages.forEach(m => messages.push(m));
        // }

        // if (commandResult.foundMatch) {
        //     commandResult.command.tokenIndices.forEach(t => tokenIndices.push(t));
        //     directiveCommandTokenIndices = commandResult.command.tokenIndices;
        //     const paramResult = StructuralViewDirectiveParser.parseParameter(allTokensInLine, directiveStartTokenIndex, normalizedLine);

        //     if (paramResult.foundMatch) {
        //         if (!!paramResult.messages && paramResult.messages.length > 0) {
        //             paramResult.messages.forEach(m => messages.push(m));
        //         }
        //         hasParameter = paramResult.hasParameter === true;
        //         if (hasParameter) {
        //             paramResult.parameter.tokenIndices.forEach(t => tokenIndices.push(t));
        //             directiveParameterTokenIndices = paramResult.parameter.tokenIndices;
        //         }
        //     } else {
        //         messages.push(AsmMessageHelper.generateMessage(PARSER_MESSAGES.StructuralView.Directives.InvalidDirective, {
        //             startPosition: allTokens[directiveStartTokenIndex].startPosition,
        //             endPosition: allTokens[lastTokenIndexInLine].endPosition }));
        //     }
        // } else {
        //     messages.push(AsmMessageHelper.generateMessage(PARSER_MESSAGES.StructuralView.Directives.InvalidDirective, {
        //         startPosition: allTokens[directiveStartTokenIndex].startPosition,
        //         endPosition: allTokens[lastTokenIndexInLine].endPosition }));
        // }

        // return {
        //     messages: messages,
        //     line: {
        //         directiveCommandTokenIndices: directiveCommandTokenIndices,
        //         directiveParameterTokenIndices: directiveParameterTokenIndices,
        //         hasParameter: hasParameter,
        //         tokenIndices: tokenIndices,
        //         lineIndex: line.lineIndex,
        //         directiveIndex: 0,//TODO,
        //         kind: StructuralViewLineKind.Directive
        //     }
        // }

        // return {
        //     directiveCommandTokenIndices: commandResult.command.tokenIndices,
        //     directiveParameterTokenIndices: Array<number>,
        //     hasParameter: boolean,
        //     messages: Array<AsmMessage>,
        //     tokenIndices: Array<number>,
        //     lineIndex: number,
        // }
    }

    private static parseDirective(allTokensInLine: Array<Token>, directiveStartTokenIndex: number, normalizedLine: string)
    : { foundMatch: boolean, tokenIndices: Array<number>, directive?: S2Directive, messages: Array<AsmMessage> } {
        const parameterizedResult = S2DirectiveParser.tryParseParameterizedDirective(allTokensInLine, directiveStartTokenIndex, normalizedLine);
        if (parameterizedResult === 'not-found') {
            const parameterlessResult = S2DirectiveParser.tryParseParameterlessDirective(allTokensInLine, directiveStartTokenIndex, normalizedLine);
            if (parameterlessResult === 'not-found') {
                return {
                    foundMatch: false,
                    messages: [],
                    tokenIndices: []
                }
            } else {
                return {
                    foundMatch: true,
                    directive: parameterlessResult.directive,
                    messages: parameterlessResult.messages,
                    tokenIndices: parameterlessResult.tokenIndices
                }
            }
        } else {
            return {
                foundMatch: true,
                directive: parameterizedResult.directive,
                messages: parameterizedResult.messages,
                tokenIndices: parameterizedResult.tokenIndices
            }
        }
    }
    // private static parseDirective(allTokensInLine: Array<Token>, directiveStartTokenIndex: number, normalizedLine: string)
    // : { foundMatch: boolean, tokenIndices: Array<number>, directive?: StructuralViewDirective, messages: Array<AsmMessage> } {
    //     const parameterlessResult = StructuralViewDirectiveParser.tryParseParameterlessDirective(allTokensInLine, directiveStartTokenIndex, normalizedLine);
    //     if (parameterlessResult === 'not-found') {
    //         const parameterizedResult = StructuralViewDirectiveParser.tryParseParameterizedDirective(allTokensInLine, directiveStartTokenIndex, normalizedLine);
    //         if (parameterizedResult === 'not-found') {
    //             return {
    //                 foundMatch: false,
    //                 messages: [],
    //                 tokenIndices: []
    //             }
    //         } else {
    //             return {
    //                 foundMatch: true,
    //                 directive: parameterizedResult.directive,
    //                 messages: parameterizedResult.messages,
    //                 tokenIndices: parameterizedResult.tokenIndices
    //             }
    //         }
    //     } else {
    //         return {
    //             foundMatch: true,
    //             directive: parameterlessResult.directive,
    //             messages: parameterlessResult.messages,
    //             tokenIndices: parameterlessResult.tokenIndices
    //         }
    //     }
    //     // const patterns = [
    //     //     // valid, no param
    //     //     RegexBuilder.build(
    //     //     '?',
    //     //     RegexBuilderTemplate.AnyLinearWhitespace,
    //     //     RegexBuilderTemplate.OneOrMoreAlphaCharacters,
    //     //     RegexBuilderTemplate.OneOrMoreLinearWhitespace,
    //     //     RegexBuilderTemplate.LabelFormat
    //     // ),

    //     // // valid, with param
    //     // RegexBuilder.build(
    //     //     '?',
    //     //     RegexBuilderTemplate.AnyLinearWhitespace,
    //     //     RegexBuilderTemplate.OneOrMoreAlphaCharacters,
    //     //     RegexBuilderTemplate.OneOrMoreLinearWhitespace,
    //     //     RegexBuilderTemplate.LabelFormat,
    //     //     RegexBuilderTemplate.AnyLinearWhitespace,
    //     //     '=',
    //     //     RegexBuilderTemplate.AnyLinearWhitespace,
    //     //     RegexBuilderTemplate.AnyPrintableCharacter
    //     // )];

    //     // let result: { foundMatch: boolean, command?: StructuralViewDirectiveCommand, messages?: Array<AsmMessage> } = {
    //     //     foundMatch: false
    //     // };

    //     // let patternIndex = 0;
    //     // let matchLength = -1;
    //     // while (patternIndex < patterns.length && matchLength < 0) {
    //     //     matchLength = StructuralViewDirectiveParser.findPatternMatchLength(normalizedLine, patterns[patternIndex]);

    //     //     if (matchLength > -1) {
    //     //         const matchText = normalizedLine.substring(0, matchLength);
    //     //         result = {
    //     //             foundMatch: true,
    //     //             command: {
    //     //                 tokenIndices: StructuralViewDirectiveParser.mapNormalizedSubstringToTokenIndices(allTokensInLine, directiveStartTokenIndex, matchText),
    //     //                 normalizedCommandName: matchText.replace('?', '').trim().toUpperCase()
    //     //             }
    //     //         }
    //     //     }

    //     //     patternIndex++;
    //     // }

    //     // return result;
    // }

    private static tryParseParameterlessDirective(allTokensInLine: Array<Token>, directiveStartTokenIndex: number, normalizedLine: string)
    : { directive?: S2Directive, messages: Array<AsmMessage>, tokenIndices: Array<number> } | 'not-found' {
        const pattern = RegexBuilder.build(
            '?',
            RegexBuilderTemplate.AnyLinearWhitespace,
            RegexBuilderTemplate.OneOrMoreAlphaCharacters,
            RegexBuilderTemplate.OneOrMoreLinearWhitespace,
            RegexBuilderTemplate.LabelFormat,
            RegexBuilderTemplate.AnyLinearWhitespace
        );

        const matchLength = S2DirectiveParser.findPatternMatchLength(normalizedLine, pattern);
        if (matchLength > -1) {
            const matchText = normalizedLine.substring(0, matchLength);
            const commandName = matchText.substring(0, matchText.indexOf(' ')).replace('?', '').trim();
            const receiverStartIndex = matchText.indexOf(commandName) + commandName.length;
            const receiverName = matchText.substring(receiverStartIndex).trim();

            const commandTokenIndices = S2DirectiveParser.calculateTokenIndicesForSubsegment(allTokensInLine, matchText.substring(0, receiverStartIndex).trim());
            const receiverTokenIndices = S2DirectiveParser.calculateTokenIndicesForSubsegment(allTokensInLine, matchText.substring(receiverStartIndex).trim());
            const tokenIndices = new Array<number>();

            const receiverTokenIndicesOnly = receiverTokenIndices;

            commandTokenIndices.concat(receiverTokenIndicesOnly).forEach(i => {
                if (!tokenIndices.includes(i)) {
                    tokenIndices.push(i);
                }
            })

            return {
                directive: {
                    normalizedCommandName: commandName.toLowerCase(),
                    normalizedReceiverName: receiverName,
                    hasParameter: false,
                    normalizedParameter: '',
                    commandTokenIndices: commandTokenIndices,
                    receiverTokenIndices: receiverTokenIndicesOnly,
                    parameterTokenIndices: []
                },
                messages: [],
                tokenIndices: tokenIndices
            }
        } else {
            return 'not-found';
        }
    }

    private static tryParseParameterizedDirective(allTokensInLine: Array<Token>, directiveStartTokenIndex: number, normalizedLine: string)
    : { directive?: S2Directive, messages: Array<AsmMessage>, tokenIndices: Array<number> } | 'not-found' {
        const pattern = RegexBuilder.build(
            '?',
            RegexBuilderTemplate.AnyLinearWhitespace,
            RegexBuilderTemplate.OneOrMoreAlphaCharacters,
            RegexBuilderTemplate.OneOrMoreLinearWhitespace,
            RegexBuilderTemplate.LabelFormat,
            RegexBuilderTemplate.AnyLinearWhitespace,
            '=',
            RegexBuilderTemplate.AnyLinearWhitespace,
            RegexBuilderTemplate.AnyPrintableCharacter
        );

        const matchLength = S2DirectiveParser.findPatternMatchLength(normalizedLine, pattern);
        if (matchLength > -1) {
            const matchText = normalizedLine.substring(0, matchLength);
            const commandName = matchText.substring(0, matchText.indexOf(' ')).replace('?', '').trim();
            const receiverStartIndex = matchText.indexOf(commandName) + commandName.length;
            const equalsSignIndex = matchText.indexOf('=');
            const receiverName = matchText.substring(receiverStartIndex, equalsSignIndex).trim();
            const parameterValue = matchText.substring(equalsSignIndex + 1).trim();

            const commandTokenIndices = S2DirectiveParser.calculateTokenIndicesForSubsegment(allTokensInLine, matchText.substring(0, receiverStartIndex).trim());
            const receiverTokenIndices = S2DirectiveParser.calculateTokenIndicesForSubsegment(allTokensInLine, matchText.substring(receiverStartIndex, equalsSignIndex).trim());
            const parameterTokenIndices = S2DirectiveParser.calculateTokenIndicesForSubsegment(allTokensInLine, matchText.substring(equalsSignIndex).trim());
            const tokenIndices = new Array<number>();

            const equalsToken = allTokensInLine.find(t => t.text.startsWith('='));
            const receiverTokenIndicesOnly = !!equalsToken ? receiverTokenIndices.filter(i => i <= equalsToken.index) : receiverTokenIndices;

            const parameterTokenIndicesOnly = !!equalsToken ? (equalsToken.text === '='
                ? parameterTokenIndices.filter(i => i > equalsToken.index) // token is NOT shared with parameter
                : parameterTokenIndices.filter(i => i >= equalsToken.index)) // token IS shared with parameter
                : parameterTokenIndices // (no parameter);

            commandTokenIndices.concat(receiverTokenIndicesOnly.concat(parameterTokenIndicesOnly)).forEach(i => {
                if (!tokenIndices.includes(i)) {
                    tokenIndices.push(i);
                }
            })

            return {
                directive: {
                    normalizedCommandName: commandName.toLowerCase(),
                    normalizedReceiverName: receiverName,
                    hasParameter: true,
                    normalizedParameter: parameterValue,
                    commandTokenIndices: commandTokenIndices,
                    receiverTokenIndices: receiverTokenIndicesOnly,
                    parameterTokenIndices: parameterTokenIndicesOnly,
                },
                messages: [],
                tokenIndices: tokenIndices
            }
        } else {
            return 'not-found';
        }
    }

    private static parseParameter(allTokens: Array<Token>, directiveStartTokenIndex: number, normalizedLine: string): { foundMatch: boolean, hasParameter?: boolean, parameter?: S2DirectiveParameter, messages?: Array<AsmMessage> } {
        const pattern = RegexBuilder.build(
            '?',
            RegexBuilderTemplate.AnyLinearWhitespace,
            RegexBuilderTemplate.OneOrMoreAlphaCharacters,
            RegexBuilderTemplate.OneOrMoreLinearWhitespace
        );

        const matchLength = S2DirectiveParser.findPatternMatchLength(normalizedLine, pattern);

        if (matchLength > -1) {
            const matchText = normalizedLine.substring(0, matchLength);
            return {
                foundMatch: true,
                // command: {
                //     tokenIndices: StructuralViewDirectiveParser.mapNormalizedSubstringToTokenIndices(allTokens, directiveStartTokenIndex, matchText),
                //     normalizedCommandName: matchText.replace('?', '').trim().toUpperCase()
                // }
            }
        } else {
            return {
                foundMatch: false
            }
        }
    }

    private static findPatternMatchLength(normalizedLine: string, pattern: RegExp): number {
        let matchLength = -1;

        for (let i = normalizedLine.length - 1; i > -1 && matchLength === -1; i--) {
            const subsection = i === normalizedLine.length - 1
                ? normalizedLine
                : i === 0
                ? ''
                : normalizedLine.substring(0, i);
            const isFullToken = i === normalizedLine.length - 1 || i === 0 || normalizedLine.charAt(i + 1) === ' ';
            const isPatternMatch = RegExp(pattern).test(subsection);
            let isMatch = isPatternMatch && isFullToken;
            if (isPatternMatch && !isFullToken && i < normalizedLine.length - 1 && normalizedLine.charAt(i) === ' ' && normalizedLine.charAt(i + 1) !== ' ') {
                isMatch = true;
            // } else if (isPatternMatch && !isFullToken && i > 0 && normalizedLine.charAt(i) !== ' ' && normalizedLine.charAt(i - 1) === ' ') {
            //     isMatch = true;
            }
            if (isMatch) {
                matchLength = subsection.length;
            }
        }

        return matchLength;
    }

    private static mapNormalizedSubstringToTokenIndices(allTokensInLine: Array<Token>, directiveStartTokenIndex: number, normalizedSubstring: string): Array<number> {
        const start = allTokensInLine[directiveStartTokenIndex].startPosition;
        const end = start + normalizedSubstring.length;
        return allTokensInLine.filter(t => t.startPosition <= start && t.endPosition >= end).map(t => t.index);
    }

    private static calculateTokenIndicesForSubsegment(allTokensInLine: Array<Token>, segment: string): Array<number> {
        const normalizedLine = allTokensInLine.map(t => t.text).reduce((x, y) => !!x ? `${x} ${y}` : y, '');

        const indexOfSegment = normalizedLine.indexOf(segment);
        let spacesBefore = 0;
        for (let i = 0; i < indexOfSegment; i++) {
            if (normalizedLine.charAt(i) === ' ') {
                spacesBefore++;
            }
        }

        if (spacesBefore === 0) {
            return [allTokensInLine[0].index];
        } else {
            return allTokensInLine.filter((t, i) => i >= spacesBefore).map(t => t.index);
        }
    }
}

//?import c2b2=$ImportedCode2:Block02
//<Command> <Receiver> <Parameter>