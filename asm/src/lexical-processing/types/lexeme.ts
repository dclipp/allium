import { LexicalRelationship } from './lexical-relationship';
import { LexemeKind } from './lexeme-kind';
import { SourceElement } from './source-element';

export interface Lexeme {
    readonly id: string;
    readonly lineIndex: number;
    readonly startPosition: number;
    readonly endPosition: number;
    readonly kind: LexemeKind;
    readonly text: string;
    readonly relationshipOrigins: Array<LexicalRelationship>;
    readonly sourceElement: SourceElement | 'none';
}

/**
 * 
 * 
 *      lexeme
 *          id
 *          groupId
 *          startPosition
 *          endPosition
 *          kind
 *              whitespace
 *              MKUP??
 *              source
 *                      ??nref??
 *                      ??mach??
 *                          numericValue
 *                          byteLength
 *                          ??machtype??
 *                          
 * 
 * 
 * 
 *      association
 *          from
 *          to
 *          type
 *              ??x??link??
 *              provisionOfValue
 *              provisionOfScope?boundary??
 */