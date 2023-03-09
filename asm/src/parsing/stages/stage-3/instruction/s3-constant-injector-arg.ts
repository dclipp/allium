import { S3InstructionArg } from './s3-instruction-arg';
import { ConstantInjectionKind } from '../../../shared/constant-injector/constant-injection-kind';

export interface S3ConstantInjectorArg extends S3InstructionArg {
    readonly injectionKind: ConstantInjectionKind;
    readonly injectionValue?: number;
    readonly hasValue: boolean;
}