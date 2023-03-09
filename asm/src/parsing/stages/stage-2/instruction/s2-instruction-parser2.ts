import { Token } from '../../stage-1/token';
import { S2InstructionArgument } from './s2-instruction-argument';
import { InstructionArgumentKind } from '../../../shared/kinds/instruction-argument-kind';
import { RegisterArgParser } from './register-arg-parser';
import { ArgParser } from './arg-parser';
import { ArgParseResult } from './arg-parse-result';
import { InlineArgParser } from './inline-arg-parser';
import { ConstantInjectorArgParser } from './constant-injector-arg-parser';
import { ASM_MESSAGES } from '../../../../messages/asm-messages';
import { AsmMessageHelper } from '../../../../messages/asm-message-helper';
import { MessageList } from '../../../../messages/message-list';
import { AutoAddressRefArgParser } from './auto-address-ref-arg-parser';
import { AliasRefArgParser } from './alias-ref-arg-parser';

export class S2InstructionParser2 {
    private static parseArgument(lineAfterMnemonic: string, lineStartOffset: number): ArgParseResult | 'not-found' {
        let validArg: ArgParseResult | 'not-found' = 'not-found';
        let bestInvalidArg: ArgParseResult | 'not-found' = 'not-found';
        let parserIndex = 0;
        const results = new Map<InstructionArgumentKind, ArgParseResult | 'not-found'>();

        while (validArg === 'not-found' && parserIndex < S2InstructionParser2._parsers.length) {
            const current = S2InstructionParser2._parsers[parserIndex];
            const result = current.parser.examineLine(lineAfterMnemonic, lineStartOffset);
            results.set(current.kind, result);
            if (result !== 'not-found') {
                if (result.isValid) {
                    validArg = result;
                } else {
                    if (bestInvalidArg === 'not-found') {
                        bestInvalidArg = result;
                    } else if (result.matchLength > bestInvalidArg.matchLength) {
                        bestInvalidArg = result;
                    }
                }
            }
            parserIndex++;
        }

        //todo 
        if (validArg === 'not-found') {
            return bestInvalidArg;
        } else {
            return validArg;
        }
    }

    /**
     * Finds the length *G* of the longest substring of line *L* such that
     * parseArgument(*L*.substring(*G*)) = 'not-found' and there exists no
     * length *H* such that *H* > *G* and parseArgument(*L*.substring(*H*)) = 'not-found'
    */
    private static tryExtractUnknownArgumentLength(line: string): number {
        let index = 1;
        let lastResult: ArgParseResult | 'not-found' = 'not-found';
        let workingLine = line.substring(index);

        while (lastResult === 'not-found' && index < line.length) {
            const currentResult = S2InstructionParser2.parseArgument(workingLine, index);
            const isFullToken = index === 1 || line.charAt(index - 1) === ' ';
            if (currentResult === 'not-found' || !isFullToken) {
                index++;
                workingLine = line.substring(index);
            } else {
                lastResult = currentResult;
            }
        }

        return index;
    }

    /**
     * Extracts ArgParseResults from a line whose first argument is of kind 'Unknown'.
     * Any argument whose kind *is* known and which begins after the 'Unknown' argument
     * will also be extracted.
    */
    private static processUnknownArgument(line: string, offset: number, mnemonicTokenStartPosition: number): Array<ArgParseResult> {
        const results = new Array<ArgParseResult>();
        const unknownLength = S2InstructionParser2.tryExtractUnknownArgumentLength(line);
        results.push({
            kind: InstructionArgumentKind.Unknown,
            foundMatch: true,
            isValid: false,
            matchLength: unknownLength,
            certainty: 'strong',
            message: AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.UnknownArgument, { startPosition: offset + mnemonicTokenStartPosition, endPosition: offset + mnemonicTokenStartPosition + unknownLength } )
        });

        if (unknownLength < line.length) {
            const proceedingTokens = line.substring(unknownLength).split(' ');
            proceedingTokens.forEach(pt => {
                const proceedingArg = S2InstructionParser2.parseArgument(pt, unknownLength + offset);
                if (proceedingArg !== 'not-found') {
                    results.push(proceedingArg);
                }
            })
        }

