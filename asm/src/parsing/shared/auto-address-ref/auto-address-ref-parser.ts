import { AutoAddressRefKind } from './auto-address-ref-kind';
import { AutoAddressRef } from './auto-address-ref';
import { MessageList } from '../../../messages/message-list';
import { Token } from '../../stages/stage-1/token';
import { AsmMessageHelper } from '../../../messages/asm-message-helper';
import { ASM_MESSAGES } from '../../../messages/asm-messages';
import { RelativeRefAnchor } from './relative-ref-anchor';
import { RelativeExpressionOperation } from './relative-expression-operation';
import { INSTRUCTION_BYTE_COUNT } from '@allium/types';

export class AutoAddressRefParser {
    public static get blockRefRegex(): RegExp {
        return RegExp(/\$[ \t]{0,}([_a-zA-Z][_a-zA-Z0-9]{0,})([ \t]{0,}[:][ \t]{0,}([_a-zA-Z][_a-zA-Z0-9]{0,})){0,1}/);
    }
    
    public static get embeddedBlockRefRegex(): RegExp {
        return RegExp(/\$[ \t]{0,}\.([_a-zA-Z][_a-zA-Z0-9]{0,})([ \t]{0,}[:]){0,1}/);
    }

    public static get relativeRefRegex(): RegExp {
        return RegExp(/\$[ \t]{0,}\([ \t]{0,}([a-zA-Z0-9]+)[ \t]{0,}(([\-+*a-zA-Z])[ \t]{0,}(([0-9]+))){0,1}[ \t]{0,}\)/);
    }

    public static tryParse(fullText: string, tokens?: Array<Token>): { value: AutoAddressRef, messages: MessageList, succeeded: boolean } {
        const aarp = new AutoAddressRefParser(tokens);
        return aarp.parse(fullText);
    }

