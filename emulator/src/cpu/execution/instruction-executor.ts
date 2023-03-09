import
{
    DynamicByteSequence, ByteSequenceLength, QuadByte, TriByte, DoubleByte, Byte, Register,
    NamedRegisterMask, VariableRegisterReference, FlagName, FlagHelper, ByteSequenceCreator, RealNumber,
    RegisterMask
} from '@allium/types';
import { InstructionExecutor, ExecOutput, FlagSet, CpuInfo, IoController, HardwareContext, RegisterSet, MemoryModule, Cpu, IoBus, IoPortStatus, IoPort } from '@allium/arch';
import { AlmExecOutput } from './exec-output';
import { AlmRegisterMutator } from './register-mutator';
import { AlmMemoryMutator } from './memory-mutator';

export class AlmInstructionExecutor implements InstructionExecutor {
    private readonly MAX_BYTE_VALUE = Math.pow(2, 8) - 1;
    private readonly MAX_REG_VALUE = Math.pow(2, 32) - 1;
    private readonly MIN_REG_VALUE = -1 * Math.pow(2, 32);
    private readonly MAX_REG_DOUBLE_VALUE = Math.pow(2, 16) - 1;
    private readonly MAX_REG_TRIPLE_VALUE = Math.pow(2, 24) - 1;

    private readonly MAX_MEMORY_ADDRESS: QuadByte;
    private readonly FLAG_SET: FlagSet;
    private readonly IO_BUS: () => IoBus;
    private readonly CPU_INFO: CpuInfo;
    private readonly GET_CYCLE_COUNT: () => QuadByte;
    private readonly GET_STACK_VALUE: (address: QuadByte, count: ByteSequenceLength) => DynamicByteSequence;

    public constructor(hardwareContext: HardwareContext<RegisterSet, MemoryModule, Cpu<RegisterSet>, IoController>, cycleCountFetcher: () => QuadByte) {
        this.MAX_MEMORY_ADDRESS = hardwareContext.memoryModule.SIZE.computeDifference(1);
        this.FLAG_SET = hardwareContext.flagSet;
        this.IO_BUS = () => { return hardwareContext.getIoBus(); };
        this.CPU_INFO = hardwareContext.cpuInfo;
        this.GET_CYCLE_COUNT = cycleCountFetcher;
        this.GET_STACK_VALUE = (address, count) => {
            if (count === 4) {
                return ByteSequenceCreator.QuadByte([
                    ByteSequenceCreator.Unbox(hardwareContext.memoryModule.read(address)),
                    ByteSequenceCreator.Unbox(hardwareContext.memoryModule.read(address.computeSum(1))),
                    ByteSequenceCreator.Unbox(hardwareContext.memoryModule.read(address.computeSum(2))),
                    ByteSequenceCreator.Unbox(hardwareContext.memoryModule.read(address.computeSum(3)))
                ]);
            } else if (count === 3) {
                return ByteSequenceCreator.TriByte([
                    ByteSequenceCreator.Unbox(hardwareContext.memoryModule.read(address)),
                    ByteSequenceCreator.Unbox(hardwareContext.memoryModule.read(address.computeSum(1))),
                    ByteSequenceCreator.Unbox(hardwareContext.memoryModule.read(address.computeSum(2)))
                ]);
            } else if (count === 2) {
                return ByteSequenceCreator.DoubleByte([
                    ByteSequenceCreator.Unbox(hardwareContext.memoryModule.read(address)),
                    ByteSequenceCreator.Unbox(hardwareContext.memoryModule.read(address.computeSum(1)))
                ]);
            } else {
                return hardwareContext.memoryModule.read(address).clone();
            }
        };
    }

