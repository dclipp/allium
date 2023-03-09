import { Token } from '../../stage-1/token';
import { S2InstructionArgument } from './s2-instruction-argument';
import { TokenSequenceAnalyzer } from '../../common/token-sequence-analyzer';
import { InstructionArgumentKind } from '../../../shared/kinds/instruction-argument-kind';
import { AsmMessage } from '../../../../messages/asm-message';
import { AsmMessageClassification } from '../../../../messages/asm-message-classification';
import { ASM_MESSAGES } from '../../../../messages/asm-messages';
import { AsmMessageHelper } from '../../../../messages/asm-message-helper';

export class S2InstructionParser {
    public static parseInstructionArguments(allTokens: Array<Token>, lineIndex: number, mnemonicTokenIndex: number, lastTokenIndexInLine: number): { args: Array<S2InstructionArgument>, messages: Array<AsmMessage> } {
        const messages = new Array<AsmMessage>();
        const args = new Array<S2InstructionArgument>();
        const instructionArgumentTokens = allTokens.filter((t, i) => i > mnemonicTokenIndex && i <= lastTokenIndexInLine);

        let tokenIndex = 0;
        while (tokenIndex < instructionArgumentTokens.length && !messages.some(m => m.classification === AsmMessageClassification.Fatal)) {
            const parsedArgument = S2InstructionParser.parseArgument(instructionArgumentTokens.filter((a, i) => i >= tokenIndex), lineIndex);
            if (parsedArgument.arg.assumedArgKind === InstructionArgumentKind.Unknown) {
                args.push(parsedArgument.arg);
                tokenIndex = instructionArgumentTokens.length;
            } else {
                args.push(parsedArgument.arg);
                tokenIndex += parsedArgument.tokenCount;
            }

            if (parsedArgument.messages.length > 0) {
                parsedArgument.messages.forEach(m => messages.push(m));
            }
        }

        return {
            args: args,
            messages: messages
        }
    }

    private static parseArgument(tokens: Array<Token>, lineIndex: number): { arg: S2InstructionArgument, messages: Array<AsmMessage>, tokenCount: number } {
        const tryFns = [{
            kind: InstructionArgumentKind.RegisterRef,
            fn: S2InstructionParser.tryRegisterRefArg
        }, {
            kind: InstructionArgumentKind.AutoAddressRef,
            fn: S2InstructionParser.tryAutoAddressRefArg
        }, {
            kind: InstructionArgumentKind.AliasRef,
            fn: S2InstructionParser.tryAliasRefArg
        }, {
            kind: InstructionArgumentKind.ConstantInjector,
            fn: S2InstructionParser.tryConstantInjectorArg
        }, {
            kind: InstructionArgumentKind.InlineValue,
            fn: S2InstructionParser.tryInlineValueArg
        }];

        let match: {
            tokenIndices: number[];
            messages: AsmMessage[];
        } | 'no-match' = 'no-match';
        let index = 0;

        while (index < tryFns.length && match === 'no-match') {
            const currentMatch = tryFns[index].fn(tokens);
            if (currentMatch === 'no-match') {
                index++;
            } else {
                match = currentMatch;
            }
        }

        if (match === 'no-match') {
            return {
                arg: {
                    tokenIndices: tokens.map((t, i) => i),
                    lineIndex: lineIndex,
                    assumedArgKind: InstructionArgumentKind.Unknown
                },
                messages: [],
                tokenCount: tokens.length
            }
        } else {
            return {
                arg: {
                    tokenIndices: match.tokenIndices,
                    lineIndex: lineIndex,
                    assumedArgKind: tryFns[index].kind
                },
                messages: match.messages,
                tokenCount: match.tokenIndices.length
            }
        }
    }

