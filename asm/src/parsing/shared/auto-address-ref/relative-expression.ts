import { RelativeExpressionOperation } from './relative-expression-operation';

export interface RelativeExpression {
    readonly operation: RelativeExpressionOperation;
    readonly parameter: number;
}