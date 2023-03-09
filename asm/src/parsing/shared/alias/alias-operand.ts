import { AliasOperandType } from './alias-operand-type';

export interface AliasOperand {
    readonly type: AliasOperandType;
    readonly literal: string;
}