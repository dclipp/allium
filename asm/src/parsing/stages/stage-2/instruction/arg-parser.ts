import { ArgParseResult } from './arg-parse-result';
import { InstructionArgumentKind } from '../../../shared/kinds/instruction-argument-kind';
import { AsmMessageTemplate } from '../../../../messages/asm-message-template';
import { AsmMessageHelper } from '../../../../messages/asm-message-helper';

export interface ArgParserCase {
    readonly pattern: RegExp;
    readonly certainty: 'strong' | 'weak';
    readonly message?: AsmMessageTemplate;
    readonly isValid: boolean;
}

export abstract class ArgParser {
    public examineLine(line: string, lineStartOffset: number): ArgParseResult | 'not-found' {
        let bestResult: ArgParseResult | 'not-found' = 'not-found';

        const resultsByCase = this._cases.map(c => this.processCase(line, lineStartOffset, c));
        bestResult = this.selectBestResult(resultsByCase.filter(r => r !== 'not-found').map(r => r as ArgParseResult));
        
        if (bestResult === 'not-found' && !!this._lastResortCase) {
            bestResult = this.processCase(line, lineStartOffset, this._lastResortCase);
        }

        return bestResult;
    }

    protected constructor(kind: InstructionArgumentKind, cases: Array<ArgParserCase>, lastResortCase?: ArgParserCase) {
        this._kind = kind;
        this._cases = cases.map(c => {
            return {
                pattern: new RegExp(c.pattern),
                certainty: c.certainty,
                message: c.message || undefined,
                isValid: c.isValid === true
            }
        })
        this._lastResortCase = !!lastResortCase ?
            {
                pattern: new RegExp(lastResortCase.pattern),
                certainty: lastResortCase.certainty,
                message: lastResortCase.message || undefined,
                isValid: lastResortCase.isValid === true
            }
            : null;
    }

    private processCase(line: string, lineStartOffset: number, parserCase: ArgParserCase): ArgParseResult | 'not-found' {
        const results = new Array<ArgParseResult>();

        for (let i = line.length - 1; i > -1; i--) {
            const subsection = i === line.length - 1
                ? line
                : i === 0
                ? ''
                : line.substring(0, i);
            const isFullToken = i === line.length - 1 || i === 0 || line.charAt(i + 1) === ' ';
            const isPatternMatch = RegExp(parserCase.pattern).test(subsection);
            let isMatch = isPatternMatch && isFullToken;
            if (isPatternMatch && !isFullToken && i < line.length - 1 && line.charAt(i) === ' ' && line.charAt(i + 1) !== ' ') {
                isMatch = true;
            }

            if (isMatch) {
                results.push({
                    kind: this._kind,
                    foundMatch: true,
                    isValid: parserCase.isValid,
                    matchLength: subsection.length,
                    certainty: parserCase.certainty,
                    message: !!parserCase.message ?
                        AsmMessageHelper.generateMessage(parserCase.message, { startPosition: lineStartOffset, endPosition: subsection.length })
                        : undefined
                })
            }
        }

        return this.selectBestResult(results);
    }

    private selectBestResult(results: Array<ArgParseResult>): ArgParseResult | 'not-found' {
        // Order by:
        //      "isValid"
        //          then by "certainty"
        //              then by "matchLength"
        const matchingResults = results.filter(r => r.foundMatch);
        if (matchingResults.length > 0) {
            const sortedMatches = matchingResults.sort((a, b) => {
                if (a.isValid === b.isValid) {
                    if (a.certainty === b.certainty) {
                        return a.matchLength < b.matchLength ? 1 : a.matchLength > b.matchLength ? -1 : 0;
                    } else {
                        if (a.certainty === 'strong') {
                            return -1;
                        } else {
                            return 1;
                        }
                    }
                } else {
                    if (a.isValid) {
                        return -1;
                    } else {
                        return 1;
                    }
                }
            })

            const sortedByLength = sortedMatches.sort((a, b) => a.matchLength > b.matchLength ? -1 : a.matchLength < b.matchLength ? 1 : 0);
            const validMatch = sortedByLength.find(m => m.isValid);
            return !!validMatch ? validMatch : sortedMatches[0];
        } else {
            return 'not-found';
        }
    }

    private readonly _cases: Array<ArgParserCase>;
    private readonly _lastResortCase: ArgParserCase;
    private readonly _kind: InstructionArgumentKind;
}