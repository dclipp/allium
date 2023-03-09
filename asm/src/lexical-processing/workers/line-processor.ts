import { GlobalPass } from '../../parsing/passes/global-pass';
import { WorkingLexeme } from '../types/working-lexeme';
import { Token } from '../../parsing/stages/stage-1/token';
import { LexemeKind } from '../types/lexeme-kind';
import { LexicalRelationship } from '../types/lexical-relationship';
import { LexemeId } from '../types/lexeme-id';

export class LineProcessor {
    public processLine(fileContent: string, globalPass: GlobalPass, workingLexemes: {
        readonly length: number;
        last: () => WorkingLexeme;
        push: (wl: WorkingLexeme) => void;
    }, fileIndex: number, line: string, indexOfLine: number): any {
        const contentBeforeLength = fileContent.split('\n').filter((ln, lni) => lni < indexOfLine).reduce((x, y) => !!x ? `${x}\n${y}` : y, '').length;
        const currentStartPosition = contentBeforeLength > 0 ? contentBeforeLength + 1 : 0;
        const tokensForLine = globalPass.stage1.tokens.filter(t => t.startPosition >= currentStartPosition && t.endPosition <= currentStartPosition + line.length);
        const lineStart = workingLexemes.length > 0
            ? this.findStartPositionOfLine(workingLexemes.last().endPosition, fileContent)
            : 0;
        const processedLine = this.extractLexemes(fileIndex, line, indexOfLine, lineStart, tokensForLine);
        processedLine.forEach((ln) => {
            workingLexemes.push({
                id: ln.id,
                lineIndex: ln.lineIndex,
                startPosition: ln.startPosition,
                endPosition: ln.endPosition,
                kind: ln.kind,
                text: ln.text,
                relationshipOrigins: ln.relationshipOrigins,
                sourceElement: ln.sourceElement
            });
        })
    }

    private findStartPositionOfLine(lastEndPosition: number, fullContent: string): number {
        let contentBefore = fullContent;
        if (fullContent.length > lastEndPosition) {
            contentBefore = fullContent.substring(0, lastEndPosition + 1);
        }

        let lastIndex = contentBefore.length - 1;
        const lastNewline = contentBefore.lastIndexOf('\n');
        if (lastNewline > -1 && contentBefore.length > lastNewline + 1) {
            lastIndex = lastNewline + 1;
        }
        
        return lastIndex;
    }

