import { ByteSequenceCreator, MnemonicHelper, RegisterHelper, Byte, Register, VariableRegisterReference, Mnemonic } from '@allium/types';
import { AlmExecutorArgument } from '../../cpu/argument-fetcher';
import { PipelineWorker, PipelineStage, HardwareContext, ImmutablePipelineStorage, PipelineStorage, RegisterSet, MemoryModule, Cpu, NullExecutorArgument, ExecutorArgumentHelper, IoController } from '@allium/arch';

export class DecodeStageWorker implements PipelineWorker {
    public readonly STAGE = PipelineStage.Decode;

    public do(context: HardwareContext<RegisterSet, MemoryModule, Cpu<RegisterSet>, IoController>, storage: ImmutablePipelineStorage): PipelineStorage {
        const workingStorage = storage.toWorkingStorage();
        const instructionAddress = context.registerSet.readWhole(Register.InstructionPtr);
        if (instructionAddress.isEqualTo(Math.pow(2, 32) - 1)) {
            workingStorage.stage = PipelineStage.Done;
        } else {
            workingStorage.stage = PipelineStage.Fetch;
            
            const opcode: Byte = context.memoryModule.read(instructionAddress);
            const mnemonic = this.tryGetMnemonic(opcode);
            if (mnemonic !== false) {
                workingStorage.mnemonic = mnemonic;

                let currentAddress = ByteSequenceCreator.Unbox(instructionAddress) + 1;
                const argByte1: Byte = context.memoryModule.read(ByteSequenceCreator.QuadByte(currentAddress));
                currentAddress++;
                const argByte2: Byte = context.memoryModule.read(ByteSequenceCreator.QuadByte(currentAddress));
                currentAddress++;
                const argByte3: Byte = context.memoryModule.read(ByteSequenceCreator.QuadByte(currentAddress));
                currentAddress++;
                const argByte4: Byte = context.memoryModule.read(ByteSequenceCreator.QuadByte(currentAddress));
                currentAddress++;

                const argument = new AlmExecutorArgument();

                if (MnemonicHelper.isVariableRegister1Op(workingStorage.mnemonic)) {
                    this.tryGetRegisterReference(argByte1, (rr) => argument.variableRegisterName1 = rr);
                }

                if (MnemonicHelper.isVariableRegister2Op(workingStorage.mnemonic)) {
                    this.tryGetRegisterReference(argByte2, (rr) => argument.variableRegisterName2 = rr);
                }

                if (MnemonicHelper.isVariableRegister3Op(workingStorage.mnemonic)) {
                    this.tryGetRegisterReference(argByte3, (rr) => argument.variableRegisterName3 = rr);
                }
                
                if (MnemonicHelper.isInlineQuadValueOp(workingStorage.mnemonic)) {
                    argument.inlineValue = ByteSequenceCreator.QuadByte(
                        ByteSequenceCreator.Unbox(argByte1)
                        + (ByteSequenceCreator.Unbox(argByte2) << 8)
                        + (ByteSequenceCreator.Unbox(argByte3) << 16)
                        + (ByteSequenceCreator.Unbox(argByte4) << 24)
                    );
                } else if (MnemonicHelper.isInlineLessThanQuadValueOp(workingStorage.mnemonic)) {
                    argument.inlineValue = ByteSequenceCreator.TriByte(
                        ByteSequenceCreator.Unbox(argByte2)
                        + (ByteSequenceCreator.Unbox(argByte3) << 8)
                        + (ByteSequenceCreator.Unbox(argByte4) << 16)
                    );
                }

                workingStorage.argument = argument;
            }
        }
        return workingStorage.finalizeStorage();
    }

    private tryGetRegisterReference(byte: Byte, push: (rr: VariableRegisterReference | NullExecutorArgument) => void): boolean {
        let isValidRegRef = false;

        try {
            const regRef = RegisterHelper.GetRegisterReferenceFromByte(byte);
            isValidRegRef = true;
            push(regRef);
        } catch {
            push(ExecutorArgumentHelper.createNullArg());
        }

        return isValidRegRef;
    }

    private tryGetMnemonic(opcode: Byte): Mnemonic | false {
        try {
            return MnemonicHelper.GetMnemonicFromByte(opcode);
        } catch {
            return false;
        }
    }
}
