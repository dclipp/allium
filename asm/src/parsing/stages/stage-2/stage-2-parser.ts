import { Stage1Object } from '../stage-1/stage-1-object';
import { StageParserOutput } from '../stage-parser-output';
import { Stage2Object } from './stage-2-object';
import { S2Line } from './s2-line';
import { Token } from '../stage-1/token';
import { S2LineKind } from './s2-line-kind';
import { S2InstructionLine } from './instruction/s2-instruction-line';
import { S2MnemonicParser } from './instruction/s2-mnemonic-parser';
import { S2InstructionParser2 } from './instruction/s2-instruction-parser2';
import { S2DirectiveLine } from './directive/s2-directive-line';
import { S2DirectiveParser } from './directive/s2-directive-parser';
import { AsmMessageHelper } from '../../../messages/asm-message-helper';
import { ASM_MESSAGES } from '../../../messages/asm-messages';
import { MessageList } from '../../../messages/message-list';
import { StageParser } from '../stage-parser';
import { WorkingParserPayload } from '../../shared/parser-types/internal-payload/working-parser-payload';

class Stage2Parser {
    public static parse(workingPayload: WorkingParserPayload): StageParserOutput<Stage2Object> {
        const messages = new MessageList();

        const lines = Stage2Parser.getLines(workingPayload.sourceContent, workingPayload.stage1.tokens);
        const labelLines = new Array<S2Line>();
        const instructionLines = new Array<S2InstructionLine>();
        const directiveLines = new Array<S2DirectiveLine>();
        const commentLines = new Array<S2Line>();
        const blankLines = new Array<S2Line>();

        lines.forEach(ln => {
            if (ln.kind === S2LineKind.Label) {
                labelLines.push(ln);
            } else if (ln.kind === S2LineKind.Instruction) {
                const ilResult = Stage2Parser.getInstructionLine(ln, workingPayload.stage1, workingPayload.sourceContent);
                instructionLines.push(ilResult.line);
                messages.merge(ilResult.messages);
            } else if (ln.kind === S2LineKind.Directive) {
                const dlResult = S2DirectiveParser.parseDirectiveLine(ln, workingPayload.stage1.tokens);
                directiveLines.push(dlResult.line);
                if (!!dlResult.messages && dlResult.messages.length > 0) {
                    dlResult.messages.forEach(m => messages.addDistinct(m));
                }
            } else if (ln.kind === S2LineKind.Comment) {
                commentLines.push(ln);
            } else if (ln.kind === S2LineKind.Blank) {
                blankLines.push(ln);
            }
        })

        const blockInstructionRanges = labelLines.map(ln => {
            const nextLabel = labelLines.find(ln2 => ln2.lineIndex > ln.lineIndex);
            const nextLabelLineIndex = !!nextLabel ? nextLabel.lineIndex : lines.length;
            return {
                labelLineIndex: ln.lineIndex,
                instructionLineIndices: instructionLines.filter(il => il.lineIndex > ln.lineIndex && il.lineIndex < nextLabelLineIndex).map(il => il.lineIndex)
            }
        })
        const unlabeledInstructions = instructionLines.filter(il => !blockInstructionRanges.some(bir => bir.instructionLineIndices.includes(il.lineIndex)));
        if (unlabeledInstructions.length > 0) {
            const firstInstruction = unlabeledInstructions[0];
            const startToken = workingPayload.stage1.tokens.find(t => t.index === firstInstruction.tokenIndices[0]);
            const endToken = workingPayload.stage1.tokens[firstInstruction.tokenIndices.length - 1];
            messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.Blocks.UnlabeledBlock, {
                startPosition: !!startToken ? startToken.startPosition : 0,
                endPosition: !!endToken ? endToken.endPosition : 0
            }))
        }

        return {
            object: {
                labelLines: labelLines,
                instructionLines: instructionLines,
                directiveLines: directiveLines,
                commentLines: commentLines,
                blankLines: blankLines
            },
            messages: messages
        }
    }

    private static getInstructionLine(line: S2Line, stage1Object: Stage1Object, fullContent: string): { line: S2InstructionLine, messages: MessageList } {
        const tokens = stage1Object.tokens;
        const parsedMnemonic = S2MnemonicParser.parseMnemonic(line.tokenIndices.map(t => tokens[t]));
        if (Number.isInteger(parsedMnemonic.mnemonicTokenIndex)) {
            // const tokensForLine = tokens.filter((t, i) => t.)line.tokenIndices[line.tokenIndices.length - 1]
            const args = S2InstructionParser2.parseInstructionArguments(tokens, line.lineIndex, parsedMnemonic.mnemonicTokenIndex, line.tokenIndices[line.tokenIndices.length - 1], fullContent);
            return {
                line: {
                    mnemonicTokenIndex: parsedMnemonic.mnemonicTokenIndex,
                    argumentList: args.args,
                    tokenIndices: line.tokenIndices,
                    lineIndex: line.lineIndex,
                    kind: line.kind
                },
                messages: args.messages
            }
        } else {
            return {
                line: {
                    mnemonicTokenIndex: Number.NaN,
                    argumentList: [],
                    tokenIndices: line.tokenIndices,
                    lineIndex: line.lineIndex,
                    kind: line.kind
                },
                messages: parsedMnemonic.messages
            }
        }
    }

    private static getLines(content: string, tokens: Array<Token>): Array<S2Line> {
        const lines = new Array<S2Line>();
        let currentTokenIndices = new Array<number>();

        for (let i = 0; i < tokens.length; i++) {
            const currentToken = tokens[i];
            currentTokenIndices.push(i);
            
            if (i < tokens.length - 1) {
                const currentTokenEnd = Math.max(0, currentToken.endPosition - 1);
                const nextTokenStart = tokens[i + 1].startPosition;
                const contentAfterCurrent = content.substring(currentTokenEnd, nextTokenStart);
                if (contentAfterCurrent.includes('\n')) {
                    lines.push({
                        tokenIndices: currentTokenIndices,
                        lineIndex: lines.length,
                        kind: Stage2Parser.determineLineKind(currentTokenIndices.map(ix => tokens[ix]))
                    })
                    currentTokenIndices = new Array<number>();
                }
            }
        }

        if (currentTokenIndices.length > 0) {
            lines.push({
                tokenIndices: currentTokenIndices,
                lineIndex: lines.length,
                kind: Stage2Parser.determineLineKind(currentTokenIndices.map(ix => tokens[ix]))
            })
        }

        let linesOut = new Array<S2Line>();
        if (lines.length > 0) {
            let workingLines = new Array<S2Line>();

            // Add blank lines that precede the first token
            const firstTokenStart = tokens[lines[0].tokenIndices[0]].startPosition;
            for (let i = 0; i < firstTokenStart; i++) {
                if (content.charAt(i) === '\n') {
                    workingLines.push({
                        tokenIndices: [],
                        lineIndex: workingLines.length,
                        kind: S2LineKind.Blank
                    })
                }
            }

            const preceedingBlankLineCount = workingLines.length;

            // Add the inner lines
            lines.forEach(ln => {
                workingLines.push({
                    tokenIndices: ln.tokenIndices,
                    lineIndex: ln.lineIndex + preceedingBlankLineCount,
                    kind: ln.kind
                })
            })

            linesOut = workingLines;
        }

        return Stage2Parser.mergeBlankLines(content, linesOut);
    }

    private static mergeBlankLines(content: string, lines: Array<S2Line>): Array<S2Line> {
        const blankLines = content.split('\n').map((ln, lni) => {
            if (ln.match(/^[ \t]{0,}$/)) {
                return {
                    tokenIndices: [],
                    lineIndex: lni,
                    kind: S2LineKind.Blank
                }
            } else {
                return null;
            }
        }).filter(x => !!x);

        let mergedLines = new Array<S2Line>();
        lines.concat(blankLines).forEach(ln => {
            if (ln.kind === S2LineKind.Blank) {
                const linesBefore = mergedLines.filter(ln2 => ln2.lineIndex < ln.lineIndex);
                const linesAfter = mergedLines.filter(ln2 => ln2.lineIndex >= ln.lineIndex).map(ln2 => {
                    let correctedLine: any = undefined;
                    if (ln2.kind === S2LineKind.Label || ln2.kind === S2LineKind.Comment || ln2.kind === S2LineKind.Blank) {
                        correctedLine = {
                            kind: ln2.kind,
                            lineIndex: ln2.lineIndex + 1,
                            tokenIndices: ln2.tokenIndices
                        }
                    } else if (ln2.kind === S2LineKind.Instruction) {
                        const typedLine = ln2 as S2InstructionLine;
                        correctedLine = {
                            kind: ln2.kind,
                            lineIndex: ln2.lineIndex + 1,
                            tokenIndices: ln2.tokenIndices,
                            mnemonicTokenIndex: typedLine.mnemonicTokenIndex,
                            argumentList: typedLine.argumentList
                        }
                    } else if (ln2.kind === S2LineKind.Directive) {
                        const typedLine = ln2 as S2DirectiveLine;
                        correctedLine = {
                            kind: ln2.kind,
                            lineIndex: ln2.lineIndex + 1,
                            tokenIndices: ln2.tokenIndices,
                            directiveIndex: typedLine.directiveIndex,
                            directive: typedLine.directive
                        }
                    }
    
                    return correctedLine as S2Line;
                });
                mergedLines = linesBefore.concat([ln]).concat(linesAfter);
            } else {
                const linesBefore = mergedLines.filter(ln2 => ln2.lineIndex < ln.lineIndex);
                const linesAfter = mergedLines.filter(ln2 => ln2.lineIndex > ln.lineIndex);
                mergedLines = linesBefore.concat([ln]).concat(linesAfter);
            }
        })

        return mergedLines.sort((a, b) => a.lineIndex - b.lineIndex);
    }

    private static determineLineKind(tokens: Array<Token>): S2LineKind {
        if (tokens.length < 1) {
            return S2LineKind.Blank;
        } else if (tokens[0].text.startsWith('\'')) {
            return S2LineKind.Comment;
        } else if (tokens[0].text.startsWith('?')) {
            return S2LineKind.Directive;
        } else if (tokens[tokens.length - 1].text.endsWith(':')) {
            return S2LineKind.Label;
        } else {
            return S2LineKind.Instruction;
        }
    }

    private static getLastTokenEnd(tokenIndices: Array<number>, tokens: Array<Token>): number {
        return tokens[tokenIndices[tokenIndices.length - 1]].endPosition;
    }
}

export const parseStage2: StageParser<Stage2Object> = Stage2Parser.parse;