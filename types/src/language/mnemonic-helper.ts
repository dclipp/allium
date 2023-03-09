import { Mnemonic } from './mnemonic';
import { OpsLists } from './ops-lists';
import { Byte } from '../data/byte';
import { ByteSequenceCreator } from '../data/byte-sequence-creator';

const _getMnemonicKeyValues = function (): Array<{ name: string, value: number }> {
    const a = new Array<{ name: string, value: number }>();
    const names = Object.keys(Mnemonic).filter(k => !RegExp(/^[0-9]+$/).test(k));
    names.forEach((k, i) => {
        a.push({
            name: k,
            value: i
        });
    });
    return a;
}

export class MnemonicHelper {
    private static HIGHEST_MNEMONIC = Mnemonic.END.valueOf();

    public static GetMnemonicFromByte(byte: Byte): Mnemonic {
        const v = ByteSequenceCreator.Unbox(byte);
        if (v > MnemonicHelper.HIGHEST_MNEMONIC) {
            throw new Error(`MnemonicHelper.GetMnemonicFromByte: ${v} is too large to be a mnemonic`);
        } else {
            return v as Mnemonic;
        }
    }

    public static isVariableRegister1Op(mnemonic: Mnemonic): boolean {
        return MnemonicHelper._variableRegister1Ops.includes(mnemonic);
    }

        public static isVariableRegister2Op(mnemonic: Mnemonic): boolean {
            return MnemonicHelper._variableRegister2Ops.includes(mnemonic);
        }

        public static isVariableRegister3Op(mnemonic: Mnemonic): boolean {
            return MnemonicHelper._variableRegister3Ops.includes(mnemonic);
        }

        public static isInlineQuadValueOp(mnemonic: Mnemonic): boolean {
            return MnemonicHelper._inlineQuadValueOps.includes(mnemonic);
        }

        public static isInlineLessThanQuadValueOp(mnemonic: Mnemonic): boolean {
            return MnemonicHelper._inlineLessThanQuadValueOps.includes(mnemonic);
        }

