import { S3LabelLine } from './s3-label-line';
import { S3InstructionLine } from './s3-instruction-line';
import { S3Line } from './s3-line';
import { S3DirectiveLine } from './directive/s3-directive-line';
import { ObjectSymbol } from '../../shared/symbol/object-symbol';

export interface Stage3Object {
    readonly labelLines: Array<S3LabelLine>;
    readonly directiveLines: Array<S3DirectiveLine>;
    readonly instructionLines: Array<S3InstructionLine>;
    readonly blankLines: Array<S3Line>;
    readonly symbols: Array<ObjectSymbol>;
}