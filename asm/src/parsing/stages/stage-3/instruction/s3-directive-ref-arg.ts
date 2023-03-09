import { S3InstructionArg } from './s3-instruction-arg';

export interface S3DirectiveRefArg extends S3InstructionArg {
    readonly directiveReceiverName: string;
}