        public static getMnemonicName(mnemonic: Mnemonic): string {
            let str = '';

            switch (mnemonic) {
                case Mnemonic.ADD:
                    str = 'ADD';
                    break;
                case Mnemonic.SUB:
                    str = 'SUB';
                    break;
                case Mnemonic.MULT:
                    str = 'MULT';
                    break;
                case Mnemonic.DIV:
                    str = 'DIV';
                    break;
                case Mnemonic.MOD:
                    str = 'MOD';
                    break;
                case Mnemonic.MEMREAD:
                    str = 'MEMREAD';
                    break;
                case Mnemonic.MEMREAD_Q:
                    str = 'MEMREAD_Q';
                    break;
                case Mnemonic.MEMREAD_X:
                    str = 'MEMREAD_X';
                    break;
                case Mnemonic.MEMREAD_D:
                    str = 'MEMREAD_D';
                    break;
                case Mnemonic.MEMWRITE:
                    str = 'MEMWRITE';
                    break;
                case Mnemonic.MEMWRITE_Q:
                    str = 'MEMWRITE_Q';
                    break;
                case Mnemonic.MEMWRITE_X:
                    str = 'MEMWRITE_X';
                    break;
                case Mnemonic.MEMWRITE_D:
                    str = 'MEMWRITE_D';
                    break;
                case Mnemonic.PUSH:
                    str = 'PUSH';
                    break;
                case Mnemonic.PUSH_Q:
                    str = 'PUSH_Q';
                    break;
                case Mnemonic.PUSH_X:
                    str = 'PUSH_X';
                    break;
                case Mnemonic.PUSH_D:
                    str = 'PUSH_D';
                    break;
                case Mnemonic.IPUSH:
                    str = 'IPUSH';
                    break;
                case Mnemonic.IPUSH_Q:
                    str = 'IPUSH_Q';
                    break;
                case Mnemonic.IPUSH_X:
                    str = 'IPUSH_X';
                    break;
                case Mnemonic.IPUSH_D:
                    str = 'IPUSH_D';
                    break;
                case Mnemonic.POP:
                    str = 'POP';
                    break;
                case Mnemonic.POP_Q:
                    str = 'POP_Q';
                    break;
                case Mnemonic.POP_X:
                    str = 'POP_X';
                    break;
                case Mnemonic.POP_D:
                    str = 'POP_D';
                    break;
                case Mnemonic.LOAD_MONDAY:
                    str = 'LOAD_MONDAY';
                    break;
                case Mnemonic.LOAD_TUESDAY:
                    str = 'LOAD_TUESDAY';
                    break;
                case Mnemonic.LOAD_WEDNESDAY:
                    str = 'LOAD_WEDNESDAY';
                    break;
                case Mnemonic.LOAD_THURSDAY:
                    str = 'LOAD_THURSDAY';
                    break;
                case Mnemonic.LOAD_FRIDAY:
                    str = 'LOAD_FRIDAY';
                    break;
                case Mnemonic.LOAD_ACCUMULATOR:
                    str = 'LOAD_ACCUMULATOR';
                    break;
                case Mnemonic.LOAD_INSPTR:
                    str = 'LOAD_INSPTR';
                    break;
                case Mnemonic.LOAD_G7:
                    str = 'LOAD_G7';
                    break;
                case Mnemonic.LOAD_G8:
                    str = 'LOAD_G8';
                    break;
                case Mnemonic.LOAD_G9:
                    str = 'LOAD_G9';
                    break;
                case Mnemonic.LOAD_G10:
                    str = 'LOAD_G10';
                    break;
                case Mnemonic.LOAD_G11:
                    str = 'LOAD_G11';
                    break;
                case Mnemonic.LOAD_G12:
                    str = 'LOAD_G12';
                    break;
                case Mnemonic.LOAD_G13:
                    str = 'LOAD_G13';
                    break;
                case Mnemonic.LOAD_G14:
                    str = 'LOAD_G14';
                    break;
                case Mnemonic.LOAD_STKPTR:
                    str = 'LOAD_STKPTR';
                    break;
                case Mnemonic.COPY:
                    str = 'COPY';
                    break;
                case Mnemonic.INC:
                    str = 'INC';
                    break;
                case Mnemonic.DEC:
                    str = 'DEC';
                    break; 
                case Mnemonic.BITAND:
                    str = 'BITAND';
                    break;
                case Mnemonic.BITOR:
                    str = 'BITOR';
                    break;
                case Mnemonic.BITXOR:
                    str = 'BITXOR';
                    break;
                case Mnemonic.BITLSHIFT:
                    str = 'BITLSHIFT';
                    break;
                case Mnemonic.BITRSHIFT:
                    str = 'BITRSHIFT';
                    break;
                case Mnemonic.BITNOT:
                    str = 'BITNOT';
                    break;
                case Mnemonic.EQ:
                    str = 'EQ';
                    break;
                case Mnemonic.GT:
                    str = 'GT';
                    break;
                case Mnemonic.LT:
                    str = 'LT';
                    break;
                case Mnemonic.JMP:
                    str = 'JMP';
                    break;
                case Mnemonic.JNZ:
                    str = 'JNZ';
                    break;
                case Mnemonic.JZ:
                    str = 'JZ';
                    break;
                case Mnemonic.JMPI:
                    str = 'JMPI';
                    break;
                case Mnemonic.JNZI:
                    str = 'JNZI';
                    break;
                case Mnemonic.JZI:
                    str = 'JZI';
                    break;
                case Mnemonic.ADDF:
                    str = 'ADDF';
                    break;
                case Mnemonic.SUBF:
                    str = 'SUBF';
                    break;
                case Mnemonic.MULTF:
                    str = 'MULTF';
                    break;
                case Mnemonic.DIVF:
                    str = 'DIVF';
                    break;
                case Mnemonic.FLOORF:
                    str = 'FLOORF';
                    break;
                case Mnemonic.CEILF:
                    str = 'CEILF';
                    break;
                case Mnemonic.ROUNDF:
                    str = 'ROUNDF';
                    break;
                case Mnemonic.FLAG_ACK:
                    str = 'FLAG_ACK';
                    break;
                case Mnemonic.ADDV:
                    str = 'ADDV';
                    break;
                case Mnemonic.SUBV:
                    str = 'SUBV';
                    break;
                case Mnemonic.MULTV:
                    str = 'MULTV';
                    break;
                case Mnemonic.DIVV:
                    str = 'DIVV';
                    break;
                case Mnemonic.MODV:
                    str = 'MODV';
                    break;
                case Mnemonic.EQV:
                    str = 'EQV';
                    break;
                case Mnemonic.GTV:
                    str = 'GTV';
                    break;
                case Mnemonic.LTV:
                    str = 'LTV';
                    break;
                case Mnemonic.ABSV:
                    str = 'ABSV';
                    break;
                case Mnemonic.NEGV:
                    str = 'NEGV';
                    break;
                case Mnemonic.VEC:
                    str = 'VEC';
                    break;
                case Mnemonic.VEC_NEG:
                    str = 'VEC_NEG';
                    break;
                case Mnemonic.MAG:
                    str = 'MAG';
                    break;
                case Mnemonic.LOAD_D:
                    str = 'LOAD_D';
                    break;
                case Mnemonic.LOAD_B:
                    str = 'LOAD_B';
                    break;
                case Mnemonic.LOAD_X:
                    str = 'LOAD_X';
                    break;
                case Mnemonic.NO_OP:
                    str = 'NO_OP';
                    break;
                case Mnemonic.ISCAN:
                    str = 'ISCAN';
                    break;
                case Mnemonic.OSCAN:
                    str = 'OSCAN';
                    break;
                case Mnemonic.IOSTAT:
                    str = 'IOSTAT';
                    break;
                case Mnemonic.IOREAD_B:
                    str = 'IOREAD_B';
                    break;
                case Mnemonic.IOREAD_D:
                    str = 'IOREAD_D';
                    break;
                case Mnemonic.IOREAD_X:
                    str = 'IOREAD_X';
                    break;
                case Mnemonic.IOREAD_Q:
                    str = 'IOREAD_Q';
                    break;
                case Mnemonic.IOWRITE_B:
                    str = 'IOWRITE_B';
                    break;
                case Mnemonic.IOWRITE_D:
                    str = 'IOWRITE_D';
                    break;
                case Mnemonic.IOWRITE_X:
                    str = 'IOWRITE_X';
                    break;
                case Mnemonic.IOWRITE_Q:
                    str = 'IOWRITE_Q';
                    break;
                case Mnemonic.IOFLUSH:
                    str = 'IOFLUSH';
                    break;
                case Mnemonic.PERF_INFO:
                    str = 'PERF_INFO';
                    break;
                case Mnemonic.MODEL_INFO:
                    str = 'MODEL_INFO';
                    break;
                case Mnemonic.SERIAL_NUMBER:
                    str = 'SERIAL_NUMBER';
                    break;
                case Mnemonic.TICKS:
                    str = 'TICKS';
                    break;
                case Mnemonic.MEMSIZE:
                    str = 'MEMSIZE';
                    break;
                case Mnemonic.FLAGS:
                    str = 'FLAGS';
                    break;
                case Mnemonic.IODEV_IDP:
                    str = 'IODEV_IDP';
                    break;
                case Mnemonic.IODEV_IDS:
                    str = 'IODEV_IDS';
                    break;
                case Mnemonic.IODEV_CLS:
                    str = 'IODEV_CLS';
                    break;
                case Mnemonic.IODEV_CLSX:
                    str = 'IODEV_CLSX';
                    break;
                case Mnemonic.END:
                    str = 'END';
                    break;
                // case Mnemonic.JFS:
                //     str = 'JFS';
                //     break;
                // case Mnemonic.JFNS:
                //     str = 'JFNS';
                //     break;
            }

            return str;
        }

