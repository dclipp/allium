import { Mnemonic } from './mnemonic';

export const OpsLists = {
    ByInstructionType: {
        implicitAccumulatorOps: [
            Mnemonic.ADD,
            Mnemonic.SUB,
            Mnemonic.MULT,
            Mnemonic.DIV,
            Mnemonic.MOD,
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
            Mnemonic.MODV
        ],
        oneRegisterOps: [
            Mnemonic.JMP,
            Mnemonic.IOFLUSH,
            Mnemonic.PERF_INFO,
            Mnemonic.MODEL_INFO,
            Mnemonic.SERIAL_NUMBER,
            Mnemonic.TICKS,
            Mnemonic.MEMSIZE,
            Mnemonic.INC,
            Mnemonic.DEC,
            Mnemonic.PUSH,
            Mnemonic.PUSH_Q,
            Mnemonic.PUSH_X,
            Mnemonic.PUSH_D,
            Mnemonic.POP,
            Mnemonic.POP_Q,
            Mnemonic.POP_X,
            Mnemonic.POP_D,
            Mnemonic.FLAGS,
            Mnemonic.IODEV_IDP,
            Mnemonic.IODEV_IDS,
            Mnemonic.IODEV_CLS,
            Mnemonic.IODEV_CLSX
        ],
        twoRegisterOps: [
            Mnemonic.COPY,
            Mnemonic.JNZ,
            Mnemonic.JZ,
            Mnemonic.ABSV,
            Mnemonic.NEGV,
            Mnemonic.VEC,
            Mnemonic.VEC_NEG,
            Mnemonic.MAG,
            Mnemonic.FLOORF,
            Mnemonic.CEILF,
            Mnemonic.ROUNDF,
            Mnemonic.MEMREAD,
            Mnemonic.MEMREAD_Q,
            Mnemonic.MEMREAD_D,
            Mnemonic.MEMREAD_X,
            Mnemonic.MEMWRITE,
            Mnemonic.MEMWRITE_Q,
            Mnemonic.MEMWRITE_D,
            Mnemonic.MEMWRITE_X,
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
        ],
        threeRegisterOps: [
            Mnemonic.EQ,
            Mnemonic.GT,
            Mnemonic.LT,
            Mnemonic.EQV,
            Mnemonic.GTV,
            Mnemonic.LTV
        ],
        zeroArgOps: [
            Mnemonic.NO_OP,
            Mnemonic.BITNOT,
            Mnemonic.END
        ],
        xRegisterYTriByteOps: [
            Mnemonic.JNZI,
            Mnemonic.JZI,
            Mnemonic.LOAD_X
        ],
        xRegisterYDoubleByteOps: [
            Mnemonic.LOAD_D
        ],
        xRegisterYByteOps: [
            Mnemonic.FLAG_ACK,
            Mnemonic.LOAD_B
        ],
        inlineQuadByteOps: [
            Mnemonic.LOAD_MONDAY,
            Mnemonic.LOAD_TUESDAY,
            Mnemonic.LOAD_WEDNESDAY,
            Mnemonic.LOAD_THURSDAY,
            Mnemonic.LOAD_FRIDAY,
            Mnemonic.LOAD_ACCUMULATOR,
            Mnemonic.LOAD_INSPTR,
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
        ],
        inlineTriByteOps: [
            Mnemonic.IPUSH_X
        ],
        inlineDoubleByteOps: [
            Mnemonic.IPUSH_D
        ],
        inlineByteOps: [
            Mnemonic.IPUSH
        ]
    }
}