        return results;
    }

    public static parseInstructionArguments(allTokens: Array<Token>, lineIndex: number, mnemonicTokenIndex: number, lastTokenIndexInLine: number, fullContent: string): { args: Array<S2InstructionArgument>, messages: MessageList } {
        const parsedArgs = new Array<{ kind: InstructionArgumentKind, foundMatch: boolean, startPosition?: number, endPosition?: number }>();
        const messages = new MessageList();

        const mnemonicToken = allTokens[mnemonicTokenIndex];
        /** The source line with the mnemonic removed and trimmed left */
        const fullLineWithoutMnemonic = allTokens
            .filter(t => t.index > mnemonicTokenIndex && t.index <= lastTokenIndexInLine)
            .map(t => t.text)
            .reduce((x, y) => !!x ? `${x} ${y}` : y, '');

        /**
         * String = 'fullLineWithoutMnemonic' - *parsedArgText*, where *parsedArgText* is
         * the concatentaion of all parsed args found so far,
         * i.e. all args within 'parsedArgs'
        */
        let workingLine = fullLineWithoutMnemonic;
        let workingOffset = fullContent.indexOfNonWhitespace(mnemonicToken.length + 1 + mnemonicToken.startPosition);
        let lastResult: ArgParseResult | 'not-found' = null;

        // While workingLine is not empty, find the best (i.e. longest and least-invalid) argument, "A"
        // contained within the entire workingLine. After each iteration, remove "N" characters from the
        // beginning of workingLine, where "N" is the length of the last "A"
        // Stop when workingLine is empty OR when no further argument can be parsed from workingLine
        while (lastResult !== 'not-found' && !!workingLine) {
            lastResult = S2InstructionParser2.parseArgument(workingLine, workingOffset);

            if (lastResult === 'not-found') {
                /**
                 * Parsed argument(s), starting with an arg of kind 'Unknown'.
                 * May also include valid (i.e. kind != 'Unknown') args after the 'Unknown' arg.
                */
                const processUnknownResult = S2InstructionParser2.processUnknownArgument(fullLineWithoutMnemonic, mnemonicToken.length + 1, mnemonicToken.startPosition);

                processUnknownResult.forEach((r, i, a) => {
                    /**
                     * Combined length of all valid (i.e. kind != 'Unknown') arg(s) preceeding the current arg
                    */
                    const unknownOffset = i === 0 ? 0 : a.filter((x, j) => j < i).map(a => a.matchLength).reduce((x, y) => x + y, 0);

                    parsedArgs.push({
                        kind: r.kind,
                        foundMatch: r.foundMatch,
                        startPosition: unknownOffset + mnemonicToken.length + 1,
                        endPosition: unknownOffset + r.matchLength + mnemonicToken.length + i + 1
                    });
                    if (!!r.message) {
                        messages.addDistinct(r.message);
                    }
                })
            } else {
                parsedArgs.push({
                    kind: lastResult.kind,
                    foundMatch: lastResult.foundMatch,
                    startPosition: workingOffset,
                    endPosition: workingOffset + lastResult.matchLength
                });
                if (!!lastResult.message) {
                    messages.addDistinct(lastResult.message);
                }

                workingOffset += lastResult.matchLength;
                workingLine = workingLine.substring(lastResult.matchLength);
                
                const whitespaceLengthDiff = workingLine.length - workingLine.trim().length;
                if (whitespaceLengthDiff > 0) {
                    workingLine = workingLine.trim();
                    workingOffset += whitespaceLengthDiff;
                }
            }
        }

        // For each parsed argument, get the assumed kind of that argument and a list of token indices
        // that fall within the argument's text range
        const args = parsedArgs.map(a => {
            /** All tokens that are on the same line as the mnemonic */
            const tokensForLine = allTokens.filter(t => t.index > mnemonicTokenIndex && t.index <= lastTokenIndexInLine);

            /**
             * All tokens that are on the same line as the mnemonic
             * and are within range of the current parsed arg *a*
            */
            const tokensForArg = tokensForLine.filter(t => t.startPosition >= a.startPosition && t.endPosition <= a.endPosition);

            const concatTokens = fullContent.substring(a.startPosition, a.endPosition + mnemonicToken.length).replace(/[ \t]+/g, '');
            const tokensForArgConcatLength = tokensForArg.map(x => x.length).reduce((x, y) => x + y, 0);
            if (tokensForArgConcatLength < concatTokens.length && tokensForArg.length < tokensForLine.length && tokensForLine[tokensForArg.length].startPosition === a.endPosition) {
                const missingTokenValue = concatTokens.replace(concatTokens.substring(0, tokensForArgConcatLength), '');
                if (!!missingTokenValue && missingTokenValue === tokensForLine[tokensForArg.length].text) {
                    tokensForArg.push(tokensForLine[tokensForArg.length]);
                }
            }

            // const xyz = fullContent.substring(a.startPosition, a.endPosition + mnemonicToken.length);
            return {
                tokenIndices: tokensForArg.map(t => t.index),
                lineIndex: lineIndex,
                assumedArgKind: a.kind
            }
        })

        return {
            args: args,
            messages: messages
        }
    }

    private static readonly _parsers: Array<{ kind: InstructionArgumentKind, parser: ArgParser }> = [
        {
            kind: InstructionArgumentKind.RegisterRef,
            parser: new RegisterArgParser()
        },
        {
            kind: InstructionArgumentKind.AutoAddressRef,
            parser: new AutoAddressRefArgParser()
        },
        {
            kind: InstructionArgumentKind.AliasRef,
            parser: new AliasRefArgParser()
        },
        {
            kind: InstructionArgumentKind.ConstantInjector,
            parser: new ConstantInjectorArgParser()
        },
        {
            kind: InstructionArgumentKind.InlineValue,
            parser: new InlineArgParser()
        }
    ]
}