        public static opArgs = {
            isImplicitAccumulatorOp: (mnemonic: Mnemonic) => {
                return OpsLists.ByInstructionType.implicitAccumulatorOps.includes(mnemonic);
            },
            isOneRegisterOp: (mnemonic: Mnemonic) => {
                return OpsLists.ByInstructionType.oneRegisterOps.includes(mnemonic);
            },
            isTwoRegisterOp: (mnemonic: Mnemonic) => {
                return OpsLists.ByInstructionType.twoRegisterOps.includes(mnemonic);
            },
            isThreeRegisterOp: (mnemonic: Mnemonic) => {
                return OpsLists.ByInstructionType.threeRegisterOps.includes(mnemonic);
            },
            isZeroArgOp: (mnemonic: Mnemonic) => {
                return OpsLists.ByInstructionType.zeroArgOps.includes(mnemonic);
            },
            isInlineQuadByteOp: (mnemonic: Mnemonic) => {
                return OpsLists.ByInstructionType.inlineQuadByteOps.includes(mnemonic);
            },
            isInlineTriByteOp: (mnemonic: Mnemonic) => {
                return OpsLists.ByInstructionType.inlineTriByteOps.includes(mnemonic);
            },
            isInlineDoubleByteOp: (mnemonic: Mnemonic) => {
                return OpsLists.ByInstructionType.inlineDoubleByteOps.includes(mnemonic);
            },
            isInlineByteOp: (mnemonic: Mnemonic) => {
                return OpsLists.ByInstructionType.inlineByteOps.includes(mnemonic);
            },
            isRegisterAndTriByteOp: (mnemonic: Mnemonic) => {
                return OpsLists.ByInstructionType.xRegisterYTriByteOps.includes(mnemonic);
            },
            isRegisterAndDoubleByteOp: (mnemonic: Mnemonic) => {
                return OpsLists.ByInstructionType.xRegisterYDoubleByteOps.includes(mnemonic);
            },
            isRegisterAndByteOp: (mnemonic: Mnemonic) => {
                return OpsLists.ByInstructionType.xRegisterYByteOps.includes(mnemonic);
            }
        }