    private parse(fullText: string): { value: AutoAddressRef, messages: MessageList, succeeded: boolean } {
        const messages = new MessageList();
        let autoAddressRef: AutoAddressRef | null = null;

        const embeddedMatch = fullText.match(AutoAddressRefParser.embeddedBlockRefRegex);
        let match = !!embeddedMatch ? null : fullText.match(AutoAddressRefParser.blockRefRegex);
        const contentCoords = {
            startPosition: -1,
            endPosition: -1
        }
        
        if (!!embeddedMatch) {
            autoAddressRef = {
                kind: AutoAddressRefKind.Block,
                blockName: embeddedMatch[1],
                externalObjectName: null,
                isExternalBlock: false,
                isEmbedded: true
            }
        } else if (!!match) {
            const blockVar1 = match[1];
            const blockVar2 = match[3];
            if (!!blockVar2) { // External block
                autoAddressRef = {
                    kind: AutoAddressRefKind.Block,
                    blockName: blockVar2,
                    externalObjectName: blockVar1,
                    isExternalBlock: true,
                    isEmbedded: false
                }
            } else { // Local block
                autoAddressRef = {
                    kind: AutoAddressRefKind.Block,
                    blockName: blockVar1,
                    externalObjectName: null,
                    isExternalBlock: false,
                    isEmbedded: false
                }
            }
        } else {
            match = fullText.match(AutoAddressRefParser.relativeRefRegex);
            if (!!match) {
                const relativeTo = match[1];
                if (relativeTo === 'here' || relativeTo === 'post') { //todo post??
                    const operator = match[3];
                    const offsetNumeric = match[5];
                    if (!!operator && !!offsetNumeric) { // with expression
                        if (operator === '+' || operator === '-') {
                            const numeric = Number.parseInt(offsetNumeric);
                            if (Number.isNaN(numeric)) {
                                this.ifTokensProvided((tokens) => {
                                    const token = tokens.find(t => t.text.includes(offsetNumeric));
                                    const startPosition = token.text.indexOf(offsetNumeric) + token.startPosition;
                                    messages.addDistinct(AsmMessageHelper.generateMessage(
                                        ASM_MESSAGES.Parser.Stage3.AutoAddressRefInvalidParameter,
                                        {
                                            startPosition: startPosition,
                                            endPosition: startPosition + offsetNumeric.length
                                        }
                                    ))
                                    contentCoords.startPosition = fullText.indexOf(offsetNumeric);
                                    contentCoords.endPosition = contentCoords.startPosition + offsetNumeric.length;
                                });
                            } else if (numeric >= Math.pow(2, 32)) {
                                this.ifTokensProvided((tokens) => {
                                    const token = tokens.find(t => t.text.includes(offsetNumeric));
                                    const startPosition = token.text.indexOf(offsetNumeric) + token.startPosition;
                                    messages.addDistinct(AsmMessageHelper.generateMessage(
                                        ASM_MESSAGES.Parser.Stage3.AutoAddressRefParameterTooLarge,
                                        {
                                            startPosition: startPosition,
                                            endPosition: startPosition + offsetNumeric.length
                                        }
                                    ))
                                    contentCoords.startPosition = fullText.indexOf(offsetNumeric);
                                    contentCoords.endPosition = contentCoords.startPosition + offsetNumeric.length;
                                })
                            } else {
                                autoAddressRef = {
                                    kind: AutoAddressRefKind.Relative,
                                    relativeTo: relativeTo === 'here' ?
                                        RelativeRefAnchor.RefPosition
                                        : RelativeRefAnchor.DataPartStartAddress,
                                    expression: {
                                        operation: operator === '+'
                                            ? RelativeExpressionOperation.Add
                                            : RelativeExpressionOperation.Subtract,
                                        parameter: numeric * INSTRUCTION_BYTE_COUNT
                                    },
                                    hasExpression: true
                                }
                            }
                        } else {
                            this.ifTokensProvided((tokens) => {
                                const token = tokens.find(t => t.text.includes(operator));
                                const startPosition = token.text.indexOf(operator) + token.startPosition;
                                messages.addDistinct(AsmMessageHelper.generateMessage(
                                    ASM_MESSAGES.Parser.Stage3.AutoAddressRefInvalidOperator,
                                    {
                                        startPosition: startPosition,
                                        endPosition: startPosition + operator.length
                                    }
                                ))
                                contentCoords.startPosition = fullText.indexOf(operator);
                                contentCoords.endPosition = contentCoords.startPosition + operator.length;
                            })
                        }
                    } else if (!!operator || !!offsetNumeric) { // invalid expression
                        this.ifTokensProvided((tokens) => {
                            const startToken = tokens.find(t => t.text.includes('('));
                            const startPosition = startToken.text.indexOf('(') + startToken.startPosition;
                            const endToken = tokens.find(t => t.text.includes(')'));
                            const endPosition = endToken.endPosition - endToken.length + endToken.text.indexOf(')');
                            messages.addDistinct(AsmMessageHelper.generateMessage(
                                ASM_MESSAGES.Parser.Stage3.AutoAddressRefInvalidExpression,
                                {
                                    startPosition: startPosition,
                                    endPosition: endPosition
                                }
                            ))
                            contentCoords.startPosition = fullText.indexOf(relativeTo);
                            contentCoords.endPosition = contentCoords.startPosition + relativeTo.length;
                        })
                    } else { // no expression
                        autoAddressRef = {
                            kind: AutoAddressRefKind.Relative,
                            relativeTo: relativeTo === 'here' ?
                                RelativeRefAnchor.RefPosition
                                : RelativeRefAnchor.DataPartStartAddress,
                            expression: null,
                            hasExpression: false
                        }
                    }
                } else {
                    this.ifTokensProvided((tokens) => {
                        const token = tokens.find(t => t.text.includes(relativeTo));
                        const startPosition = token.text.indexOf(relativeTo) + token.startPosition;
                        messages.addDistinct(AsmMessageHelper.generateMessage(
                            ASM_MESSAGES.Parser.Stage3.AutoAddressRefInvalidAnchor,
                            {
                                startPosition: startPosition,
                                endPosition: startPosition + relativeTo.length
                            }
                        ))
                        contentCoords.startPosition = 0;
                        contentCoords.endPosition = fullText.length;
                    })
                }
            }
        }

        if (autoAddressRef === null) {
            if (contentCoords.startPosition === -1) {
                contentCoords.startPosition = 0;
                contentCoords.endPosition = fullText.length;
            }
            autoAddressRef = {
                kind: AutoAddressRefKind.Invalid,
                literal: fullText.substring(contentCoords.startPosition, contentCoords.endPosition)
            }
            if (!messages.hasFailureMessages) {
                this.ifTokensProvided((tokens) => {
                    messages.addDistinct(AsmMessageHelper.generateMessage(
                        ASM_MESSAGES.Parser.Stage3.InvalidAutoAddressRef,
                        {
                            startPosition: tokens[0].startPosition,
                            endPosition: tokens.last().endPosition
                        }
                    ))
                })
            }
        }

        return {
            value: autoAddressRef,
            messages: messages,
            succeeded: !!autoAddressRef
        }
    }

    private ifTokensProvided(then: (tokens: Array<Token>) => void): void {
        then(this._tokens);
    }

    private constructor(tokens?: Array<Token>) {
        this._tokens = tokens || undefined;
    }

    private readonly _tokens?: Array<Token>;
}