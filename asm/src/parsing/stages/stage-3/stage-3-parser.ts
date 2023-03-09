import { S3LabelLine } from './s3-label-line';
import { S3InstructionLine } from './s3-instruction-line';
import { S3Line } from './s3-line';
import { Stage3Object } from './stage-3-object';
import { StageParserOutput } from '../stage-parser-output';
import { S2Line } from '../stage-2/s2-line';
import { Token } from '../stage-1/token';
import { RegexBuilder } from '../../regex-builder/regex-builder';
import { RegexBuilderTemplate } from '../../regex-builder/regex-builder-template';
import { S3InstructionParser } from './instruction/s3-instruction-parser';
import { S3DirectiveLine } from './directive/s3-directive-line';
import { S3DirectiveParser } from './directive/s3-directive-parser';
import { PassDetails } from '../../shared/parser-types/pass-details';
import { ParseOptions } from '../../parse-options';
import { MessageList } from '../../../messages/message-list';
import { StageParser } from '../stage-parser';
import { WorkingParserPayload } from '../../shared/parser-types/internal-payload/working-parser-payload';
import { S3SymbolExtractor } from './symbol/s3-symbol-extractor';

class Stage3Parser {
    public static parse(workingPayload: WorkingParserPayload, passDetails: PassDetails, options: ParseOptions): StageParserOutput<Stage3Object> {
        const messages = new MessageList();

        // const lines = StructuralViewParser.getLines(content, originView.tokens);
        const labelLines: Array<S3LabelLine> = workingPayload.stage2.labelLines.map(ln => {
            const extractedTokenIndex = Stage3Parser.extractLabelTokenIndex(ln, workingPayload.stage1.tokens);
            return {
                lineIndex: ln.lineIndex,
                nameTokenIndex: extractedTokenIndex.tokenIndex,
                normalizedName: workingPayload.stage1.tokens[extractedTokenIndex.tokenIndex].text.replace(':', '').replace('.', '').trim(),
                isEmbedded: extractedTokenIndex.isEmbedded
            }
        })
        
        const directiveLines = new Array<S3DirectiveLine>();
        workingPayload.stage2.directiveLines.forEach(ln => {
            const dl = S3DirectiveParser.parseDirectiveLine(ln);
            messages.merge(dl.messages)
            if (!!dl.line) {
                directiveLines.push(dl.line);
            }
        });

        const parsedSymbols = S3SymbolExtractor.extract(labelLines, workingPayload.stage2.instructionLines, directiveLines, passDetails);
        messages.merge(parsedSymbols.messages);

        const instructionLines = new Array<S3InstructionLine>();
        workingPayload.stage2.instructionLines.forEach(ln => {
            const ir = S3InstructionParser.parseInstructionLine(workingPayload.stage1, ln, parsedSymbols.symbols, directiveLines, options);
            messages.merge(ir.messages);
            instructionLines.push(ir.line);
        });
        
        // const commentLines = new Array<StructuralViewLine>();
        const blankLines: Array<S3Line> = workingPayload.stage2.blankLines.map(ln => {
            return {
                lineIndex: ln.lineIndex
            }
        })

        return {
            object: {
                labelLines: labelLines,
                directiveLines: directiveLines,
                instructionLines: instructionLines,
                blankLines: blankLines,
                symbols: parsedSymbols.symbols
            },
            messages: messages
        }
    }

    private static extractLabelTokenIndex(labelLine: S2Line, tokens: Array<Token>): {
        readonly tokenIndex: number;
        readonly isEmbedded: boolean;
    } {
        let tokenIndex = -1;
        let isEmbedded = false;

        const tokensForLine = tokens.filter(t => labelLine.tokenIndices.includes(t.index));
        if (tokensForLine.length === 1) {
            tokenIndex = tokensForLine[0].index;
        } else {
            let token = tokensForLine.find(t => Stage3Parser._labelPatternNoColon.test(t.text.trim()));
            if (!(!!token)) {
                token = tokensForLine.find(t => Stage3Parser._labelPatternWithColon.test(t.text.trim()));
            }

            if (!!token) {
                isEmbedded = tokensForLine.some(t => t.index === token.index - 1 && t.text === '.');
                tokenIndex = token.index;
            }
        }

        return {
            tokenIndex: tokenIndex,
            isEmbedded: isEmbedded
        };
    }

    private static readonly _labelPatternNoColon = RegexBuilder.build(RegexBuilderTemplate.LabelFormat);
    private static readonly _labelPatternWithColon = RegexBuilder.build(RegexBuilderTemplate.LabelFormat, RegexBuilderTemplate.AnyLinearWhitespace, ':');
}

export const parseStage3: StageParser<Stage3Object> = Stage3Parser.parse;