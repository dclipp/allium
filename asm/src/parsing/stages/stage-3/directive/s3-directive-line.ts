import { S3Line } from '../s3-line';
import { DirectiveCommand } from '../../../shared/directive/directive-command';

export interface S3DirectiveLine extends S3Line {
    readonly command: DirectiveCommand;
    readonly receiverName: string;
    readonly hasParameter: boolean;
    readonly parameterValue?: string;
    readonly isImplicitImport: boolean;
}