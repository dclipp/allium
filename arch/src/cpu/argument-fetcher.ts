import { VariableRegisterReference, DynamicByteSequence, Mnemonic } from '@allium/types';
import { RegisterSet } from '../registers/register-set';
import { FlagSet } from './flag-set';
import { ExecOutput } from './execution/exec-output';
import { NullExecutorArgument } from '../argument/null-executor-argument';
import { IoController } from '../ionew/io-controller';

export interface ExecutorArgument {
    variableRegisterName1: VariableRegisterReference | NullExecutorArgument; 
    variableRegisterName2: VariableRegisterReference | NullExecutorArgument; 
    variableRegisterName3: VariableRegisterReference | NullExecutorArgument; 
    inlineValue: DynamicByteSequence | NullExecutorArgument;

    duplicate(): ExecutorArgument;
}

export interface ExecutorJob {
    (registerSet: RegisterSet, flagSet: FlagSet, getIoController: () => IoController): ExecOutput;
}

export interface ArgumentFetcher {
    (opName: Mnemonic | null, arg: ExecutorArgument): ExecutorJob;
}
