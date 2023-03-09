import { Token } from '../stage-1/token';

export type SequenceAnalyzerStartTester = (text: string) => boolean;
export type SequenceAnalyzerEndTester = (text: string, preceedingText: string) => boolean;
export type SequenceAnalyzerTestResult = { tokenCount: number, foundEnd: boolean, spaceTokenizedMatch: string }
export type SEQ2 = {type: 'literal' | 'template', value: string, caseSensitive?: boolean}

export enum TrailingWhitespaceRule {
    Any,
    AtLeast1,
    None
}

export interface SegmentPattern {
    readonly name: string;
    readonly pattern: string;
    readonly whitespaceAfter: TrailingWhitespaceRule;
    readonly oneOf?: Array<SegmentPattern>;
}

export const SegmentPatternTemplates = {
    Alpha: 'a',
    NumericBase10: 'd',
    NumericBase16: 'x',
    NumericAny: 'n',
    LabelFormat: 'L',
    EqualsSign: '=',
    AnyAscii: 's'
}

export const SegmentPatternQualifiers = {
    OneOrMore: '+',
    ZeroOrMore: '?'
}

export class TokenSequenceAnalyzer {
    public static testFromOrigin(tokens: Array<Token>, startTester: SequenceAnalyzerStartTester, endTester: SequenceAnalyzerEndTester, mergeIfSingle?: boolean): SequenceAnalyzerTestResult {
        if (startTester(tokens[0].text)) {
            let tokenCount = 1;
            let foundEnd = false;
            let cumulativeText = tokens[0].text;
        
            if (tokens.length === 1 && mergeIfSingle === true) {
                foundEnd = endTester(cumulativeText, cumulativeText);
            } else {
                for (let i = 1; i < tokens.length && !foundEnd; i++) {
                    const currentText = tokens[i].text;
                    foundEnd = endTester(currentText, cumulativeText);
                    cumulativeText += ` ${currentText}`;

                    if (foundEnd) {
                        tokenCount += i;
                    }
                }
            }

            return {
                tokenCount: tokenCount,
                foundEnd: foundEnd,
                spaceTokenizedMatch: cumulativeText
            }
        } else {
            return {
                tokenCount: 0,
                foundEnd: false,
                spaceTokenizedMatch: ''
            }
        }
    }

    public static analyze2(input: string, patterns: Array<SEQ2>): boolean {
        // AnyNonWhitespace: '*',
        //     ZeroOrMoreWhitespace: '^',
        //     AtLeast1WhitespaceIfNotEndOfLine: '_'
        const results = new Array<{patternIndex: number, length: number}>();
        let failed = false;
        let patternIndex = 0;
        let zeroLengthOffset = false;
        for (let index = 0; index < input.length && !failed; index++) {
            const pattern = patterns[patternIndex];
            if (pattern.type === 'literal') {
                const literalLength = pattern.value.length;
                const segment = index === input.length - 1 ? input.substring(index) : input.substring(index, literalLength);
                if (pattern.caseSensitive === true) {
                    failed = segment !== pattern.value;
                } else {
                    failed = segment.toLowerCase() !== pattern.value.toLowerCase();
                }

                if (!failed) {
                    results.push({ patternIndex: patternIndex, length: segment.length });
                    index = segment.length;
                    patternIndex++;
                }
                zeroLengthOffset = false;
            } else if (pattern.type === 'template') {
                const tester = TokenSequenceAnalyzer.getTemplateTester(pattern.value);
                const literalsAfterPattern = TokenSequenceAnalyzer.getLiteralsAfterPattern(patterns, patternIndex);
                let segmentMatchLength = 0;
                let lookaheadIndex = index;
                let patternFailed = false;
                let stopLiteral = '';
                while (lookaheadIndex < input.length && !patternFailed && !(!!stopLiteral)) {
                    const ch = input.charAt(lookaheadIndex);
                    const isMatch = tester(ch, lookaheadIndex === input.length - 1);
                    if (isMatch) {
                        stopLiteral = literalsAfterPattern.find(lit => lit === ch);
                        if (!(!!stopLiteral)) {
                            lookaheadIndex++;
                            segmentMatchLength++;
                        }
                    } else {
                        patternFailed = true;
                    }
                }

                if (segmentMatchLength === 0) {
                    results.push({ patternIndex: patternIndex, length: 0 });
                    patternIndex++;
                    if (!!stopLiteral) {
                        index += -1 * stopLiteral.length;
                        zeroLengthOffset = true;
                    }
                } else {
                    if (!!stopLiteral) {
                        segmentMatchLength += -1 * stopLiteral.length;
                    }
    
                    if (segmentMatchLength > 0) {
                        results.push({ patternIndex: patternIndex, length: segmentMatchLength });
                        index += segmentMatchLength;
                        patternIndex++;
                    } else {
                        failed = true;
                    }

                    zeroLengthOffset = false;
                }
            }
        }

        return results.length === patterns.length;
    }

