import { LexemeKind } from './lexeme-kind';
import { LexicalRelationship } from './lexical-relationship';
import { SourceElement } from './source-element';

export interface WorkingLexeme {
    id: string;
    lineIndex: number;
    startPosition: number;
    endPosition: number;
    kind: LexemeKind;
    text: string;
    relationshipOrigins: Array<LexicalRelationship>;
    sourceElement: SourceElement | 'none';
}