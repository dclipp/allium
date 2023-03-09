export enum Mnemonic {
    ADD,
    SUB,
    MULT,
    DIV,
    MOD,
    MEMREAD,
    MEMREAD_Q,
    MEMREAD_X,
    MEMREAD_D,
    MEMWRITE,
    MEMWRITE_Q,
    MEMWRITE_X,
    MEMWRITE_D,
    PUSH,
    PUSH_Q,
    PUSH_X,
    PUSH_D,
    IPUSH,
    IPUSH_Q,
    IPUSH_X,
    IPUSH_D,
    POP,
    POP_Q,
    POP_X,
    POP_D,
    LOAD_MONDAY,
    LOAD_TUESDAY,
    LOAD_WEDNESDAY,
    LOAD_THURSDAY,
    LOAD_FRIDAY,
    LOAD_ACCUMULATOR,
    LOAD_INSPTR,
    LOAD_G7,
    LOAD_G8,
    LOAD_G9,
    LOAD_G10,
    LOAD_G11,
    LOAD_G12,
    LOAD_G13,
    LOAD_G14,
    LOAD_STKPTR,
    COPY,
    INC,
    DEC,
    BITAND,
    BITOR,
    BITXOR,
    BITLSHIFT,
    BITRSHIFT,
    BITNOT,
    EQ,
    GT,
    LT,
    JMP,
    JNZ,
    JZ,
    JMPI,
    JNZI,
    JZI,
    ADDF,
    SUBF,
    MULTF,
    DIVF,
    FLOORF,
    CEILF,
    ROUNDF,
    FLAG_ACK,
    ADDV,
    SUBV,
    MULTV,
    DIVV,
    MODV,
    EQV,
    GTV,
    LTV,
    ABSV,
    NEGV,
    VEC,
    VEC_NEG,
    MAG,
    LOAD_D,
    LOAD_B,
    LOAD_X,
    NO_OP,
    ISCAN,
    OSCAN,
    IOSTAT,
    IOREAD_B,
    IOREAD_D,
    IOREAD_X,
    IOREAD_Q,
    IOWRITE_B,
    IOWRITE_D,
    IOWRITE_X,
    IOWRITE_Q,
    IOFLUSH,
    PERF_INFO,
    MODEL_INFO,
    SERIAL_NUMBER,
    TICKS,
    MEMSIZE,
    FLAGS,
    IODEV_IDP,
    IODEV_IDS,
    IODEV_CLS,
    IODEV_CLSX,
    END
    // JFS,
    // JFNS
}