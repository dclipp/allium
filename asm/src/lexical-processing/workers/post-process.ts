import { WorkingLexeme } from '../types/working-lexeme';
import { LexemeId } from '../types/lexeme-id';
import { LexemeKind } from '../types/lexeme-kind';
import { LexicalRelationship } from '../types/lexical-relationship';

export function postProcess(fileIndex: number, fileContent: string, workingLexemes: Array<WorkingLexeme>): Array<WorkingLexeme> {
    const lexemes = new Array<WorkingLexeme>();
    let wsIndex = Math.max(fileContent.indexOf(' '), fileContent.indexOf('\t'));
    let lastWsEndPosition = -1;
    while (wsIndex > -1) {
        const insertAfterLexemeIndex = workingLexemes.findIndex(lx => lx.endPosition <= wsIndex
            && !workingLexemes.some(lx2 => lx2.id !== lx.id && lx2.endPosition <= wsIndex && lx2.startPosition > lx.startPosition));
        workingLexemes.filter((lx, lxi) => (insertAfterLexemeIndex === -1 || lxi <= insertAfterLexemeIndex) && !lexemes.some(lx2 => lx2.id === lx.id)).forEach(lx => {
            lexemes.push(lx);
        })

        const wsChar = fileContent.charAt(wsIndex);
        let segmentLength = 1;
        let foundNonWs = false;
        while (segmentLength + wsIndex < fileContent.length && !foundNonWs) {
            if (fileContent.charAt(wsIndex + segmentLength) === wsChar) {
                segmentLength++;
            } else {
                foundNonWs = true;
            }
        }

        const lineIndex = insertAfterLexemeIndex > -1 ? lexemes.last().lineIndex : 0;
        let startPosition = insertAfterLexemeIndex > -1 ? lexemes.last().endPosition : 0;
        const endPosition = startPosition + segmentLength;

        let newlinesAdded = 0;
        while (startPosition < endPosition && fileContent.charAt(startPosition) === '\n') {
            lexemes.push({
                id: LexemeId.generate(fileIndex, lineIndex + newlinesAdded, startPosition, startPosition + 1),
                lineIndex: lineIndex + newlinesAdded,
                startPosition: startPosition,
                endPosition: startPosition + 1,
                kind: LexemeKind.Newline,
                text: '\n',
                relationshipOrigins: new Array<LexicalRelationship>(),
                sourceElement: 'none'
            })
            newlinesAdded++;
            startPosition++;
        }

        const wsEndPosition = startPosition + segmentLength;
        lexemes.push({
            id: LexemeId.generate(fileIndex, lineIndex + newlinesAdded, startPosition, wsEndPosition),
            lineIndex: lineIndex + newlinesAdded,
            startPosition: startPosition,
            endPosition: wsEndPosition,
            kind: wsChar === ' ' ? LexemeKind.SpaceSequence : LexemeKind.TabSequence,
            text: wsChar === ' ' ? ' '.repeat(segmentLength) : '\t'.repeat(segmentLength),
            relationshipOrigins: new Array<LexicalRelationship>(),
            sourceElement: 'none'
        })

        wsIndex = Math.max(fileContent.indexOf(' ', wsIndex + segmentLength), fileContent.indexOf('\t', wsIndex + segmentLength));
        lastWsEndPosition = endPosition;
    }

    workingLexemes.filter(lx => lx.startPosition >= lastWsEndPosition).forEach(lx => {
        lexemes.push(lx);
    })

    return lexemes;
}