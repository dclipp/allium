import { LexicalRelationshipType } from './lexical-relationship-type';

export interface LexicalRelationship {
    readonly toId: string;
    readonly type: LexicalRelationshipType;
}