        public static parseMnemonicFromString(candidate: string): {
            mnemonic?: Mnemonic,
            isCaseCorrectable: boolean
        } {
            const upper = candidate.toUpperCase();
            const receivedCorrectCase = upper === candidate;
            const index = MnemonicHelper._mnemonicKeyValues.findIndex(x => x.name === upper);
            if (index > -1) {
                if (receivedCorrectCase) {
                    return {
                        mnemonic: MnemonicHelper._mnemonicKeyValues[index].value as Mnemonic,
                        isCaseCorrectable: false
                    };
                } else {
                    return {
                        mnemonic: undefined,
                        isCaseCorrectable: true
                    };
                }
            } else {
                return {
                    mnemonic: undefined,
                    isCaseCorrectable: false
                };
            }
        }

        private static readonly _mnemonicKeyValues = _getMnemonicKeyValues();

        private static _variableRegister1Ops = [
            Mnemonic.ADD,
            Mnemonic.SUB,
            Mnemonic.MULT,
            Mnemonic.DIV,
            Mnemonic.MOD,
            Mnemonic.JMP,
            Mnemonic.BITAND,
            Mnemonic.BITOR,
            Mnemonic.BITXOR,
            Mnemonic.BITLSHIFT,
            Mnemonic.BITRSHIFT,
            Mnemonic.ADDF,
            Mnemonic.SUBF,
            Mnemonic.MULTF,
            Mnemonic.DIVF,
            Mnemonic.ADDV,
            Mnemonic.SUBV,
            Mnemonic.MULTV,
            Mnemonic.DIVV,
            Mnemonic.MODV,
            Mnemonic.MEMREAD,
            Mnemonic.MEMREAD_Q,
            Mnemonic.MEMREAD_D,
            Mnemonic.MEMREAD_X,
            Mnemonic.MEMWRITE,
            Mnemonic.MEMWRITE_Q,
            Mnemonic.MEMWRITE_D,
            Mnemonic.MEMWRITE_X,
            Mnemonic.PUSH,
            Mnemonic.PUSH_Q,
            Mnemonic.PUSH_X,
            Mnemonic.PUSH_D,
            Mnemonic.POP,
            Mnemonic.POP_Q,
            Mnemonic.POP_X,
            Mnemonic.POP_D,
            Mnemonic.JNZ,
            Mnemonic.JZ,
            Mnemonic.COPY,
            Mnemonic.INC,
            Mnemonic.DEC,
            Mnemonic.ABSV,
            Mnemonic.NEGV,
            Mnemonic.VEC,
            Mnemonic.VEC_NEG,
            Mnemonic.MAG,
            Mnemonic.EQ,
            Mnemonic.GT,
            Mnemonic.LT,
            Mnemonic.EQV,
            Mnemonic.GTV,
            Mnemonic.LTV,
            Mnemonic.FLOORF,
            Mnemonic.CEILF,
            Mnemonic.ROUNDF,
            Mnemonic.JNZI,
            Mnemonic.JZI,
            Mnemonic.FLAG_ACK,
            Mnemonic.LOAD_D,
            Mnemonic.LOAD_B,
            Mnemonic.LOAD_X,
            Mnemonic.ISCAN,
            Mnemonic.OSCAN,
            Mnemonic.IOSTAT,
            Mnemonic.IOREAD_B,
            Mnemonic.IOREAD_D,
            Mnemonic.IOREAD_X,
            Mnemonic.IOREAD_Q,
            Mnemonic.IOWRITE_B,
            Mnemonic.IOWRITE_D,
            Mnemonic.IOWRITE_X,
            Mnemonic.IOWRITE_Q,
            Mnemonic.IOFLUSH,
            Mnemonic.PERF_INFO,
            Mnemonic.MODEL_INFO,
            Mnemonic.SERIAL_NUMBER,
            Mnemonic.TICKS,
            Mnemonic.MEMSIZE,
            Mnemonic.FLAGS,
            Mnemonic.IODEV_IDP,
            Mnemonic.IODEV_IDS,
            Mnemonic.IODEV_CLS,
            Mnemonic.IODEV_CLSX
            // Mnemonic.JFS,
            // Mnemonic.JFNS
        ];