    private extractLexemes(fileIndex: number, line: string, lineIndex: number, baseStartPosition: number, allTokens: Array<Token>): Array<WorkingLexeme> {
        let placeholder = `^${Math.random()}`.replace('.', '');
        while (line.includes(placeholder)) {
            placeholder = `^${Math.random()}`.replace('.', '');
        }

        const isCommentLine = line.trim().startsWith('\'');
        if (isCommentLine) {
            // return line.replace(/[ |\t|\n]{1,}/g, ' ').split(' ').map((token, tokenIndex) => {
                return [{
                    id: LexemeId.generate(fileIndex, lineIndex, baseStartPosition, baseStartPosition + line.length),
                    lineIndex: lineIndex,
                    startPosition: baseStartPosition,
                    endPosition: baseStartPosition + line.length,
                    kind: LexemeKind.Comment,
                    text: line,
                    relationshipOrigins: new Array<LexicalRelationship>(),
                    sourceElement: 'none'
                }]
            // })
        } else {
            let sourceElementsOnlyLine = line.replace(/[ |\t|\n]{1,}/g, placeholder);
            this._GRAMMATICAL_CHARS.forEach(gc => {
                while (sourceElementsOnlyLine.includes(gc)) {
                    sourceElementsOnlyLine = sourceElementsOnlyLine.replace(gc, placeholder);
                }
            })
            while (sourceElementsOnlyLine.includes(placeholder)) {
                sourceElementsOnlyLine = sourceElementsOnlyLine.replace(placeholder, ' ');
            }
            const sourceElementsOnly = sourceElementsOnlyLine.split(' ').map((s, si) => {
                return {
                    id: null,
                    lineIndex: lineIndex,
                    startPosition: si,
                    endPosition: si + s.length,
                    kind: LexemeKind.SourceElement,
                    text: s,
                    relationshipOrigins: new Array<LexicalRelationship>(),
                    sourceElement: null//SourceElement | 'none'
                }
            })

            const grammaticalElementsOnly = new Array<WorkingLexeme>();
            for (let i = 0; i < line.length; i++) {
                const ch = line.charAt(i);
                if (this._GRAMMATICAL_CHARS.includes(ch)) {
                    grammaticalElementsOnly.push({
                        id: null,
                        lineIndex: lineIndex,
                        startPosition: grammaticalElementsOnly.length,
                        endPosition: grammaticalElementsOnly.length + ch.length,
                        kind: LexemeKind.GrammaticalElement,
                        text: ch,
                        relationshipOrigins: new Array<LexicalRelationship>(),
                        sourceElement: 'none'
                    })
                }
                
            }

            const linearWhitespaceElementsOnly = new Array<WorkingLexeme>();
            let buffer = '';
            for (let i = 0; i < line.length; i++) {
                const ch = line.charAt(i);
                let workingBuffer = buffer + ch;
                if (RegExp(/^[ ]{1,}$/).test(workingBuffer)) {
                    buffer = workingBuffer;
                } else if (RegExp(/^[\t]{1,}$/).test(workingBuffer)) {
                    buffer = workingBuffer;
                } else {
                    if (buffer.length > 0) {
                        const startPosition = linearWhitespaceElementsOnly.length > 0 ? linearWhitespaceElementsOnly.last().endPosition : 0;
                        linearWhitespaceElementsOnly.push({
                            id: null,
                            lineIndex: lineIndex,
                            startPosition: startPosition,
                            endPosition: startPosition + buffer.length,
                            kind: RegExp(/^[ ]{1,}$/).test(workingBuffer) ? LexemeKind.SpaceSequence : LexemeKind.TabSequence,
                            text: buffer,
                            relationshipOrigins: new Array<LexicalRelationship>(),
                            sourceElement: 'none'
                        })
                    }
                    buffer = '';
                }
            }

            let resolvedLexemes = new Array<WorkingLexeme>();
            const lineWithoutWhitespace = line.replace(/[ |\t|\n]{1,}/g, '');
            let seIndex = 0;
            let geIndex = 0;
            let rebuiltLine = '';
            while (seIndex < sourceElementsOnly.length || geIndex < grammaticalElementsOnly.length) {
                const workingRebuildSe = seIndex < sourceElementsOnly.length ? rebuiltLine + sourceElementsOnly[seIndex].text : rebuiltLine + placeholder;
                const workingRebuildGe = geIndex < grammaticalElementsOnly.length ? rebuiltLine + grammaticalElementsOnly[geIndex].text : rebuiltLine + placeholder;
                const startPosition = resolvedLexemes.length > 0
                        ? this.findStartPositionOfLexeme(resolvedLexemes.last().text, resolvedLexemes.last().endPosition, line)
                        : baseStartPosition;
                if (lineWithoutWhitespace.startsWith(workingRebuildSe)) {
                    resolvedLexemes.push({
                        id: null,
                        lineIndex: lineIndex,
                        startPosition: startPosition,//sourceElementsOnly[seIndex].startPosition,
                        endPosition: startPosition + sourceElementsOnly[seIndex].text.length,// sourceElementsOnly[seIndex].startPosition + sourceElementsOnly[seIndex].text.length,
                        kind: sourceElementsOnly[seIndex].kind,
                        text: sourceElementsOnly[seIndex].text,
                        relationshipOrigins: new Array<LexicalRelationship>(),
                        sourceElement: sourceElementsOnly[seIndex].sourceElement
                    });
                    rebuiltLine = workingRebuildSe;
                    seIndex++;
                    resolvedLexemes = resolvedLexemes.filter(rl => rl.text.length > 0);
                } else if (lineWithoutWhitespace.startsWith(workingRebuildGe)) {
                    resolvedLexemes.push({
                        id: null,
                        lineIndex: lineIndex,
                        startPosition: startPosition,
                        endPosition: startPosition + grammaticalElementsOnly[geIndex].text.length,
                        kind: grammaticalElementsOnly[geIndex].kind,
                        text: grammaticalElementsOnly[geIndex].text,
                        relationshipOrigins: new Array<LexicalRelationship>(),
                        sourceElement: grammaticalElementsOnly[geIndex].sourceElement
                    })
                    rebuiltLine = workingRebuildGe;
                    geIndex++;
                    resolvedLexemes = resolvedLexemes.filter(rl => rl.text.length > 0);
                }
            }

            let rlIndex = 0;
            for (let i = 0; i < allTokens.length; i++) {
                const currentToken = allTokens[i];
                if (resolvedLexemes[rlIndex].text === currentToken.text) {
                    resolvedLexemes[rlIndex].startPosition = currentToken.startPosition;
                    resolvedLexemes[rlIndex].endPosition = currentToken.endPosition;
                    rlIndex++;
                } else {
                    let workingText = currentToken.text;
                    let sp = currentToken.startPosition;
                    while (workingText.length > 0) {
                        resolvedLexemes[rlIndex].startPosition = sp;
                        resolvedLexemes[rlIndex].endPosition = sp + resolvedLexemes[rlIndex].text.length;
                        workingText = workingText.substring(resolvedLexemes[rlIndex].text.length);
                        sp += resolvedLexemes[rlIndex].text.length;
                        rlIndex++;
                    }
                }
                
            }

            const whitespaceSegments = new Array<WhitespaceSegment>();
            let currentWsSegment: WhitespaceSegment = null;

            for (let i = 0; i < line.length; i++) {
                const ch = line.charAt(i);
                if (ch === ' ') {
                    if (currentWsSegment === null) {
                        currentWsSegment = { type: 'space', length: 1, startPosition: i, nonWsBefore: line.substring(0, i).replace(/[ |\t]{1,}/g, '') };
                    } else if (currentWsSegment.type === 'space') {
                        currentWsSegment.length++;
                    } else {
                        whitespaceSegments.push(currentWsSegment);
                        currentWsSegment.type = 'space';
                        currentWsSegment.startPosition = i;
                        currentWsSegment.length = 1;
                    }
                } else if (ch === '\t') {
                    if (currentWsSegment === null) {
                        currentWsSegment = { type: 'tab', length: 1, startPosition: i, nonWsBefore: line.substring(0, i).replace(/[ |\t]{1,}/g, '') };
                    } else if (currentWsSegment.type === 'tab') {
                        currentWsSegment.length++;
                    } else {
                        whitespaceSegments.push(currentWsSegment);
                        currentWsSegment.type = 'tab';
                        currentWsSegment.startPosition = i;
                        currentWsSegment.length = 1;
                    }
                } else if (!!currentWsSegment) {
                    whitespaceSegments.push(currentWsSegment);
                    currentWsSegment = null;
                }
            }

            if (!!currentWsSegment) {
                whitespaceSegments.push(currentWsSegment);
            }

            const getLexemesBeforeIndices = (combinedText: string) => {
                const lexemesBeforeIndices = new Array<number>();
                let workingCombinedText = '';
                for (let i = 0; i < resolvedLexemes.length && combinedText !== workingCombinedText; i++) {
                    lexemesBeforeIndices.push(i);
                    workingCombinedText += resolvedLexemes[i].text;
                }
                return lexemesBeforeIndices;
            }

            whitespaceSegments.forEach(wss => {
                const lexemesBeforeIndices = getLexemesBeforeIndices(wss.nonWsBefore);
                const lexemesBefore = resolvedLexemes.filter((lx, lxi) => !lexemesBeforeIndices.includes(lxi));
                lexemesBefore.forEach(lx => {
                    lx.startPosition += Math.max(0, wss.nonWsBefore.length - wss.startPosition - wss.length);
                    lx.endPosition += Math.max(0, wss.nonWsBefore.length - wss.startPosition - wss.length);
                })
            })

            // if (isCommentLine) {
                // resolvedLexemes.forEach((rl, rli) => {
                //     rl.id = LexemeId.generate(fileIndex, lineIndex, rl.startPosition, rl.endPosition);
                //     if (isCommentLine) {
                //         if (rli === 0) {
                //             rl.kind === LexemeKind.GrammaticalElement;
                //             rl.sourceElement = 'none';
                //         } else {
                //             rl.kind === LexemeKind.SourceElement;
                //             rl.sourceElement = {
                //                 meaning: SourceElementMeaning.Comment,
                //                 machineDataType: MachineDataType.None,
                //                 byteLength: 0,
                //                 numericValue: 'none'
                //             }
                //         }
                //     }
                // })

                resolvedLexemes.filter(lx => lx.id === null).forEach(lx => {
                    lx.id = LexemeId.generate(fileIndex, lineIndex, lx.startPosition, lx.endPosition);
                })
                return resolvedLexemes;
            }

            // return resolvedLexemes;
    }

    private findStartPositionOfLexeme(lastLexemeText: string, lastLexemeEnd: number, line: string): number {
        const lastIndex = line.lastIndexOf(lastLexemeText);
        let lineAfter = line;
        if (lastIndex > -1) {
            const cutAt = lastLexemeText.length + lastIndex;
            lineAfter = line.length > cutAt
                ? line.substring(cutAt)
                : line;
        }

        let indexOfNonWhitespace = -1;
        for (let i = 0; i < lineAfter.length && indexOfNonWhitespace === -1; i++) {
            if (!RegExp(/^[ |\t]$/).test(lineAfter.charAt(i))) {
                indexOfNonWhitespace = i;
            }
        }

        return indexOfNonWhitespace + lastLexemeEnd;
    }

    private readonly _GRAMMATICAL_CHARS = ['[', ']', '@', '#', '$', '.', '=', '?', ':'];
}

interface WhitespaceSegment { type: 'space' | 'tab', length: number, startPosition: number, nonWsBefore: string }