import { CompiledAssembly } from '../compilation/compiled-assembly';
import { MnemonicHelper, ByteSequenceCreator, Mnemonic, INSTRUCTION_BYTE_COUNT, RegisterHelper, VariableRegisterReference, Byte, NamedRegisterMask } from '@allium/types';

export class Disassembler {
    public static disassemble(programBytes: Array<Byte>): Array<string> {
        const sourceLines = new Array<string>();
        for (let i = 0; i < programBytes.length; i += INSTRUCTION_BYTE_COUNT) {
            const mnemonic = ByteSequenceCreator.Unbox(programBytes[i]) as Mnemonic;
            const mnemonicText = MnemonicHelper.getMnemonicName(mnemonic);

            let sourceLine = mnemonicText;
            if (MnemonicHelper.isInlineQuadValueOp(mnemonic)) {
                const quadByteText = Disassembler.stringifyAsQuadByte(
                    programBytes[i + 1],
                    programBytes[i + 2],
                    programBytes[i + 3],
                    programBytes[i + 4]);
                sourceLine += ` ${quadByteText}`;
            } else if (MnemonicHelper.opArgs.isImplicitAccumulatorOp(mnemonic)) {
                const registerRef = RegisterHelper.getRegisterReferenceFromNumeric(ByteSequenceCreator.Unbox(programBytes[i + 1]));
                sourceLine += ` ${Disassembler.stringifyRegisterRef(registerRef)}`;
            } else if (MnemonicHelper.opArgs.isRegisterAndByteOp(mnemonic)) {
                const registerRef = RegisterHelper.getRegisterReferenceFromNumeric(ByteSequenceCreator.Unbox(programBytes[i + 1]));
                sourceLine += ` ${Disassembler.stringifyRegisterRef(registerRef)}`;
                sourceLine += ` ${programBytes[i + 2].toString({ radix: 10, padZeroes: false })}`;
            } else if (MnemonicHelper.opArgs.isRegisterAndDoubleByteOp(mnemonic)) {
                const registerRef = RegisterHelper.getRegisterReferenceFromNumeric(ByteSequenceCreator.Unbox(programBytes[i + 1]));
                sourceLine += ` ${Disassembler.stringifyRegisterRef(registerRef)}`;

                const doubleByteText = Disassembler.stringifyAsDoubleByte(
                    programBytes[i + 2],
                    programBytes[i + 3]
                )
                sourceLine += ` ${doubleByteText}`;
            } else if (MnemonicHelper.opArgs.isRegisterAndTriByteOp(mnemonic)) {
                const triByteText = Disassembler.stringifyAsTriByte(
                    programBytes[i + 2],
                    programBytes[i + 3],
                    programBytes[i + 4]
                )
                sourceLine += ` ${triByteText}`;
            } else if (MnemonicHelper.opArgs.isOneRegisterOp(mnemonic)) {
                const registerRef = RegisterHelper.getRegisterReferenceFromNumeric(ByteSequenceCreator.Unbox(programBytes[i + 1]));
                sourceLine += ` ${Disassembler.stringifyRegisterRef(registerRef)}`;
            } else if (MnemonicHelper.opArgs.isTwoRegisterOp(mnemonic)) {
                const registerRef1 = RegisterHelper.getRegisterReferenceFromNumeric(ByteSequenceCreator.Unbox(programBytes[i + 1]));
                const registerRef2 = RegisterHelper.getRegisterReferenceFromNumeric(ByteSequenceCreator.Unbox(programBytes[i + 2]));
                sourceLine += ` ${Disassembler.stringifyRegisterRef(registerRef1)}`;
                sourceLine += ` ${Disassembler.stringifyRegisterRef(registerRef2)}`;
            } else if (MnemonicHelper.opArgs.isThreeRegisterOp(mnemonic)) {
                const registerRef1 = RegisterHelper.getRegisterReferenceFromNumeric(ByteSequenceCreator.Unbox(programBytes[i + 1]));
                const registerRef2 = RegisterHelper.getRegisterReferenceFromNumeric(ByteSequenceCreator.Unbox(programBytes[i + 2]));
                const registerRef3 = RegisterHelper.getRegisterReferenceFromNumeric(ByteSequenceCreator.Unbox(programBytes[i + 3]));
                sourceLine += ` ${Disassembler.stringifyRegisterRef(registerRef1)}`;
                sourceLine += ` ${Disassembler.stringifyRegisterRef(registerRef2)}`;
                sourceLine += ` ${Disassembler.stringifyRegisterRef(registerRef3)}`;
            }

            sourceLines.push(sourceLine);
        }

        return sourceLines;
    }

    private static stringifyRegisterRef(registerRef: VariableRegisterReference): string {
        const regName = RegisterHelper.GetRegisterName(registerRef.register).toUpperCase();
        const regMask = registerRef.mask.name === NamedRegisterMask.Full
            ? ''
            : '.' + RegisterHelper.GetMaskName(registerRef.mask.name).acronym;

        return `[${regName}${regMask}]`;
    }

    private static stringifyAsQuadByte(byte1: Byte, byte2: Byte, byte3: Byte, byte4: Byte): string {
        return (ByteSequenceCreator.Unbox(byte1)
            + (ByteSequenceCreator.Unbox(byte2) << 8)
            + (ByteSequenceCreator.Unbox(byte3) << 16)
            + (ByteSequenceCreator.Unbox(byte4) << 24)).toString();
    }

    private static stringifyAsTriByte(byte1: Byte, byte2: Byte, byte3: Byte): string {
        return (ByteSequenceCreator.Unbox(byte1)
            + (ByteSequenceCreator.Unbox(byte2) << 8)
            + (ByteSequenceCreator.Unbox(byte3) << 16)).toString();
    }

    private static stringifyAsDoubleByte(byte1: Byte, byte2: Byte): string {
        return (ByteSequenceCreator.Unbox(byte1)
            + (ByteSequenceCreator.Unbox(byte2) << 8)).toString();
    }
}