        private static _variableRegister2Ops = [
            Mnemonic.MEMREAD,
            Mnemonic.MEMREAD_Q,
            Mnemonic.MEMREAD_D,
            Mnemonic.MEMREAD_X,
            Mnemonic.MEMWRITE,
            Mnemonic.MEMWRITE_Q,
            Mnemonic.MEMWRITE_D,
            Mnemonic.MEMWRITE_X,
            Mnemonic.JNZ,
            Mnemonic.JZ,
            Mnemonic.COPY,
            Mnemonic.ABSV,
            Mnemonic.NEGV,
            Mnemonic.VEC,
            Mnemonic.VEC_NEG,
            Mnemonic.MAG,
            Mnemonic.EQ,
            Mnemonic.GT,
            Mnemonic.LT,
            Mnemonic.EQV,
            Mnemonic.GTV,
            Mnemonic.LTV,
            Mnemonic.FLOORF,
            Mnemonic.CEILF,
            Mnemonic.ROUNDF,
            Mnemonic.ISCAN,
            Mnemonic.OSCAN,
            Mnemonic.IOSTAT,
            Mnemonic.IOREAD_B,
            Mnemonic.IOREAD_D,
            Mnemonic.IOREAD_X,
            Mnemonic.IOREAD_Q,
            Mnemonic.IOWRITE_B,
            Mnemonic.IOWRITE_D,
            Mnemonic.IOWRITE_X,
            Mnemonic.IOWRITE_Q
        ];

        private static _variableRegister3Ops = [
            Mnemonic.EQ,
            Mnemonic.GT,
            Mnemonic.LT,
            Mnemonic.EQV,
            Mnemonic.GTV,
            Mnemonic.LTV
        ];

        private static _inlineQuadValueOps = [
            Mnemonic.LOAD_ACCUMULATOR,
            Mnemonic.LOAD_INSPTR,
            Mnemonic.LOAD_MONDAY,
            Mnemonic.LOAD_TUESDAY,
            Mnemonic.LOAD_WEDNESDAY,
            Mnemonic.LOAD_THURSDAY,
            Mnemonic.LOAD_FRIDAY,
            Mnemonic.LOAD_G7,
            Mnemonic.LOAD_G8,
            Mnemonic.LOAD_G9,
            Mnemonic.LOAD_G10,
            Mnemonic.LOAD_G11,
            Mnemonic.LOAD_G12,
            Mnemonic.LOAD_G13,
            Mnemonic.LOAD_G14,
            Mnemonic.LOAD_STKPTR,
            Mnemonic.JMPI,
            Mnemonic.IPUSH_Q
        ];

        private static _inlineLessThanQuadValueOps = [
            Mnemonic.JNZI,
            Mnemonic.JZI,
            Mnemonic.FLAG_ACK,
            Mnemonic.LOAD_D,
            Mnemonic.LOAD_B,
            Mnemonic.LOAD_X,
            Mnemonic.IPUSH_X,
            Mnemonic.IPUSH_D,
            Mnemonic.IPUSH
            // Mnemonic.JFS,
            // Mnemonic.JFNS
        ];
    }
