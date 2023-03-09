import { RelativeRefAnchor } from './relative-ref-anchor';
import { RelativeExpression } from './relative-expression';

export interface RelativeRef {
    readonly relativeTo: RelativeRefAnchor;
    readonly expression: RelativeExpression | null;
    readonly hasExpression: boolean;
}