    private static tryRegisterRefArg(tokens: Array<Token>): { tokenIndices: Array<number>, messages: Array<AsmMessage> } | 'no-match' {
        const testResult = TokenSequenceAnalyzer.testFromOrigin(tokens, (text) => { return text.startsWith('[') }, (text, preceedingText) => {
            return preceedingText.endsWith(']') || text.endsWith(']');
        })

        if (testResult.tokenCount > 0 && (testResult.foundEnd || tokens.length === 1)) {
            let message: AsmMessage = null;
            if (tokens.length === 1 && !testResult.spaceTokenizedMatch.endsWith(']')) {
                message = AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.UnterminatedRegisterRef, { startPosition: tokens[0].startPosition, endPosition: tokens[0].endPosition });
            } else if (tokens.length === 1 && !testResult.spaceTokenizedMatch.startsWith('[')) {
                message = AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.UnopenedRegisterRef, { startPosition: tokens[0].startPosition, endPosition: tokens[0].endPosition });
            }
            return {
                tokenIndices: tokens.filter((t, i) => i <= testResult.tokenCount).map(t => t.index),
                messages: !!message
                    ? [message]
                    : new Array<AsmMessage>()
            };
        } else if (testResult.tokenCount > 0) {
            return {
                tokenIndices: tokens.map(t => t.index),
                messages: [AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.UnterminatedRegisterRef, { startPosition: tokens[0].startPosition, endPosition: tokens[tokens.length - 1].endPosition })]
            };
        } else {
            const skipOpeningTestResult = TokenSequenceAnalyzer.testFromOrigin(tokens, (text) => true, (text, preceedingText) => {
                return preceedingText.endsWith(']');
            })
            if ((skipOpeningTestResult.foundEnd || tokens.length === 1) && skipOpeningTestResult.tokenCount > 0 && skipOpeningTestResult.spaceTokenizedMatch.endsWith(']')) {//TODO && RegExp(/([a-z0-9]+)([TODO])/).test(skipOpeningTestResult.spaceTokenizedMatch)) {
                return {
                    tokenIndices: tokens.map(t => t.index),
                    messages: [AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.UnopenedRegisterRef, { startPosition: tokens[0].startPosition, endPosition: tokens[skipOpeningTestResult.tokenCount - 1].endPosition })]
                };
            } else {
                return 'no-match';
            }
        }
    }

    private static tryInlineValueArg(tokens: Array<Token>): { tokenIndices: Array<number>, messages: Array<AsmMessage> } | 'no-match' {
        const decimalTestResult = TokenSequenceAnalyzer.testFromOrigin(
            tokens,
            (text) => { return RegExp(/^[-]{0,1}[0-9]{1,}$/ig).test(text) },
            (text, preceedingText) => {
                return true;
            },
            true)

        if (decimalTestResult.tokenCount > 0 && decimalTestResult.foundEnd) {
            return {
                tokenIndices: tokens.filter((t, i) => i < decimalTestResult.tokenCount).map(t => t.index),
                messages: []
            };
        } else {
            const hexTestResult = TokenSequenceAnalyzer.testFromOrigin(tokens, (text) => { return text.toLowerCase().startsWith('x') }, (text, preceedingText) => {
                return RegExp(/^[x]{0,1}([a-f0-9]+)$/i).test(text);
            }, true)

            if (hexTestResult.foundEnd) {
                const numericValue = parseInt(hexTestResult.spaceTokenizedMatch.toLowerCase().replace('x', '').trim(), 16);
                if (Number.isInteger(numericValue)) {
                    const hexResultMessages = new Array<AsmMessage>();
                    if (!hexTestResult.spaceTokenizedMatch.toLowerCase().startsWith('x')) {
                        hexResultMessages.push(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.InlineValueMissingHexPrefix, { startPosition: tokens[0].startPosition, endPosition: tokens[hexTestResult.tokenCount - 1].endPosition }));
                    }
                    
                    return {
                        tokenIndices: tokens.filter((t, i) => i < hexTestResult.tokenCount).map(t => t.index),
                        messages: hexResultMessages
                    };
                } else {
                    return 'no-match';
                }
            } else {
                const noPrefixTestResult = TokenSequenceAnalyzer.testFromOrigin(tokens, (text) => true, (text, preceedingText) => {
                    return RegExp(/^([a-f0-9]+)$/i).test(text);
                }, true);
                if (noPrefixTestResult.foundEnd) {
                    return {
                        tokenIndices: [tokens[0].index],
                        messages: [AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.InlineValueMissingHexPrefix, {
                            startPosition: tokens[0].startPosition,
                            endPosition: tokens[0].endPosition
                        })]
                    };
                } else {
                    return 'no-match';
                }
            }
        }
    }

    private static tryAutoAddressRefArg(tokens: Array<Token>): { tokenIndices: Array<number>, messages: Array<AsmMessage> } | 'no-match' {
        const testResult = TokenSequenceAnalyzer.testFromOrigin(
            tokens,
            (text) => { return RegExp(/^\$$/ig).test(text) },
            (text, preceedingText) => {
                if (!!preceedingText) {
                    if (preceedingText.trim().endsWith('$')) {
                        if (preceedingText.replace('$', '').trim().startsWith('(')) {
                            return text.trim().endsWith(')');
                        } else if (text.includes(':')) {
                            return false;
                        } else if (preceedingText.includes(':')) {
                            return RegExp(/^[ \t_a-zA-Z0-9]+$/).test(text);
                        } else {
                            return RegExp(/^[ \t_a-zA-Z0-9]+$/).test(text);
                        }
                    } else {
                        return false;
                    }
                } else {
                    if (text.replace('$', '').trim().startsWith('(')) {
                        return text.trim().endsWith(')');
                    } else {
                        return RegExp(/^[ \t:_a-zA-Z0-9]+$/).test(text);
                    }
                }

                // if (text.endsWith(')')) {
                //     return true;
                // } else if ()
                // return true;
            },
            true)

        if (testResult.foundEnd && testResult.tokenCount > 0) {
            const indices = new Array<number>();
            for (let i = 0; i < testResult.tokenCount; i++) {
                indices.push(tokens[i].index);
            }
            return { tokenIndices: indices, messages: new Array<AsmMessage>() }
        } else { // bTODO partial?
            return 'no-match';
        }
    }
    
    private static tryConstantInjectorArg(tokens: Array<Token>): { tokenIndices: Array<number>, messages: Array<AsmMessage> } | 'no-match' {
        const testResult = TokenSequenceAnalyzer.testFromOrigin(tokens, (text) => { return text.startsWith('@') }, (text, preceedingText) => {
            return false;
        })

        const tokenIndices = new Array<number>();
        const messages = new Array<AsmMessage>();

        if (testResult.tokenCount > 0) {
            const indexOfAtSignToken = tokens.findIndex(t => t.text.includes('@'));
            const indexOfEqualsToken = tokens.findIndex(t => t.text.includes('='));
            if (indexOfEqualsToken > -1) {
                tokenIndices.push(tokens[indexOfAtSignToken].index);
                if (indexOfEqualsToken === indexOfAtSignToken) {
                    if (tokens[indexOfEqualsToken].text.trim().endsWith('=')) {
                        if (tokens.length <= indexOfEqualsToken + 1) {
                            messages.push(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.ConstantInjectorMissingValue, {
                                startPosition: tokens[indexOfEqualsToken].startPosition,
                                endPosition: tokens[indexOfEqualsToken].endPosition
                            }))
                        } else {
                            tokenIndices.push(indexOfEqualsToken + 1);
                        }
                    }
                } else {
                    tokenIndices.push(indexOfEqualsToken);
                    if (tokens[indexOfEqualsToken].text.trim().endsWith('=')) {
                        if (tokens.length <= indexOfEqualsToken + 1) {
                            messages.push(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.ConstantInjectorMissingValue, {
                                startPosition: tokens[indexOfEqualsToken].startPosition,
                                endPosition: tokens[indexOfEqualsToken].endPosition
                            }))
                        } else {
                            tokenIndices.push(indexOfEqualsToken + 1);
                        }
                    }
                }
            } else {
                tokenIndices.push(tokens[indexOfAtSignToken].index);
                if (tokens[indexOfAtSignToken].text.trim().endsWith('@')) {
                    if (tokens.length <= indexOfAtSignToken + 1) {
                        messages.push(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.ConstantInjectorMissingKey, {
                            startPosition: tokens[indexOfAtSignToken].startPosition,
                            endPosition: tokens[indexOfAtSignToken + 1].endPosition
                        }))
                    }
                }
            }
        }

        if (testResult.tokenCount > 0 && testResult.foundEnd) {
            const messages = new Array<AsmMessage>();
            let endTokenIndex = testResult.tokenCount - 1;

            if (tokens.length > testResult.tokenCount) {
                const labelMemberStartTokenIndex = tokens.findIndex(t => t.text.includes(':'));
                if (labelMemberStartTokenIndex > -1) {
                    const labelMemberTestResult = TokenSequenceAnalyzer.testFromOrigin(tokens.filter((t, i) => i >= labelMemberStartTokenIndex), (text) => {
                        return text.includes(':');
                    }, (text, preceedingText) => {
                        return RegExp(/^[_a-zA-Z][_a-zA-Z0-9]{0,}$/ig).test(text) || RegExp(/^[$][ ]{0,1}[_a-zA-Z][_a-zA-Z0-9]{0,}[ ]{0,1}[:][ ]{0,1}[_a-zA-Z0-9]{0,}$/ig).test(preceedingText);
                    })

                    if (labelMemberTestResult.tokenCount > 0 && labelMemberTestResult.foundEnd) {
                        endTokenIndex = labelMemberTestResult.tokenCount - 1 + labelMemberStartTokenIndex;
                        const targetMember = labelMemberTestResult.spaceTokenizedMatch.substring(labelMemberTestResult.spaceTokenizedMatch.indexOf(':') + 1).trim();
                        if (!RegExp(/^[_a-zA-Z][_a-zA-Z0-9]{0,}$/ig).test(targetMember)) {
                            messages.push(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.AutoAddressRefMissingExternalTarget, {
                                startPosition: tokens[labelMemberStartTokenIndex].startPosition,
                                endPosition: tokens[endTokenIndex].endPosition
                            }))
                        }
                    }
                }
            }
            
            return {
                tokenIndices: tokens.filter((t, i) => i <= endTokenIndex).map(t => t.index),
                messages: messages
            };
        } else if (testResult.tokenCount > 0) {
            return {
                tokenIndices: tokens.map(t => t.index),
                messages: [AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.InvalidAutoAddressRef, {
                    startPosition: tokens[0].startPosition,
                    endPosition: tokens[tokens.length - 1].endPosition
                })]
            };
        } else {
            return 'no-match';
        }
    }

    private static tryAliasRefArg(tokens: Array<Token>): { tokenIndices: Array<number>, messages: Array<AsmMessage> } | 'no-match' {
        const isMatch = RegExp(/^#[ \t]{0,}[_a-zA-Z][_a-zA-Z0-9]{0,}$/ig).test(tokens[0].text);
        if (isMatch) {
            return {
                tokenIndices: [0],
                messages: new Array<AsmMessage>()
            }
        } else {
            return 'no-match';
        }
    }
}