    public ADD(accumulatorValue: DynamicByteSequence, varValue: DynamicByteSequence): ExecOutput {
        const flags = new Array<FlagName>();
        if (this.assertEqualSequenceLength(accumulatorValue, varValue, f => flags.push(f))) {
            const result = accumulatorValue.computeSum(varValue);

            if (result.OVERFLOW) {
                return new AlmExecOutput({
                    mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, result)],
                    flags: [FlagName.Overflow]
                });
            } else {
                return new AlmExecOutput({
                    mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, result)],
                    flags: []
                });
            }
        } else {
            return new AlmExecOutput({
                flags: flags
            });
        }
        // if (result <= this.MAX_REG_VALUE) {
        //     return new AlmExecOutput({
        //         mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, QuadByte.fromInt32(result))],
        //         flags: []
        //     });
        // } else {
        //     return new AlmExecOutput({
        //         mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, QuadByte.fromInt32(result - this.MAX_REG_VALUE))],
        //         flags: [FlagName.Overflow]
        //     });
        // }
    }

    public SUB(accumulatorValue: QuadByte, varValue: DynamicByteSequence): ExecOutput {
        const result = accumulatorValue.computeDifference(varValue);
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, result)],
            flags: this.getFlagsFromByteSeq(result)
        });
        // let output: AlmExecOutput = null;

        // if (this.checkMinMaxQuadByte(result, (correctedQByte: QuadByte) => {
        //     output = new AlmExecOutput({
        //         mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, correctedQByte)],
        //         flags: [FlagName.Underflow]
        //     });
        // }, (correctedQByte: QuadByte) => {
        //     output = new AlmExecOutput({
        //         mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, correctedQByte)],
        //         flags: [FlagName.Overflow]
        //     });
        // })) {
        //     output = new AlmExecOutput({
        //         mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, QuadByte.fromInt32(result))]
        //     });
        // }

        // return output;
    }

    public MULT(accumulatorValue: QuadByte, varValue: DynamicByteSequence): ExecOutput {
        const result = accumulatorValue.computeProduct(varValue);
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, result)],
            flags: this.getFlagsFromByteSeq(result)
        });
    }

    public DIV(accumulatorValue: QuadByte, varValue: DynamicByteSequence): ExecOutput {
        const result = accumulatorValue.computeQuotient(varValue);
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, result)],
            flags: this.getFlagsFromByteSeq(result)
        });
    }

    public MOD(accumulatorValue: QuadByte, varValue: DynamicByteSequence): ExecOutput {
        const result = ByteSequenceCreator.Unbox(accumulatorValue) % ByteSequenceCreator.Unbox(varValue);
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, ByteSequenceCreator.QuadByte(result))],
            flags: []
        });
    }

    public ADDF(accumulatorValue: QuadByte, varValue: QuadByte): ExecOutput {
        const sum = RealNumber.computeSum(varValue, accumulatorValue);
        let output: AlmExecOutput = null;

        if (sum.OVERFLOW) {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, sum)],
                flags: [FlagName.Overflow]
            });
        } else if (sum.UNDERFLOW) {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, sum)],
                flags: [FlagName.Underflow]
            });
        } else {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, sum)]
            });
        }

        return output;
    }

    public SUBF(accumulatorValue: QuadByte, varValue: QuadByte): ExecOutput {
        const diff = RealNumber.computeDifference(accumulatorValue, varValue);
        let output: AlmExecOutput = null;

        if (diff.OVERFLOW) {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, diff)],
                flags: [FlagName.Overflow]
            });
        } else if (diff.UNDERFLOW) {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, diff)],
                flags: [FlagName.Underflow]
            });
        } else {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, diff)]
            });
        }

        return output;
    }

    public MULTF(accumulatorValue: QuadByte, varValue: QuadByte): ExecOutput {
        const prod = RealNumber.computeProduct(accumulatorValue, varValue);
        let output: AlmExecOutput = null;

        if (prod.OVERFLOW) {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, prod)],
                flags: [FlagName.Overflow]
            });
        } else if (prod.UNDERFLOW) {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, prod)],
                flags: [FlagName.Underflow]
            });
        } else {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, prod)]
            });
        }

        return output;
    }

    public DIVF(accumulatorValue: QuadByte, varValue: QuadByte): ExecOutput {
        const quotient = RealNumber.computeQuotient(accumulatorValue, varValue);
        let output: AlmExecOutput = null;

        if (quotient.OVERFLOW) {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, quotient)],
                flags: [FlagName.Overflow]
            });
        } else if (quotient.UNDERFLOW) {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, quotient)],
                flags: [FlagName.Underflow]
            });
        } else {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, quotient)]
            });
        }

        return output;
    }

    public FLOORF(lvalue: QuadByte, destinationRegister: Register): ExecOutput {
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forRegister(destinationRegister, RealNumber.floor(lvalue))]
        });;
    }

    public CEILF(lvalue: QuadByte, destinationRegister: Register): ExecOutput {
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forRegister(destinationRegister, RealNumber.ceil(lvalue))]
        });;
    }

    public ROUNDF(lvalue: QuadByte, destinationRegister: Register): ExecOutput {
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forRegister(destinationRegister, RealNumber.round(lvalue))]
        });;
    }

    public ADDV(accumulatorValue: QuadByte, varValue: DynamicByteSequence): ExecOutput {
        const result = this.fromJsSignedNumber(
            this.toJsSignedNumber(accumulatorValue) + this.toJsSignedNumber(varValue), 4) as QuadByte;
        let output: AlmExecOutput = null;

        if (this.checkMinMaxQuadByte(result, (correctedQByte: QuadByte) => {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, correctedQByte)],
                flags: [FlagName.Underflow]
            });
        }, (correctedQByte: QuadByte) => {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, correctedQByte)],
                flags: [FlagName.Overflow]
            });
        })) {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, result)]
            });
        }

        return output;
    }

    public SUBV(accumulatorValue: QuadByte, varValue: DynamicByteSequence): ExecOutput {
        const result = this.fromJsSignedNumber(
            this.toJsSignedNumber(accumulatorValue) - this.toJsSignedNumber(varValue), 4) as QuadByte;
        let output: AlmExecOutput = null;

        if (this.checkMinMaxQuadByte(result, (correctedQByte: QuadByte) => {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, correctedQByte)],
                flags: [FlagName.Underflow]
            });
        }, (correctedQByte: QuadByte) => {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, correctedQByte)],
                flags: [FlagName.Overflow]
            });
        })) {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, result)]
            });
        }

        return output;
    }

    public MULTV(accumulatorValue: QuadByte, varValue: DynamicByteSequence): ExecOutput {
        const result = this.fromJsSignedNumber(
            this.toJsSignedNumber(accumulatorValue) * this.toJsSignedNumber(varValue), 4) as QuadByte;
        let output: AlmExecOutput = null;

        if (this.checkMinMaxQuadByte(result, (correctedQByte: QuadByte) => {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, correctedQByte)],
                flags: [FlagName.Underflow]
            });
        }, (correctedQByte: QuadByte) => {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, correctedQByte)],
                flags: [FlagName.Overflow]
            });
        })) {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, result)]
            });
        }

        return output;
    }

    public DIVV(accumulatorValue: QuadByte, varValue: DynamicByteSequence): ExecOutput {
        const quotient = this.toJsSignedNumber(accumulatorValue) / this.toJsSignedNumber(varValue);
        const result = quotient < 0 ?
            this.fromJsSignedNumber(Math.ceil(quotient), 4) as QuadByte
            : this.fromJsSignedNumber(Math.floor(quotient), 4) as QuadByte;
        let output: AlmExecOutput = null;

        if (this.checkMinMaxQuadByte(result, (correctedQByte: QuadByte) => {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, correctedQByte)],
                flags: [FlagName.Underflow]
            });
        }, (correctedQByte: QuadByte) => {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, correctedQByte)],
                flags: [FlagName.Overflow]
            });
        })) {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, result)]
            });
        }

        return output;
    }

    public MODV(accumulatorValue: QuadByte, varValue: DynamicByteSequence): ExecOutput {
        const result = this.fromJsSignedNumber(
            this.toJsSignedNumber(accumulatorValue) % this.toJsSignedNumber(varValue), 4);
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, result)]
        });
    }

    public BITAND(accumulatorValue: QuadByte, varValue: DynamicByteSequence): ExecOutput {
        const result = accumulatorValue.computeAnd(varValue);
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, result)],
            flags: this.getFlagsFromByteSeq(result)
        });
    }

    public BITOR(accumulatorValue: QuadByte, varValue: DynamicByteSequence): ExecOutput {
        const result = accumulatorValue.computeOr(varValue);
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, result)]
        });
    }

    public BITXOR(accumulatorValue: QuadByte, varValue: DynamicByteSequence): ExecOutput {
        const result = accumulatorValue.computeXor(varValue);
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, result)]
        });
    }

    public BITLSHIFT(accumulatorValue: QuadByte, shiftAmount: DynamicByteSequence): ExecOutput {
        const result = (ByteSequenceCreator.Unbox(accumulatorValue) << ByteSequenceCreator.Unbox(shiftAmount))
                        & (Math.pow(2, 32) - 1);
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, ByteSequenceCreator.QuadByte(result))]
        });
    }

    public BITRSHIFT(accumulatorValue: QuadByte, shiftAmount: DynamicByteSequence): ExecOutput {
        const result = (ByteSequenceCreator.Unbox(accumulatorValue) >> ByteSequenceCreator.Unbox(shiftAmount))
                        & (Math.pow(2, 32) - 1);
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, ByteSequenceCreator.QuadByte(result))]
        });
    }

    public BITNOT(accumulatorValue: QuadByte): ExecOutput {
        const result = Math.pow(2, 32) - 1 - ByteSequenceCreator.Unbox(accumulatorValue);
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forRegister(Register.Accumulator, ByteSequenceCreator.QuadByte(result))]
        });
    }

    public EQ(lvalue: DynamicByteSequence, rvalue: DynamicByteSequence, destinationRegister: VariableRegisterReference): ExecOutput {
        const result = lvalue.isEqualTo(rvalue) ? 1 : 0;
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forVariable(destinationRegister, ByteSequenceCreator.QuadByte(result))]
        });
    }

    public GT(lvalue: DynamicByteSequence, rvalue: DynamicByteSequence, destinationRegister: VariableRegisterReference): ExecOutput {
        const result = lvalue.isGreaterThan(rvalue) ? 1 : 0;
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forVariable(destinationRegister, ByteSequenceCreator.QuadByte(result))]
        });
    }

    public LT(lvalue: DynamicByteSequence, rvalue: DynamicByteSequence, destinationRegister: VariableRegisterReference): ExecOutput {
        const result = lvalue.isLessThan(rvalue) ? 1 : 0;
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forVariable(destinationRegister, ByteSequenceCreator.QuadByte(result))]
        });
    }

    public EQV(lvalue: DynamicByteSequence, rvalue: DynamicByteSequence, destinationRegister: VariableRegisterReference): ExecOutput {
        const result = this.toJsSignedNumber(lvalue) === this.toJsSignedNumber(rvalue) ? 1 : 0;
        let output: AlmExecOutput = null;

        this.createByteSequenceFromMask(result, destinationRegister.mask, (sequenceValue: DynamicByteSequence) => {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destinationRegister, sequenceValue)]
            });
        }, (correctedValue: DynamicByteSequence) => {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destinationRegister, correctedValue)],
                flags: [FlagName.Overflow]
            });
        }, (correctedValue: DynamicByteSequence) => {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destinationRegister, correctedValue)],
                flags: [FlagName.Underflow]
            });
        });

        return output;
    }

    public GTV(lvalue: DynamicByteSequence, rvalue: DynamicByteSequence, destinationRegister: VariableRegisterReference): ExecOutput {
        const result = this.toJsSignedNumber(lvalue) > this.toJsSignedNumber(rvalue) ? 1 : 0;
        let output: AlmExecOutput = null;

        this.createByteSequenceFromMask(result, destinationRegister.mask, (sequenceValue: DynamicByteSequence) => {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destinationRegister, sequenceValue)]
            });
        }, (correctedValue: DynamicByteSequence) => {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destinationRegister, correctedValue)],
                flags: [FlagName.Overflow]
            });
        }, (correctedValue: DynamicByteSequence) => {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destinationRegister, correctedValue)],
                flags: [FlagName.Underflow]
            });
        });

        return output;
    }

    public LTV(lvalue: DynamicByteSequence, rvalue: DynamicByteSequence, destinationRegister: VariableRegisterReference): ExecOutput {
        const result = this.toJsSignedNumber(lvalue) < this.toJsSignedNumber(rvalue) ? 1 : 0;
        let output: AlmExecOutput = null;

        this.createByteSequenceFromMask(result, destinationRegister.mask, (sequenceValue: DynamicByteSequence) => {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destinationRegister, sequenceValue)]
            });
        }, (correctedValue: DynamicByteSequence) => {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destinationRegister, correctedValue)],
                flags: [FlagName.Overflow]
            });
        }, (correctedValue: DynamicByteSequence) => {
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destinationRegister, correctedValue)],
                flags: [FlagName.Underflow]
            });
        });

        return output;
    }

    public JMP(destinationAddress: QuadByte): ExecOutput {
        if (destinationAddress.isLessThanOrEqualTo(this.MAX_MEMORY_ADDRESS)) {
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.InstructionPtr, destinationAddress)],
                flags: []
            });
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        }
    }

    public JNZ(varValue: DynamicByteSequence, destinationAddress: QuadByte): ExecOutput {
        if (destinationAddress.isLessThanOrEqualTo(this.MAX_MEMORY_ADDRESS)) {
            if (!varValue.isEqualTo(0)) {
                return new AlmExecOutput({
                    mutators: [AlmRegisterMutator.forRegister(Register.InstructionPtr, destinationAddress)],
                    flags: []
                });
            } else {
                return new AlmExecOutput({
                    mutators: [],
                    flags: []
                });
            }
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        }
    }

    public JZ(varValue: DynamicByteSequence, destinationAddress: QuadByte): ExecOutput {
        if (destinationAddress.isLessThanOrEqualTo(this.MAX_MEMORY_ADDRESS)) {
            if (varValue.isEqualTo(0)) {
                return new AlmExecOutput({
                    mutators: [AlmRegisterMutator.forRegister(Register.InstructionPtr, destinationAddress)],
                    flags: []
                });
            } else {
                return new AlmExecOutput({
                    mutators: [],
                    flags: []
                });
            }
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        }
    }

    public JMPI(inlineDestinationAddress: QuadByte): ExecOutput {
        const targetValue = ByteSequenceCreator.Unbox(inlineDestinationAddress);

        if (targetValue <= this.MAX_REG_VALUE && targetValue >= this.MIN_REG_VALUE && targetValue <= ByteSequenceCreator.Unbox(this.MAX_MEMORY_ADDRESS)) {
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(Register.InstructionPtr, ByteSequenceCreator.QuadByte(targetValue))],//TODO
                flags: []
            });
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        }
    }

    public JNZI(varValue: DynamicByteSequence, inlineDestinationAddress: TriByte): ExecOutput {
        if (inlineDestinationAddress.isLessThanOrEqualTo(this.MAX_MEMORY_ADDRESS)) {
            if (!varValue.isEqualTo(0)) {
                return new AlmExecOutput({
                    mutators: [AlmRegisterMutator.forRegister(Register.InstructionPtr, ByteSequenceCreator.QuadByte(ByteSequenceCreator.Unbox(inlineDestinationAddress)))],
                    flags: []
                });
            } else {
                return new AlmExecOutput({
                    mutators: [],
                    flags: []
                });
            }
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        }
    }

    public JZI(varValue: DynamicByteSequence, inlineDestinationAddress: TriByte): ExecOutput {
        if (inlineDestinationAddress.isLessThanOrEqualTo(this.MAX_MEMORY_ADDRESS)) {
            if (varValue.isEqualTo(0)) {
                return new AlmExecOutput({
                    mutators: [AlmRegisterMutator.forRegister(Register.InstructionPtr, ByteSequenceCreator.QuadByte(ByteSequenceCreator.Unbox(inlineDestinationAddress)))],
                    flags: []
                });
            } else {
                return new AlmExecOutput({
                    mutators: [],
                    flags: []
                });
            }
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        }
    }

    public FLAG_ACK(destRegister: VariableRegisterReference, flagCode: DynamicByteSequence): ExecOutput {
        const code = ByteSequenceCreator.Unbox(flagCode);
        let flag = FlagName.Overflow;
        if (FlagHelper.TryGetFlagFromNumber(code, (flagName: FlagName) => {
            flag = flagName;
        })) {
            const isFlagSet = this.FLAG_SET.acknowledge(flag);
            const val = isFlagSet ? 1 : 0;
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destRegister, ByteSequenceCreator.QuadByte(val))],
                flags: destRegister.register === Register.InstructionPtr ? [] : []
            });
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.IllegalArgument]
            });
        }
    }

    public LOAD_MONDAY(varValue: DynamicByteSequence): ExecOutput {
        return this.loadRegisterFull(varValue, Register.Monday);
    }

    public LOAD_TUESDAY(varValue: DynamicByteSequence): ExecOutput {
        return this.loadRegisterFull(varValue, Register.Tuesday);
    }

    public LOAD_WEDNESDAY(varValue: DynamicByteSequence): ExecOutput {
        return this.loadRegisterFull(varValue, Register.Wednesday);
    }

    public LOAD_THURSDAY(varValue: DynamicByteSequence): ExecOutput {
        return this.loadRegisterFull(varValue, Register.Thursday);
    }

    public LOAD_FRIDAY(varValue: DynamicByteSequence): ExecOutput {
        return this.loadRegisterFull(varValue, Register.Friday);
    }

    public LOAD_INSPTR(varValue: DynamicByteSequence): ExecOutput {
        return this.loadRegisterFull(varValue, Register.InstructionPtr);
    }

    public LOAD_ACCUMULATOR(varValue: DynamicByteSequence): ExecOutput {
        return this.loadRegisterFull(varValue, Register.Accumulator);
    }

    public LOAD_G7(varValue: DynamicByteSequence): ExecOutput {
        return this.loadRegisterFull(varValue, Register.G7);
    }

    public LOAD_G8(varValue: DynamicByteSequence): ExecOutput {
        return this.loadRegisterFull(varValue, Register.G8);
    }

    public LOAD_G9(varValue: DynamicByteSequence): ExecOutput {
        return this.loadRegisterFull(varValue, Register.G9);
    }

    public LOAD_G10(varValue: DynamicByteSequence): ExecOutput {
        return this.loadRegisterFull(varValue, Register.G10);
    }

    public LOAD_G11(varValue: DynamicByteSequence): ExecOutput {
        return this.loadRegisterFull(varValue, Register.G11);
    }

    public LOAD_G12(varValue: DynamicByteSequence): ExecOutput {
        return this.loadRegisterFull(varValue, Register.G12);
    }

    public LOAD_G13(varValue: DynamicByteSequence): ExecOutput {
        return this.loadRegisterFull(varValue, Register.G13);
    }

    public LOAD_G14(varValue: DynamicByteSequence): ExecOutput {
        return this.loadRegisterFull(varValue, Register.G14);
    }

    public LOAD_STKPTR(varValue: DynamicByteSequence): ExecOutput {
        return this.loadRegisterFull(varValue, Register.StackPtr);
    }

    public LOAD_D(destinationRegister: VariableRegisterReference, inlineValue: DoubleByte): ExecOutput {
        if (destinationRegister.size === 2) {
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destinationRegister, inlineValue)],
                flags: destinationRegister.register === Register.InstructionPtr ? [] : []
            });
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }

    public LOAD_B(destinationRegister: VariableRegisterReference, inlineValue: Byte): ExecOutput {
        if (destinationRegister.size === 1) {
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destinationRegister, inlineValue)],
                flags: destinationRegister.register === Register.InstructionPtr ? [] : []
            });
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }

    public LOAD_X(destinationRegister: VariableRegisterReference, inlineValue: TriByte): ExecOutput {
        if (destinationRegister.size === 3) {
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destinationRegister, inlineValue)],
                flags: destinationRegister.register === Register.InstructionPtr ? [] : []
            });
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }

    public COPY(srcRegisterValue: DynamicByteSequence, destRegister: VariableRegisterReference): ExecOutput {
        if (srcRegisterValue.LENGTH !== destRegister.size) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        } else {
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destRegister, srcRegisterValue)],
                flags: destRegister.register === Register.InstructionPtr ? [] : []
            });
        }
    }

    public INC(registerValue: DynamicByteSequence, register: VariableRegisterReference): ExecOutput {
        const result = registerValue.computeSum(1);
        if (result.OVERFLOW) {
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(register.register, result)],
                flags: [FlagName.Overflow]
            });
        } else {
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(register.register, result)],
                flags: []
            });
        }
    }

    public DEC(registerValue: DynamicByteSequence, register: VariableRegisterReference): ExecOutput {
        const result = registerValue.computeDifference(1);
        if (result.UNDERFLOW) {
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(register.register, result)],
                flags: [FlagName.Underflow]
            });
        } else {
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(register.register, result)],
                flags: []
            });
        }
    }
    
    public MEMREAD(memoryValue: Byte, destRegister: VariableRegisterReference): ExecOutput {
        return new AlmExecOutput({
            mutators: [AlmRegisterMutator.forVariable(destRegister, memoryValue)],
            flags: destRegister.register === Register.InstructionPtr ? [] : []
        });
    }

    public MEMREAD_Q(memoryValue: QuadByte, destRegister: VariableRegisterReference): ExecOutput {
        if (destRegister.size === 4) {
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destRegister, memoryValue)],
                flags: []
            });
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }

    public MEMREAD_X(memoryValue: TriByte, destRegister: VariableRegisterReference): ExecOutput {
        if (destRegister.size === 3) {
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destRegister, memoryValue)],
                flags: []
            });
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }

    public MEMREAD_D(memoryValue: DoubleByte, destRegister: VariableRegisterReference): ExecOutput {
        if (destRegister.size === 2) {
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destRegister, memoryValue)],
                flags: []
            });
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }

    public MEMWRITE(address: QuadByte, byteValue: Byte): ExecOutput {
        if (address.isLessThanOrEqualTo(this.MAX_MEMORY_ADDRESS)) {
            return new AlmExecOutput({
                mutators: [AlmMemoryMutator.create(address, byteValue)],
                flags: []
            });
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        }
    }

    public MEMWRITE_Q(address: QuadByte, value: QuadByte): ExecOutput {
        if (value.LENGTH !== 4) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        } else if (address.isLessThanOrEqualTo(this.MAX_MEMORY_ADDRESS.computeDifference(4))) {
            return new AlmExecOutput({
                mutators: [
                    AlmMemoryMutator.create(address, value.getByte(1)),
                    AlmMemoryMutator.create(address.computeSum(1), value.getByte(2)),
                    AlmMemoryMutator.create(address.computeSum(2), value.getByte(3)),
                    AlmMemoryMutator.create(address.computeSum(3), value.getByte(4)),
                ],
                flags: []
            });
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        }
    }

    public MEMWRITE_X(address: QuadByte, value: TriByte): ExecOutput {
        if (value.LENGTH !== 3) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        } else if (address.isLessThanOrEqualTo(this.MAX_MEMORY_ADDRESS.computeDifference(3))) {
            return new AlmExecOutput({
                mutators: [
                    AlmMemoryMutator.create(address, value.getByte(1)),
                    AlmMemoryMutator.create(address.computeSum(1), value.getByte(2)),
                    AlmMemoryMutator.create(address.computeSum(2), value.getByte(3))
                ],
                flags: []
            });
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        }
    }

    public MEMWRITE_D(address: QuadByte, value: DoubleByte): ExecOutput {
        if (value.LENGTH !== 2) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        } else if (address.isLessThanOrEqualTo(this.MAX_MEMORY_ADDRESS.computeDifference(2))) {
            return new AlmExecOutput({
                mutators: [
                    AlmMemoryMutator.create(address, value.getByte(1)),
                    AlmMemoryMutator.create(address.computeSum(1), value.getByte(2))
                ],
                flags: []
            });
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        }
    }

    public PUSH(registerValue: Byte, stackAddress: QuadByte): ExecOutput {
        if (this.MAX_MEMORY_ADDRESS.computeDifference(1).isEqualTo(stackAddress)) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        } else {
            return new AlmExecOutput({
                mutators: [
                    AlmMemoryMutator.create(stackAddress, registerValue),
                    AlmRegisterMutator.forRegister(Register.StackPtr, stackAddress.computeSum(1))
                ],
                flags: []
            });
        }
    }

    public PUSH_Q(registerValue: QuadByte, stackAddress: QuadByte): ExecOutput {
        if (this.MAX_MEMORY_ADDRESS.computeDifference(4).isEqualTo(stackAddress)) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        } else {
            return new AlmExecOutput({
                mutators: [
                    AlmMemoryMutator.create(stackAddress, registerValue.getByte(1)),
                    AlmMemoryMutator.create(stackAddress.computeSum(1), registerValue.getByte(2)),
                    AlmMemoryMutator.create(stackAddress.computeSum(2), registerValue.getByte(3)),
                    AlmMemoryMutator.create(stackAddress.computeSum(3), registerValue.getByte(4)),
                    AlmRegisterMutator.forRegister(Register.StackPtr, stackAddress.computeSum(4))
                ],
                flags: []
            });
        }
    }

    public PUSH_X(registerValue: TriByte, stackAddress: QuadByte): ExecOutput {
        if (this.MAX_MEMORY_ADDRESS.computeDifference(3).isEqualTo(stackAddress)) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        } else {
            return new AlmExecOutput({
                mutators: [
                    AlmMemoryMutator.create(stackAddress, registerValue.getByte(1)),
                    AlmMemoryMutator.create(stackAddress.computeSum(1), registerValue.getByte(2)),
                    AlmMemoryMutator.create(stackAddress.computeSum(2), registerValue.getByte(3)),
                    AlmRegisterMutator.forRegister(Register.StackPtr, stackAddress.computeSum(3))
                ],
                flags: []
            });
        }
    }

    public PUSH_D(registerValue: DoubleByte, stackAddress: QuadByte): ExecOutput {
        if (this.MAX_MEMORY_ADDRESS.computeDifference(2).isEqualTo(stackAddress)) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        } else {
            return new AlmExecOutput({
                mutators: [
                    AlmMemoryMutator.create(stackAddress, registerValue.getByte(1)),
                    AlmMemoryMutator.create(stackAddress.computeSum(1), registerValue.getByte(2)),
                    AlmRegisterMutator.forRegister(Register.StackPtr, stackAddress.computeSum(2))
                ],
                flags: []
            });
        }
    }

    public IPUSH(inlineValue: Byte, stackAddress: QuadByte): ExecOutput {
        if (this.MAX_MEMORY_ADDRESS.computeDifference(1).isEqualTo(stackAddress)) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        } else {
            return new AlmExecOutput({
                mutators: [
                    AlmMemoryMutator.create(stackAddress, inlineValue),
                    AlmRegisterMutator.forRegister(Register.StackPtr, stackAddress.computeSum(1))
                ],
                flags: []
            });
        }
    }
    
    public IPUSH_Q(inlineValue: QuadByte, stackAddress: QuadByte): ExecOutput {
        if (this.MAX_MEMORY_ADDRESS.computeDifference(4).isEqualTo(stackAddress)) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        } else {
            return new AlmExecOutput({
                mutators: [
                    AlmMemoryMutator.create(stackAddress, inlineValue.getByte(1)),
                    AlmMemoryMutator.create(stackAddress.computeSum(1), inlineValue.getByte(2)),
                    AlmMemoryMutator.create(stackAddress.computeSum(2), inlineValue.getByte(3)),
                    AlmMemoryMutator.create(stackAddress.computeSum(3), inlineValue.getByte(4)),
                    AlmRegisterMutator.forRegister(Register.StackPtr, stackAddress.computeSum(4))
                ],
                flags: []
            });
        }
    }
    
    public IPUSH_X(inlineValue: TriByte, stackAddress: QuadByte): ExecOutput {
        if (this.MAX_MEMORY_ADDRESS.computeDifference(3).isEqualTo(stackAddress)) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        } else {
            return new AlmExecOutput({
                mutators: [
                    AlmMemoryMutator.create(stackAddress, inlineValue.getByte(1)),
                    AlmMemoryMutator.create(stackAddress.computeSum(1), inlineValue.getByte(2)),
                    AlmMemoryMutator.create(stackAddress.computeSum(2), inlineValue.getByte(3)),
                    AlmRegisterMutator.forRegister(Register.StackPtr, stackAddress.computeSum(3))
                ],
                flags: []
            });
        }
    }
    
    public IPUSH_D(inlineValue: DoubleByte, stackAddress: QuadByte): ExecOutput {
        if (this.MAX_MEMORY_ADDRESS.computeDifference(2).isEqualTo(stackAddress)) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        } else {
            return new AlmExecOutput({
                mutators: [
                    AlmMemoryMutator.create(stackAddress, inlineValue.getByte(1)),
                    AlmMemoryMutator.create(stackAddress.computeSum(1), inlineValue.getByte(2)),
                    AlmRegisterMutator.forRegister(Register.StackPtr, stackAddress.computeSum(2))
                ],
                flags: []
            });
        }
    }
    

    public POP(destinationRegister: VariableRegisterReference, stackAddress: QuadByte): ExecOutput {
        if (destinationRegister.size !== 1) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        } else if (stackAddress.isLessThan(1)) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        } else {
            return new AlmExecOutput({
                mutators: [
                    AlmRegisterMutator.forVariable(destinationRegister, this.GET_STACK_VALUE(stackAddress, 1)),
                    AlmRegisterMutator.forRegister(Register.StackPtr, stackAddress.computeDifference(1))
                ],
                flags: []
            });
        }
    }

    public POP_Q(destinationRegister: VariableRegisterReference, stackAddress: QuadByte): ExecOutput {
        if (destinationRegister.size !== 4) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        } else if (stackAddress.isLessThan(4)) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        } else {
            return new AlmExecOutput({
                mutators: [
                    AlmRegisterMutator.forVariable(destinationRegister, this.GET_STACK_VALUE(stackAddress, 4)),
                    AlmRegisterMutator.forRegister(Register.StackPtr, stackAddress.computeDifference(4))
                ],
                flags: []
            });
        }
    }

    public POP_X(destinationRegister: VariableRegisterReference, stackAddress: QuadByte): ExecOutput {
        if (destinationRegister.size !== 3) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        } else if (stackAddress.isLessThan(3)) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        } else {
            return new AlmExecOutput({
                mutators: [
                    AlmRegisterMutator.forVariable(destinationRegister, this.GET_STACK_VALUE(stackAddress, 3)),
                    AlmRegisterMutator.forRegister(Register.StackPtr, stackAddress.computeDifference(3))
                ],
                flags: []
            });
        }
    }

    public POP_D(destinationRegister: VariableRegisterReference, stackAddress: QuadByte): ExecOutput {
        if (destinationRegister.size !== 2) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        } else if (stackAddress.isLessThan(2)) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        } else {
            return new AlmExecOutput({
                mutators: [
                    AlmRegisterMutator.forVariable(destinationRegister, this.GET_STACK_VALUE(stackAddress, 2)),
                    AlmRegisterMutator.forRegister(Register.StackPtr, stackAddress.computeDifference(2))
                ],
                flags: []
            });
        }
    }

    public ABSV(srcRegisterValue: DynamicByteSequence, destRegister: VariableRegisterReference): ExecOutput {
        if (srcRegisterValue.LENGTH !== destRegister.size) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        } else {
            const result = this.fromJsSignedNumber(Math.abs(this.toJsSignedNumber(srcRegisterValue)), srcRegisterValue.LENGTH);
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destRegister, result)],
                flags: destRegister.register === Register.InstructionPtr ? [] : []
            });
        }
    }

    public NEGV(srcRegisterValue: DynamicByteSequence, destRegister: VariableRegisterReference): ExecOutput {
        if (srcRegisterValue.LENGTH !== destRegister.size) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        } else {
            const v = this.toJsSignedNumber(srcRegisterValue);
            const result = v < 0 ? this.fromJsSignedNumber(v, srcRegisterValue.LENGTH)
                : this.fromJsSignedNumber(-1 * v, srcRegisterValue.LENGTH);
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destRegister, result)],
                flags: destRegister.register === Register.InstructionPtr ? [] : []
            });
        }
    }

    public VEC(srcRegisterValue: DynamicByteSequence, destRegister: VariableRegisterReference): ExecOutput {
        if (srcRegisterValue.LENGTH !== destRegister.size) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        } else {
            const max = Math.pow(2, 31) - 1;
            const srcI32 = ByteSequenceCreator.Unbox(srcRegisterValue);
            const flags = new Array<FlagName>();

            let result = 0;
            if (srcI32 > max) {
                result = ((srcI32 - max) << 1) & max;
                flags.push(FlagName.Overflow);
            } else {
                result = (srcI32 << 1) & max;
            }

            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destRegister, ByteSequenceCreator.QuadByte(result))],
                flags: flags.length > 0 ? flags : []
            });
        }
    }

    public VEC_NEG(srcRegisterValue: DynamicByteSequence, destRegister: VariableRegisterReference): ExecOutput {
        if (srcRegisterValue.LENGTH !== destRegister.size) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        } else {
            const flags = new Array<FlagName>();
            flags.push(FlagName.Overflow);
            if (srcRegisterValue.isEqualTo(0)) {
                return new AlmExecOutput({
                    mutators: [AlmRegisterMutator.forVariable(destRegister, srcRegisterValue)],
                    flags: flags.length > 0 ? flags : []
                });
            } else {
                const max = Math.pow(2, 31);
                const val = ByteSequenceCreator.Unbox(srcRegisterValue) - 1;

                let result = 0;
                if (val > max - 1) {
                    result = (((val - max) << 1) & (max - 1)) + 1;
                    flags.push(FlagName.Underflow);
                } else {
                    result = ((val << 1) & (max - 1)) + 1;
                }

                return new AlmExecOutput({
                    mutators: [AlmRegisterMutator.forVariable(destRegister, ByteSequenceCreator.QuadByte(result))],
                    flags: flags.length > 0 ? flags : []
                });
            }
        }
    }

    public MAG(srcRegisterValue: DynamicByteSequence, destRegister: VariableRegisterReference): ExecOutput {
        if (srcRegisterValue.LENGTH !== destRegister.size) {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        } else {
            const result = Math.abs(this.toJsSignedNumber(srcRegisterValue));
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destRegister, ByteSequenceCreator.QuadByte(result))],
                flags: destRegister.register === Register.InstructionPtr ? [] : []
            });
        }
    }

    public NO_OP(): ExecOutput {
        return new AlmExecOutput({
            mutators: [],
            flags: []
        });
    }

    public ISCAN(channel: Byte, destinationRegister: VariableRegisterReference): ExecOutput {
        if (destinationRegister.size === 1) {
            const portIndex = ByteSequenceCreator.Unbox(channel);
            if (this.IO_BUS().getPortStatus(portIndex) === IoPortStatus.Null) {
                // console.log(`PORT IN NULL`)
                return new AlmExecOutput({
                    mutators: [],
                    flags: [FlagName.IORejection]
                });
            } else {
                const value = this.IO_BUS().getPort(portIndex).getHostReadableLength();
                // console.log(`ISCAN=${value}`)
                return new AlmExecOutput({
                    mutators: [AlmRegisterMutator.forVariable(destinationRegister, ByteSequenceCreator.Byte(value))],
                    flags: []
                });
            }
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }
    
    public OSCAN(channel: Byte, destinationRegister: VariableRegisterReference): ExecOutput {
        if (destinationRegister.size === 1) {
            const portIndex = ByteSequenceCreator.Unbox(channel);
            if (this.IO_BUS().getPortStatus(portIndex) === IoPortStatus.Null) {
                return new AlmExecOutput({
                    mutators: [],
                    flags: [FlagName.IORejection]
                });
            } else {
                const value = this.IO_BUS().getPort(portIndex).getClientReadableLength();
                return new AlmExecOutput({
                    mutators: [AlmRegisterMutator.forVariable(destinationRegister, ByteSequenceCreator.Byte(value))],
                    flags: []
                });
            }
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }
    
    public IOSTAT(channel: Byte, destinationRegister: VariableRegisterReference): ExecOutput {
        if (destinationRegister.size === 1) {
            // console.log(`Eai=${JSON.stringify(this.IO_BUS().getActiveIndices(), null, 2)}`);
            const status = this.IO_BUS().getPortStatus(ByteSequenceCreator.Unbox(channel));
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(destinationRegister, ByteSequenceCreator.Byte(status.valueOf()))],
                flags: []
            });
        } else {
            // console.log('RSM')
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }
    
	public IOREAD_B(channel: Byte, destinationRegister: VariableRegisterReference): ExecOutput {
        if (destinationRegister.size === 1) {
            const port = this.getActiveIoPortOrNull(ByteSequenceCreator.Unbox(channel));
            const hasDevice = !!port;
            const readableLength = hasDevice ? port.getHostReadableLength() : 0;
            if (hasDevice && readableLength === 1) {
                const value = port.readAsHost();
                return new AlmExecOutput({
                    mutators: [AlmRegisterMutator.forVariable(destinationRegister, value)],
                    flags: []
                });
            } else {
                return new AlmExecOutput({
                    mutators: [],
                    flags: [FlagName.IORejection]
                });
            }
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }
    
	public IOREAD_D(channel: Byte, destinationRegister: VariableRegisterReference): ExecOutput {
        if (destinationRegister.size === 2) {
            const port = this.getActiveIoPortOrNull(ByteSequenceCreator.Unbox(channel));
            const hasDevice = !!port;
            const readableLength = hasDevice ? port.getHostReadableLength() : 0;
            if (hasDevice && readableLength === 2) {
                const b0 = port.readAsHost();
                const b1 = port.readAsHost();
                const value = ByteSequenceCreator.DoubleByte([ByteSequenceCreator.Unbox(b0), ByteSequenceCreator.Unbox(b1)]);
                return new AlmExecOutput({
                    mutators: [AlmRegisterMutator.forVariable(destinationRegister, value)],
                    flags: []
                });
            } else {
                return new AlmExecOutput({
                    mutators: [],
                    flags: [FlagName.IORejection]
                });
            }
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }
    
	public IOREAD_X(channel: Byte, destinationRegister: VariableRegisterReference): ExecOutput {
        if (destinationRegister.size === 3) {
            const port = this.getActiveIoPortOrNull(ByteSequenceCreator.Unbox(channel));
            const hasDevice = !!port;
            const readableLength = hasDevice ? port.getHostReadableLength() : 0;
            if (hasDevice && readableLength === 3) {
                const b0 = port.readAsHost();
                const b1 = port.readAsHost();
                const b2 = port.readAsHost();
                const value = ByteSequenceCreator.DoubleByte([
                    ByteSequenceCreator.Unbox(b0),
                    ByteSequenceCreator.Unbox(b1),
                    ByteSequenceCreator.Unbox(b2)
                ]);
                return new AlmExecOutput({
                    mutators: [AlmRegisterMutator.forVariable(destinationRegister, value)],
                    flags: []
                });
            } else {
                return new AlmExecOutput({
                    mutators: [],
                    flags: [FlagName.IORejection]
                });
            }
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }
    
	public IOREAD_Q(channel: Byte, destinationRegister: VariableRegisterReference): ExecOutput {
        if (destinationRegister.size === 4) {
            const port = this.getActiveIoPortOrNull(ByteSequenceCreator.Unbox(channel));
            const hasDevice = !!port;
            const readableLength = hasDevice ? port.getHostReadableLength() : 0;
            if (hasDevice && readableLength >= 4) {
                // const b0 = this.getActiveIoPortOrNull(ByteSequenceCreator.Unbox(channel))!.readAsHost();
                // const b1 = this.getActiveIoPortOrNull(ByteSequenceCreator.Unbox(channel))!.readAsHost();
                // const b2 = this.getActiveIoPortOrNull(ByteSequenceCreator.Unbox(channel))!.readAsHost();
                // const b3 = this.getActiveIoPortOrNull(ByteSequenceCreator.Unbox(channel))!.readAsHost();
                const b0 = port.readAsHost();
                const b1 = port.readAsHost();
                const b2 = port.readAsHost();
                const b3 = port.readAsHost();
                // console.log(`b0=${b0};b1=${b1};b2=${b2};b3=${b3}`)
                const value = ByteSequenceCreator.QuadByte([
                    ByteSequenceCreator.Unbox(b0),
                    ByteSequenceCreator.Unbox(b1),
                    ByteSequenceCreator.Unbox(b2),
                    ByteSequenceCreator.Unbox(b3)
                ]);
                // const value = ByteSequenceCreator.QuadByte(16909060);
                return new AlmExecOutput({
                    mutators: [AlmRegisterMutator.forVariable(destinationRegister, value)],
                    flags: []
                });
            } else {
                return new AlmExecOutput({
                    mutators: [],
                    flags: [FlagName.IORejection]
                });
            }
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }
    
	public IOWRITE_B(channel: Byte, srcRegisterValue: DynamicByteSequence): ExecOutput {
        if (srcRegisterValue.LENGTH === 1) {
            const port = this.getActiveIoPortOrNull(ByteSequenceCreator.Unbox(channel));
            const hasDevice = !!port;
            const settableLength = hasDevice ? port.getHostWritableLength() : 0;
            if (hasDevice && settableLength >= 1) {
                const bytes = [
                    srcRegisterValue.getByte(1)
                ];

                let success = false;
                try {
                    success = port.writeAsHost(bytes[0]);
                } catch (ex) { }
                // console.log(`IOWB success=${success}`)
                return success ? new AlmExecOutput() : new AlmExecOutput({
                    flags: [FlagName.IORejection]
                });
            } else {
                return new AlmExecOutput({
                    mutators: [],
                    flags: [FlagName.IORejection]
                });
            }
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }
    
	public IOWRITE_D(channel: Byte, srcRegisterValue: DynamicByteSequence): ExecOutput {
        if (srcRegisterValue.LENGTH === 2) {
            const port = this.getActiveIoPortOrNull(ByteSequenceCreator.Unbox(channel));
            const hasDevice = !!port;
            const settableLength = hasDevice ? port.getHostWritableLength() : 0;
            if (hasDevice && settableLength >= 2) {
                const bytes = [
                    srcRegisterValue.getByte(1),
                    srcRegisterValue.getByte(2)
                ];

                let success = false;
                try {
                    success = port.writeAsHost(bytes[0]);
                    if (success) {
                        success = port.writeAsHost(bytes[1]);
                    }
                } catch (ex) { }
                
                return success ? new AlmExecOutput() : new AlmExecOutput({
                    flags: [FlagName.IORejection]
                });
            } else {
                return new AlmExecOutput({
                    mutators: [],
                    flags: [FlagName.IORejection]
                });
            }
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }
    
	public IOWRITE_X(channel: Byte, srcRegisterValue: DynamicByteSequence): ExecOutput {
        if (srcRegisterValue.LENGTH === 3) {
            const port = this.getActiveIoPortOrNull(ByteSequenceCreator.Unbox(channel));
            const hasDevice = !!port;
            const settableLength = hasDevice ? port.getHostWritableLength() : 0;
            if (hasDevice && settableLength >= 3) {
                const bytes = [
                    srcRegisterValue.getByte(1),
                    srcRegisterValue.getByte(2),
                    srcRegisterValue.getByte(3)
                ];

                let success = false;
                try {
                    success = port.writeAsHost(bytes[0]);
                    if (success) {
                        success = port.writeAsHost(bytes[1]);
                        if (success) {
                            success = port.writeAsHost(bytes[2]);
                        }
                    }
                } catch (ex) { }
                
                return success ? new AlmExecOutput() : new AlmExecOutput({
                    flags: [FlagName.IORejection]
                });
            } else {
                return new AlmExecOutput({
                    mutators: [],
                    flags: [FlagName.IORejection]
                });
            }
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }
    
	public IOWRITE_Q(channel: Byte, srcRegisterValue: DynamicByteSequence): ExecOutput {
        if (srcRegisterValue.LENGTH === 4) {
            const port = this.getActiveIoPortOrNull(ByteSequenceCreator.Unbox(channel));
            const hasDevice = !!port;
            const settableLength = hasDevice ? port.getHostWritableLength() : 0;
            if (hasDevice && settableLength === 4) {
                const bytes = [
                    srcRegisterValue.getByte(1),
                    srcRegisterValue.getByte(2),
                    srcRegisterValue.getByte(3),
                    srcRegisterValue.getByte(4)
                ];

                let success = false;
                try {
                    success = port.writeAsHost(bytes[0]);
                    if (success) {
                        success = port.writeAsHost(bytes[1]);
                        if (success) {
                            success = port.writeAsHost(bytes[2]);
                            if (success) {
                                success = port.writeAsHost(bytes[3]);
                            }
                        }
                    }
                } catch (ex) {
                    // console.log(`IOWQ EXC1=${ex}`)
                }
                // console.log(`IOWQ success=${success}`)
                return success ? new AlmExecOutput() : new AlmExecOutput({
                    flags: [FlagName.IORejection]
                });
            } else {
                // console.log(`IOWQ settablelength mm=${settableLength}`)
                return new AlmExecOutput({
                    mutators: [],
                    flags: [FlagName.IORejection]
                });
            }
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }

    public IOFLUSH(channel: Byte): ExecOutput {
        let success = false;
        try {
            const port = this.getActiveIoPortOrNull(ByteSequenceCreator.Unbox(channel));
            if (!!port) {
                port.flushAsHost();
                success = true;
            }
        } catch (ex) { }

        if (success) {
            return new AlmExecOutput();
        } else {
            return new AlmExecOutput({
                flags: [FlagName.IORejection]
            });
        }
    }

    public PERF_INFO(destinationRegister: VariableRegisterReference): ExecOutput {
        if (destinationRegister.size === 4) {
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(
                    destinationRegister, this.CPU_INFO.CLOCK_SPEED)
                ]
            })
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }

    public MODEL_INFO(destinationRegister: VariableRegisterReference): ExecOutput {
        if (destinationRegister.size === 4) {
            const b1 = ByteSequenceCreator.Unbox(this.CPU_INFO.MODEL_IDENTIFIER.getByte(1));
            const b2 = ByteSequenceCreator.Unbox(this.CPU_INFO.MODEL_IDENTIFIER.getByte(2));
            const b3 = ByteSequenceCreator.Unbox(this.CPU_INFO.FEATURE_MASK_1);
            const b4 = ByteSequenceCreator.Unbox(this.CPU_INFO.FEATURE_MASK_2);
            const qb = ByteSequenceCreator.QuadByte(
                [b1, b2, b3, b4]);
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(
                    destinationRegister,
                    qb)]
            })
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }

    public SERIAL_NUMBER(destinationRegister: VariableRegisterReference): ExecOutput {
        if (destinationRegister.size === 4) {
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(
                    destinationRegister,
                    this.CPU_INFO.SERIAL_NUMBER)]
            })
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }

    public TICKS(destinationRegister: VariableRegisterReference): ExecOutput {
        if (destinationRegister.size === 4) {
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(
                    destinationRegister,
                    this.GET_CYCLE_COUNT())]
            })
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }

    public MEMSIZE(destinationRegister: VariableRegisterReference): ExecOutput {
        if (destinationRegister.size === 4) {
            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(
                    destinationRegister,
                    this.MAX_MEMORY_ADDRESS.computeSum(1))]
            })
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }

    public FLAGS(destinationRegister: VariableRegisterReference): ExecOutput {
        if (destinationRegister.size === 1) {
            const valueMap = (this.FLAG_SET.Overflow ? 1 : 0)
                + ((this.FLAG_SET.Underflow ? 1 : 0) << 1)
                + ((this.FLAG_SET.OutOfBounds ? 1 : 0) << 2)
                + ((this.FLAG_SET.RegisterSizeMismatch ? 1 : 0) << 3)
                + ((this.FLAG_SET.IORejection ? 1 : 0) << 4)
                + ((this.FLAG_SET.IllegalInstruction ? 1 : 0) << 5)
                + ((this.FLAG_SET.IllegalArgument ? 1 : 0) << 6);

            return new AlmExecOutput({
                mutators: [AlmRegisterMutator.forVariable(
                    destinationRegister,
                    ByteSequenceCreator.Byte(valueMap)
                )]
            });
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }

    public IODEV_IDP(port: Byte, destinationRegister: VariableRegisterReference): ExecOutput {
        if (destinationRegister.size === 4) {
            let output: AlmExecOutput = new AlmExecOutput({
                flags: [FlagName.IORejection]
            });

            try {
                const ioPort = this.getActiveIoPortOrNull(ByteSequenceCreator.Unbox(port));
                if (!!ioPort) {
                    const primaryDeviceId = ioPort.getProfile().primaryDeviceIdentifier;
                    output = new AlmExecOutput({
                        mutators: [AlmRegisterMutator.forVariable(
                            destinationRegister,
                            primaryDeviceId
                        )]
                    });
                }
            } catch (ex) { }

            return output;
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }

    public IODEV_IDS(port: Byte, destinationRegister: VariableRegisterReference): ExecOutput {
        if (destinationRegister.size === 4) {     
            let output: AlmExecOutput = new AlmExecOutput({
                flags: [FlagName.IORejection]
            });

            try {
                const ioPort = this.getActiveIoPortOrNull(ByteSequenceCreator.Unbox(port));
                if (!!ioPort) {
                    const secondaryDeviceId = ioPort.getProfile().secondaryDeviceIdentifier;
                    output = new AlmExecOutput({
                        mutators: [AlmRegisterMutator.forVariable(
                            destinationRegister,
                            secondaryDeviceId
                        )]
                    });
                }
            } catch (ex) { }

            return output;
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }

    public IODEV_CLS(port: Byte, destinationRegister: VariableRegisterReference): ExecOutput {
        if (destinationRegister.size === 1) {     
            let output: AlmExecOutput = new AlmExecOutput({
                flags: [FlagName.IORejection]
            });

            try {
                const ioPort = this.getActiveIoPortOrNull(ByteSequenceCreator.Unbox(port));
                if (!!ioPort) {
                    const value = ByteSequenceCreator.Byte(ioPort.getProfile().serviceClass.valueOf());
                    output = new AlmExecOutput({
                        mutators: [AlmRegisterMutator.forVariable(
                            destinationRegister,
                            value
                        )]
                    });
                }
            } catch (ex) { }

            return output;
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }

    public IODEV_CLSX(port: Byte, destinationRegister: VariableRegisterReference): ExecOutput {
        if (destinationRegister.size === 1) {     
            let output: AlmExecOutput = new AlmExecOutput({
                flags: [FlagName.IORejection]
            });

            try {
                const ioPort = this.getActiveIoPortOrNull(ByteSequenceCreator.Unbox(port));
                if (!!ioPort) {
                    const value = ByteSequenceCreator.Byte(ioPort.getProfile().extendedServiceClass);
                    output = new AlmExecOutput({
                        mutators: [AlmRegisterMutator.forVariable(
                            destinationRegister,
                            value
                        )]
                    });
                }
            } catch (ex) { }

            return output;
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.RegisterSizeMismatch]
            });
        }
    }

    public END(): ExecOutput {
        return new AlmExecOutput({
            mutators: [],
            flags: []
        });
    }

    private checkMinMaxQuadByte(value: QuadByte, isUnderflowCallback: (value: QuadByte) => void,
        isOverflowCallback: (value: QuadByte) => void): boolean {
        let i32 = ByteSequenceCreator.Unbox(value);
        // if (value instanceof QuadByte) {
        //     i32 = value.asInt32();
        // } else {
        //     i32 = value;
        // }

        let isSafeNumber = true;
        if (i32 < this.MIN_REG_VALUE) {
            isSafeNumber = false;
            isUnderflowCallback(ByteSequenceCreator.QuadByte(i32 + this.MAX_REG_VALUE));
        } else if (i32 > this.MAX_REG_VALUE) {
            isSafeNumber = false;
            isOverflowCallback(ByteSequenceCreator.QuadByte(i32 - this.MAX_REG_VALUE));
        }

        return isSafeNumber;
    }

    private toJsSignedNumber(val: DynamicByteSequence): number {
        const bitString = val.toString({ radix: 2 });
        if (bitString.length === 1) {
            return bitString === '1' ? -1 : 0;
        } else {
            let signedNumber = parseInt(bitString.substring(0, bitString.length - 1), 2);
            if (bitString.charAt(bitString.length - 1) === '1') {
                return -1 * (signedNumber + 1);
            } else {
                return signedNumber;
            }
        }
    }

    private fromJsSignedNumber(numericValue: number, sequenceLength: ByteSequenceLength): DynamicByteSequence {
        let bitString = null;
        if (numericValue < 0) {
            bitString = (Math.abs(numericValue) - 1).toString(2);
            while (bitString.length < 31) {
                bitString = '0' + bitString;
            }
            bitString += '1';
        } else {
            bitString = numericValue.toString(2);
            while (bitString.length < 31) {
                bitString = '0' + bitString;
            }
            bitString += '0';
        }
        
        if (sequenceLength === 1) {
            return ByteSequenceCreator.Byte(parseInt(bitString, 2));
        } else if (sequenceLength === 2) {
            return ByteSequenceCreator.DoubleByte(parseInt(bitString, 2));
        } else if (sequenceLength === 3) {
            return ByteSequenceCreator.TriByte(parseInt(bitString, 2));
        } else { // sequenceLength === 4
            return ByteSequenceCreator.QuadByte(parseInt(bitString, 2));
        }
    }

    private getFlagsFromByteSeq(sequence: DynamicByteSequence, ...namedFlags: Array<FlagName>): Array<FlagName> {
        const flags = new Array<FlagName>();
        if (sequence.OVERFLOW) {
            flags.push(FlagName.Overflow);
        }
        if (sequence.UNDERFLOW) {
            flags.push(FlagName.Underflow);
        }
        if (!!namedFlags && namedFlags.length > 0) {
            namedFlags.filter(nf => !flags.includes(nf)).forEach(f => flags.push(f));
        }
        return flags;
    }

    private assertEqualSequenceLength(a: DynamicByteSequence, b: DynamicByteSequence, pushFlags: (f: FlagName) => void): boolean {
        if (a.LENGTH === b.LENGTH) {
            return true;
        } else {
            pushFlags(FlagName.RegisterSizeMismatch);
            return false;
        }
    }

    // private expression(lhs: QuadByte, operator: string, rhs: QuadByte): QuadByte {
    //     return QuadByte.fromInt32(this.expressionToInt32(lhs, operator, rhs));
    // }
    
    // private expressionToInt32(lhs: QuadByte, operator: string, rhs: QuadByte): number {
    //     return Number(eval(`${lhs.asInt32()} ${operator} ${rhs.asInt32()}`));
    // }

    private loadRegisterFull(varValue: DynamicByteSequence, register: Register): ExecOutput {
        let output: ExecOutput = null;

        if (varValue.LENGTH === 4) {
            const flags = new Array<FlagName>();
            if (varValue.OVERFLOW) {
                flags.push(FlagName.Overflow);
            }
            if (varValue.UNDERFLOW) {
                flags.push(FlagName.Underflow);
            }
            output = new AlmExecOutput({
                mutators: [AlmRegisterMutator.forRegister(register, varValue)],
                flags: flags
            });
        } else {
            output = new AlmExecOutput({
                flags: [FlagName.RegisterSizeMismatch]
            })
        }

        return output;
    }

    private createByteSequenceFromMask(i32: number, mask: RegisterMask,
        onSafe: (correctedValue: DynamicByteSequence) => void,
        onOverflow: (correctedValue: DynamicByteSequence) => void,
        onUnderflow: (sequenceValue: DynamicByteSequence) => void): void {
        let registerMax = Number.NaN;
        let sequenceConstructor: (n: number) => DynamicByteSequence = null;

        if (mask.name === NamedRegisterMask.Unnamed) {
            if (mask.sequenceLength === 4) {
                registerMax = this.MAX_REG_VALUE;
                sequenceConstructor = (n: number) => ByteSequenceCreator.QuadByte(n);
            } else if (mask.sequenceLength === 3) {
                registerMax = this.MAX_REG_TRIPLE_VALUE;
            } else if (mask.sequenceLength === 2) {
                registerMax = this.MAX_REG_DOUBLE_VALUE;
            } else {
                registerMax = this.MAX_BYTE_VALUE;
            }

            sequenceConstructor = (n: number) => {
                let v = 0;
                if (mask.byte1) {
                    v = n & 255;
                }
                if (mask.byte2) {
                    v += ((n >> 8) & 255);
                }
                if (mask.byte3) {
                    v += ((n >> 16) & 255);
                }
                if (mask.byte4) {
                    v += ((n >> 24) & 255);
                }
                
                if (mask.sequenceLength === 4) {
                    return ByteSequenceCreator.QuadByte(v);
                } else if (mask.sequenceLength === 3) {
                    return ByteSequenceCreator.TriByte(v);
                } else if (mask.sequenceLength === 2) {
                    return ByteSequenceCreator.DoubleByte(v);
                } else {
                    return ByteSequenceCreator.Byte(v);
                }
            }
            
        } else {
            switch (mask.name) {
                case NamedRegisterMask.Full:
                    registerMax = this.MAX_REG_VALUE;
                    sequenceConstructor = (n: number) => ByteSequenceCreator.QuadByte(n);
                    break;
                case NamedRegisterMask.ExtendedHigh:
                case NamedRegisterMask.ExtendedLow:
                    registerMax = this.MAX_REG_TRIPLE_VALUE;
                    sequenceConstructor = (n: number) => ByteSequenceCreator.TriByte(n);
                    break;
                case NamedRegisterMask.High:
                case NamedRegisterMask.Low:
                    registerMax = this.MAX_REG_DOUBLE_VALUE;
                    sequenceConstructor = (n: number) => ByteSequenceCreator.DoubleByte(n);
                    break;
                case NamedRegisterMask.HighHigh:
                case NamedRegisterMask.HighLow:
                case NamedRegisterMask.LowHigh:
                case NamedRegisterMask.LowLow:
                    registerMax = this.MAX_BYTE_VALUE;
                    sequenceConstructor = (n: number) => ByteSequenceCreator.Byte(n);
                    break;
            }
        }
        const registerMin = -1 * (registerMax + 1);

        if (i32 > registerMax) {
            onOverflow(sequenceConstructor(i32 - registerMax));
        } else if (i32 < registerMin) {
            onUnderflow(sequenceConstructor(i32 + registerMin));
        } else {
            onSafe(sequenceConstructor(i32));
        }
    }

    private saveRegister(address: QuadByte, srcRegisterValue: QuadByte): ExecOutput {
        if (address.isLessThanOrEqualTo(this.MAX_MEMORY_ADDRESS)) {
            return new AlmExecOutput({
                mutators: [
                    AlmMemoryMutator.create(address, srcRegisterValue.getByte(1)),
                    AlmMemoryMutator.create(address.computeSum(1), srcRegisterValue.getByte(2)),
                    AlmMemoryMutator.create(address.computeSum(2), srcRegisterValue.getByte(3)),
                    AlmMemoryMutator.create(address.computeSum(3), srcRegisterValue.getByte(4))
                ],
                flags: []
            });
        } else {
            return new AlmExecOutput({
                mutators: [],
                flags: [FlagName.OutOfBounds]
            });
        }
    }

    private getActiveIoPortOrNull(portIndex: number): IoPort | null {
        if (this.IO_BUS().getPortStatus(portIndex) === IoPortStatus.Null) {
            return null;
        } else {
            return this.IO_BUS().getPort(portIndex);
        }
    }
}