    private static getTemplateTester(template: string): (ch: string, isEOL: boolean) => boolean {
        if (template === '*') {
            return (ch, isEOL) => { return TokenSequenceAnalyzer.testAnyNonWhitespace(ch) }
        } else if (template === '^') {
            return (ch, isEOL) => { return TokenSequenceAnalyzer.testZeroOrMoreWhitespace(ch) }
        } else if (template === '_') {
            return (ch, isEOL) => { return TokenSequenceAnalyzer.testAtLeast1WhitespaceIfNotEndOfLine(ch, isEOL) }
        } else {
            throw new Error(`Invalid template: '${template}'`);
        }
    }

    private static testAnyNonWhitespace(ch: string): boolean {
        return ch.trim().length === ch.length;
    }

    private static testZeroOrMoreWhitespace(ch: string): boolean {
        return ch.trim().length === ch.length;
    }

    private static testAtLeast1WhitespaceIfNotEndOfLine(ch: string, isEOL: boolean): boolean {
        return ch.trim().length === ch.length;
    }

    private static getLiteralsAfterPattern(patterns: Array<SEQ2>, patternIndex: number): Array<string> {
        return patterns.filter((p, i) => p.type === 'literal' && i > patternIndex).map(p => p.value);
    }

    public static analyze(input: string, patterns: Array<SegmentPattern>) {

    }

    private static evaluatePattern(input: string, pattern: SegmentPattern): number {
        let testChar: (ch: string) => boolean = null;
        if (pattern.pattern.startsWith('^')) {
            testChar = (ch) => { return ch === pattern.pattern.charAt(1) };
        } else if (pattern.pattern.startsWith(SegmentPatternTemplates.Alpha)) {
            testChar = (ch) => { return RegExp(/^[a-zA-Z]$/).test(ch) };
        } else if (pattern.pattern.startsWith(SegmentPatternTemplates.NumericBase10)) {
            // testChar = (ch) => { return RegExp(/^[a-zA-Z]$/).test(ch) };
        } else if (pattern.pattern.startsWith(SegmentPatternTemplates.NumericBase16)) {
            // testChar = (ch) => { return RegExp(/^[a-zA-Z]$/).test(ch) };
        } else if (pattern.pattern.startsWith(SegmentPatternTemplates.NumericAny)) {
            // testChar = (ch) => { return RegExp(/^[a-zA-Z]$/).test(ch) };
        } else if (pattern.pattern.startsWith(SegmentPatternTemplates.LabelFormat)) {
            testChar = (ch) => { return RegExp(/^[_a-zA-Z0-9]$/).test(ch) };
        } else if (pattern.pattern.startsWith(SegmentPatternTemplates.EqualsSign)) {
            testChar = (ch) => { return ch === '=' };
        } else if (pattern.pattern.startsWith(SegmentPatternTemplates.AnyAscii)) {
            testChar = (ch) => { return ch.trim().length === ch.length };
        } else {
            throw new Error(`Invalid pattern: '${pattern.name}'`);
        }

        if (input.endsWith(SegmentPatternQualifiers.OneOrMore)) {
            if (input.length === 0) {
                return -1;
            } else {
                if (input.length === 1) {

                } else {
                    let count = -1;
                    let index = 0;
                    let isMatch = true;
                    while (index < input.length && isMatch) {
                        isMatch = testChar(input.charAt(index));
                        if (isMatch) {
                            if (count === -1) {
                                count = 1;
                            } else {
                                count++;
                            }
                        }
                        index++;
                    }
                    return isMatch ? count : -1;
                }
            }
        } else {
            if (input.length === 0) {
                if (input.endsWith(SegmentPatternQualifiers.ZeroOrMore)) {
                    return 0;
                } else {
                    return -1;
                }
            } else {
                let count = -1;
                let index = 0;
                let isMatch = true;
                while (index < input.length && isMatch) {
                    isMatch = testChar(input.charAt(index));
                    if (isMatch) {
                        if (count === -1) {
                            count = 1;
                        } else {
                            count++;
                        }
                    }
                    index++;
                }
                return isMatch ? count : -1;
            }
        }

    }
}