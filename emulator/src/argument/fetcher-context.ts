import { NamedRegisterMask, RegisterMask, DynamicByteSequence, Register, QuadByte, VariableRegisterReference, Byte, DoubleByte, TriByte, Mnemonic, FlagName, ByteSequenceCreator, ByteSequenceLength } from '@allium/types';
import { ExecutorArgumentHelper, InstructionExecutor, ExecutorArgument, ExecOutput, HardwareContext, RegisterSet, MemoryModule, IoController, Cpu, NullExecutorArgument, Mutator } from '@allium/arch';
import { AlmExecOutput } from '../cpu/execution/exec-output';

export class FetcherContext {
    private readonly arg: ExecutorArgument;
    private readonly executor: InstructionExecutor;
    private readonly hardwareContext: HardwareContext<RegisterSet, MemoryModule, Cpu<RegisterSet>, IoController>;

    public constructor(
        arg: ExecutorArgument, 
        executor: InstructionExecutor,
        hardwareContext: HardwareContext<RegisterSet, MemoryModule, Cpu<RegisterSet>, IoController>)
    {
        this.arg = arg;
        this.executor = executor;
        this.hardwareContext = hardwareContext;
    }

    private getAccumulatorValue(): QuadByte {
        return this.hardwareContext.registerSet.readMasked(Register.Accumulator, RegisterMask(NamedRegisterMask.Full)) as QuadByte;
    }

    private getVar1Value(): ExecOutput | DynamicByteSequence {
        return this.getRegisterValue(this.arg.variableRegisterName1);
    }

    private getVar2Value(): ExecOutput | DynamicByteSequence {
        return this.getRegisterValue(this.arg.variableRegisterName2);
    }
    
    private getVar3Value(): ExecOutput | DynamicByteSequence {
        return this.getRegisterValue(this.arg.variableRegisterName3);
    }

    private getRegisterValue(variableRegisterName: VariableRegisterReference | NullExecutorArgument): DynamicByteSequence | ExecOutput {
        if (ExecutorArgumentHelper.isNullExecutorArgument(variableRegisterName)) {
            return this.createBadFormatOutput();
        } else {
            return this.hardwareContext.registerSet.readMasked(variableRegisterName.register, variableRegisterName.mask);
        }
    }

    private isExecOutputObject(o: any): o is ExecOutput {
        return o !== undefined && o.mutators !== undefined;
    }

    private createBadFormatOutput(): ExecOutput {
        return new AlmExecOutput({
            mutators: [],
            flags: [FlagName.IllegalArgument]
        });
    }

    private fetchData<TArg>(getter: () => TArg | ExecOutput, pushValue: (v: TArg) => void, pushFailure: (f: ExecOutput) => void): boolean {
        const value = getter();
        let success = false;
        
        if (this.isExecOutputObject(value)) { // ExecOutput
            pushFailure(value as ExecOutput);
        } else {
            success = true;
            pushValue(value as TArg);
        }

        return success;
    }

    private beginInvoke<TArg0 = never, TArg1 = never, TArg2 = never>(getters: {
        getArg0?: () => TArg0 | ExecOutput;
        getArg1?: () => TArg1 | ExecOutput;
        getArg2?: () => TArg2 | ExecOutput;
    }, then: (arg0: TArg0, arg1: TArg1, arg2: TArg2) => ExecOutput): ExecOutput {
        let arg0: TArg0 | undefined = undefined;
        let arg1: TArg1 | undefined = undefined;
        let arg2: TArg2 | undefined = undefined;
        let success = false;
        const failureFlags = new Array<FlagName>();
        const failureMutators = new Array<Mutator>();

        if (!!getters.getArg0) {
            success = this.fetchData(getters.getArg0, (v) => { arg0 = v }, (f) => {
                f.flags.forEach(flag => {
                    if (!failureFlags.includes(flag)) {
                        failureFlags.push(flag);
                    }
                });
                f.mutators.forEach(mutator => {
                    failureMutators.push(mutator);
                });
            })
        }

        if (!!getters.getArg1) {
            success = success && this.fetchData(getters.getArg1, (v) => { arg1 = v }, (f) => {
                f.flags.forEach(flag => {
                    if (!failureFlags.includes(flag)) {
                        failureFlags.push(flag);
                    }
                });
                f.mutators.forEach(mutator => {
                    failureMutators.push(mutator);
                });
            })
        }

        if (!!getters.getArg2) {
            success = success && this.fetchData(getters.getArg2, (v) => { arg2 = v }, (f) => {
                f.flags.forEach(flag => {
                    if (!failureFlags.includes(flag)) {
                        failureFlags.push(flag);
                    }
                });
                f.mutators.forEach(mutator => {
                    failureMutators.push(mutator);
                });
            })
        }

        if (success) {
            return then(arg0, arg1, arg2);
        } else {
            return new AlmExecOutput({
                mutators: failureMutators,
                flags: failureFlags
            });
        }
    }

    private getRegisterReference(variableRegisterName: VariableRegisterReference | NullExecutorArgument): VariableRegisterReference | ExecOutput {
        if (ExecutorArgumentHelper.isNullExecutorArgument(variableRegisterName)) {
            return this.createBadFormatOutput();
        } else {
            return variableRegisterName;
        }
    }

    private getVar1Name(): ExecOutput | VariableRegisterReference {
        return this.getRegisterReference(this.arg.variableRegisterName1);
    }

    private getVar2Name(): ExecOutput | VariableRegisterReference {
        return this.getRegisterReference(this.arg.variableRegisterName2);
    }

    private getVar3Name(): ExecOutput | VariableRegisterReference {
        return this.getRegisterReference(this.arg.variableRegisterName3);
    }

    private getInlineValue(): DynamicByteSequence | ExecOutput {
        if (ExecutorArgumentHelper.isNullExecutorArgument(this.arg.inlineValue)) {
            return this.createBadFormatOutput();
        } else {
            return this.arg.inlineValue;
        }
    }

    private getDynamicByteSequence(sequence: DynamicByteSequence | ExecOutput): Byte | ExecOutput {
        if (this.isExecOutputObject(sequence)) {
            return sequence as ExecOutput;
        } else {
            if (sequence.LENGTH === 1) {
                return sequence as Byte;
            } else {
                return new AlmExecOutput({
                    mutators: [],
                    flags: [FlagName.RegisterSizeMismatch]
                });
            }
        }
    }

    private getDoubleDynamicByteSequence(sequence: DynamicByteSequence | ExecOutput): DoubleByte | ExecOutput {
        if (this.isExecOutputObject(sequence)) {
            return sequence as ExecOutput;
        } else {
            if (sequence.LENGTH === 2) {
                return sequence as DoubleByte;
            } else {
                return new AlmExecOutput({
                    mutators: [],
                    flags: [FlagName.RegisterSizeMismatch]
                });
            }
        }
    }

    private getTriDynamicByteSequence(sequence: DynamicByteSequence | ExecOutput): TriByte | ExecOutput {
        if (this.isExecOutputObject(sequence)) {
            return sequence as ExecOutput;
        } else {
            if (sequence.LENGTH === 3) {
                return sequence as TriByte;
            } else {
                return new AlmExecOutput({
                    mutators: [],
                    flags: [FlagName.RegisterSizeMismatch]
                });
            }
        }
    }

    private getQuadDynamicByteSequence(sequence: DynamicByteSequence | ExecOutput): QuadByte | ExecOutput {
        if (this.isExecOutputObject(sequence)) {
            return sequence as ExecOutput;
        } else {
            if (sequence.LENGTH === 4) {
                return sequence as QuadByte;
            } else {
                return new AlmExecOutput({
                    mutators: [],
                    flags: [FlagName.RegisterSizeMismatch]
                });
            }
        }
    }

    private handleRegDump(register: Register, executorFn: (address: QuadByte, registerValue: QuadByte) => ExecOutput): ExecOutput {
        return this.beginInvoke({
            getArg0: () => this.getQuadDynamicByteSequence(this.getRegisterValue(VariableRegisterReference.create(register))),
            getArg1: () => {
                const var1ByteSeq = this.getInlineValue();
                if (this.isExecOutputObject(var1ByteSeq)) {
                    return var1ByteSeq;
                } else {
                    return this.getQuadDynamicByteSequence(var1ByteSeq);
                }
            }
        }, (reg1Value, byteSeq) => executorFn(byteSeq, reg1Value));
    }

    public invoke(mnemonic: Mnemonic): ExecOutput {
        if (mnemonic === Mnemonic.ADD) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getVar1Value()
            }, (accumulatorValue, var1Value) => this.executor.ADD(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.SUB) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getVar1Value()
            }, (accumulatorValue, var1Value) => this.executor.SUB(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.MULT) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getVar1Value()
            }, (accumulatorValue, var1Value) => this.executor.MULT(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.DIV) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getVar1Value()
            }, (accumulatorValue, var1Value) => this.executor.DIV(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.MOD) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getVar1Value()
            }, (accumulatorValue, var1Value) => this.executor.MOD(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.BITAND) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getVar1Value()
            }, (accumulatorValue, var1Value) => this.executor.BITAND(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.BITOR) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getVar1Value()
            }, (accumulatorValue, var1Value) => this.executor.BITOR(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.BITXOR) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getVar1Value()
            }, (accumulatorValue, var1Value) => this.executor.BITXOR(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.BITLSHIFT) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getVar1Value()
            }, (accumulatorValue, var1Value) => this.executor.BITLSHIFT(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.BITRSHIFT) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getVar1Value()
            }, (accumulatorValue, var1Value) => this.executor.BITRSHIFT(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.ADDF) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getQuadDynamicByteSequence(this.getVar1Value())
            }, (accumulatorValue, var1Value) => this.executor.ADDF(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.SUBF) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getQuadDynamicByteSequence(this.getVar1Value())
            }, (accumulatorValue, var1Value) => this.executor.SUBF(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.MULTF) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getQuadDynamicByteSequence(this.getVar1Value())
            }, (accumulatorValue, var1Value) => this.executor.MULTF(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.DIVF) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getQuadDynamicByteSequence(this.getVar1Value())
            }, (accumulatorValue, var1Value) => this.executor.DIVF(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.ADDV) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getVar1Value()
            }, (accumulatorValue, var1Value) => this.executor.ADDV(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.SUBV) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getVar1Value()
            }, (accumulatorValue, var1Value) => this.executor.SUBV(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.MULTV) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getVar1Value()
            }, (accumulatorValue, var1Value) => this.executor.MULTV(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.DIVV) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getVar1Value()
            }, (accumulatorValue, var1Value) => this.executor.DIVV(accumulatorValue, var1Value));
        } else if (mnemonic === Mnemonic.MODV) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue(),
                getArg1: () => this.getVar1Value()
            }, (accumulatorValue, var1Value) => this.executor.MODV(accumulatorValue, var1Value));
        }

        else if (mnemonic === Mnemonic.LOAD_D) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Name(),
                getArg1: () => this.getDoubleDynamicByteSequence(this.getInlineValue())
            }, (var1Name, inlineValue) => this.executor.LOAD_D(var1Name, inlineValue));
        } else if (mnemonic === Mnemonic.LOAD_B) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Name(),
                getArg1: () => this.getDynamicByteSequence(this.getInlineValue())
            }, (var1Name, inlineValue) => this.executor.LOAD_B(var1Name, inlineValue));
        } else if (mnemonic === Mnemonic.LOAD_X) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Name(),
                getArg1: () => this.getTriDynamicByteSequence(this.getInlineValue())
            }, (var1Name, inlineValue) => this.executor.LOAD_X(var1Name, inlineValue));
        } else if (mnemonic === Mnemonic.FLAG_ACK) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Name(),
                getArg1: () => this.getInlineValue()
            }, (var1Name, inlineValue) => this.executor.FLAG_ACK(var1Name, inlineValue));
        }


        else if (mnemonic === Mnemonic.JNZI) {
            return this.beginInvoke({
				getArg0: () => this.getVar1Value(),
				getArg1: () => this.getTriDynamicByteSequence(this.getInlineValue())
			}, (var1Value, inlineValue) => this.executor.JNZI(var1Value, inlineValue));
        } else if (mnemonic === Mnemonic.JZI) {
            return this.beginInvoke({
				getArg0: () => this.getVar1Value(),
				getArg1: () => this.getTriDynamicByteSequence(this.getInlineValue())
			}, (var1Value, inlineValue) => this.executor.JZI(var1Value, inlineValue));
        }

        else if (mnemonic === Mnemonic.FLOORF) {
            return this.beginInvoke({
				getArg0: () => this.getQuadDynamicByteSequence(this.getVar1Value()),
				getArg1: () => this.getVar2Name()
			}, (var1Value, var2Name) => this.executor.FLOORF(var1Value, var2Name.register));
        } else if (mnemonic === Mnemonic.CEILF) {
            return this.beginInvoke({
				getArg0: () => this.getQuadDynamicByteSequence(this.getVar1Value()),
				getArg1: () => this.getVar2Name()
			}, (var1Value, var2Name) => this.executor.CEILF(var1Value, var2Name.register));
        } else if (mnemonic === Mnemonic.ROUNDF) {
            return this.beginInvoke({
				getArg0: () => this.getQuadDynamicByteSequence(this.getVar1Value()),
				getArg1: () => this.getVar2Name()
			}, (var1Value, var2Name) => this.executor.ROUNDF(var1Value, var2Name.register));
        }

        else if (mnemonic === Mnemonic.EQ) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Value(),
                getArg1: () => this.getVar2Value(),
                getArg2: () => this.getVar3Name()
            }, (reg1Value, reg2Value, reg3Name) => this.executor.EQ(reg1Value, reg2Value, reg3Name));
        } else if (mnemonic === Mnemonic.GT) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Value(),
                getArg1: () => this.getVar2Value(),
                getArg2: () => this.getVar3Name()
            }, (reg1Value, reg2Value, reg3Name) => this.executor.GT(reg1Value, reg2Value, reg3Name));
        } else if (mnemonic === Mnemonic.LT) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Value(),
                getArg1: () => this.getVar2Value(),
                getArg2: () => this.getVar3Name()
            }, (reg1Value, reg2Value, reg3Name) => this.executor.LT(reg1Value, reg2Value, reg3Name));
        } else if (mnemonic === Mnemonic.EQV) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Value(),
                getArg1: () => this.getVar2Value(),
                getArg2: () => this.getVar3Name()
            }, (reg1Value, reg2Value, reg3Name) => this.executor.EQV(reg1Value, reg2Value, reg3Name));
        } else if (mnemonic === Mnemonic.GTV) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Value(),
                getArg1: () => this.getVar2Value(),
                getArg2: () => this.getVar3Name()
            }, (reg1Value, reg2Value, reg3Name) => this.executor.GTV(reg1Value, reg2Value, reg3Name));
        } else if (mnemonic === Mnemonic.LTV) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Value(),
                getArg1: () => this.getVar2Value(),
                getArg2: () => this.getVar3Name()
            }, (reg1Value, reg2Value, reg3Name) => this.executor.LTV(reg1Value, reg2Value, reg3Name));
        }

        else if (mnemonic === Mnemonic.COPY) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Value(),
                getArg1: () => this.getVar2Name()
            }, (reg1Value, reg2Name) => this.executor.COPY(reg1Value, reg2Name));
        } else if (mnemonic === Mnemonic.INC) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Value(),
                getArg1: () => this.getVar1Name()
            }, (reg1Value, reg2Name) => this.executor.INC(reg1Value, reg2Name));
        } else if (mnemonic === Mnemonic.DEC) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Value(),
                getArg1: () => this.getVar1Name()
            }, (reg1Value, reg2Name) => this.executor.DEC(reg1Value, reg2Name));
        } else if (mnemonic === Mnemonic.ABSV) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Value(),
                getArg1: () => this.getVar2Name()
            }, (reg1Value, reg2Name) => this.executor.ABSV(reg1Value, reg2Name));
        } else if (mnemonic === Mnemonic.NEGV) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Value(),
                getArg1: () => this.getVar2Name()
            }, (reg1Value, reg2Name) => this.executor.NEGV(reg1Value, reg2Name));
        } else if (mnemonic === Mnemonic.VEC) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Value(),
                getArg1: () => this.getVar2Name()
            }, (reg1Value, reg2Name) => this.executor.VEC(reg1Value, reg2Name));
        } else if (mnemonic === Mnemonic.VEC_NEG) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Value(),
                getArg1: () => this.getVar2Name()
            }, (reg1Value, reg2Name) => this.executor.VEC_NEG(reg1Value, reg2Name));
        } else if (mnemonic === Mnemonic.MAG) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Value(),
                getArg1: () => this.getVar2Name()
            }, (reg1Value, reg2Name) => this.executor.MAG(reg1Value, reg2Name));
        }

        else if (mnemonic === Mnemonic.LOAD_MONDAY) {
            return this.beginInvoke({
				getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue())
			}, (inlineValue) => this.executor.LOAD_MONDAY(inlineValue));
        } else if (mnemonic === Mnemonic.LOAD_TUESDAY) {
            return this.beginInvoke({
				getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue())
			}, (inlineValue) => this.executor.LOAD_TUESDAY(inlineValue));
        } else if (mnemonic === Mnemonic.LOAD_WEDNESDAY) {
            return this.beginInvoke({
				getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue())
			}, (inlineValue) => this.executor.LOAD_WEDNESDAY(inlineValue));
        } else if (mnemonic === Mnemonic.LOAD_THURSDAY) {
            return this.beginInvoke({
				getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue())
			}, (inlineValue) => this.executor.LOAD_THURSDAY(inlineValue));
        } else if (mnemonic === Mnemonic.LOAD_FRIDAY) {
            return this.beginInvoke({
				getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue())
			}, (inlineValue) => this.executor.LOAD_FRIDAY(inlineValue));
        } else if (mnemonic === Mnemonic.LOAD_ACCUMULATOR) {
            return this.beginInvoke({
				getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue())
			}, (inlineValue) => this.executor.LOAD_ACCUMULATOR(inlineValue));
        } else if (mnemonic === Mnemonic.LOAD_INSPTR) {
            return this.beginInvoke({
				getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue())
			}, (inlineValue) => this.executor.LOAD_INSPTR(inlineValue));
        } else if (mnemonic === Mnemonic.LOAD_G7) {
            return this.beginInvoke({
                getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue())
            }, (inlineValue) => this.executor.LOAD_G7(inlineValue));
        }
        else if (mnemonic === Mnemonic.LOAD_G8) {
            return this.beginInvoke({
                getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue())
            }, (inlineValue) => this.executor.LOAD_G8(inlineValue));
        }
        else if (mnemonic === Mnemonic.LOAD_G9) {
            return this.beginInvoke({
                getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue())
            }, (inlineValue) => this.executor.LOAD_G9(inlineValue));
        }
        else if (mnemonic === Mnemonic.LOAD_G10) {
            return this.beginInvoke({
                getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue())
            }, (inlineValue) => this.executor.LOAD_G10(inlineValue));
        }
        else if (mnemonic === Mnemonic.LOAD_G11) {
            return this.beginInvoke({
                getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue())
            }, (inlineValue) => this.executor.LOAD_G11(inlineValue));
        }
        else if (mnemonic === Mnemonic.LOAD_G12) {
            return this.beginInvoke({
                getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue())
            }, (inlineValue) => this.executor.LOAD_G12(inlineValue));
        }
        else if (mnemonic === Mnemonic.LOAD_G13) {
            return this.beginInvoke({
                getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue())
            }, (inlineValue) => this.executor.LOAD_G13(inlineValue));
        }
        else if (mnemonic === Mnemonic.LOAD_G14) {
            return this.beginInvoke({
                getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue())
            }, (inlineValue) => this.executor.LOAD_G14(inlineValue));
        }
        else if (mnemonic === Mnemonic.LOAD_STKPTR) {
            return this.beginInvoke({
                getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue())
            }, (inlineValue) => this.executor.LOAD_STKPTR(inlineValue));
        } else if (mnemonic === Mnemonic.JMPI) {
            return this.beginInvoke({
				getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue())
			}, (inlineValue) => this.executor.JMPI(inlineValue));
        }

        else if (mnemonic === Mnemonic.BITNOT) {
            return this.beginInvoke({
                getArg0: () => this.getAccumulatorValue()
            }, (accumulatorValue) => {
                return this.executor.BITNOT(accumulatorValue);
            });
        } else if (mnemonic === Mnemonic.MEMREAD) {
            return this.beginInvoke({
                getArg0: () => {
                    const address = this.getQuadDynamicByteSequence(this.getVar1Value());
                    if (this.isExecOutputObject(address)) {
                        return address;
                    } else {
                        const valueA = this.hardwareContext.memoryModule.read(address);
                        return valueA;
                    }
                },
                getArg1: () => this.getVar2Name()
            }, (valueA, reg2Name) => {
                return this.executor.MEMREAD(valueA, reg2Name);
            });
        } else if (mnemonic === Mnemonic.MEMREAD_Q) {
            return this.beginInvoke({
                getArg0: () => {
                    const address = this.getQuadDynamicByteSequence(this.getVar1Value());
                    if (this.isExecOutputObject(address)) {
                        return address;
                    } else {
                        if (this.hardwareContext.memoryModule.SIZE.computeDifference(4).isGreaterThanOrEqualTo(address)) {
                            const byte1 = this.hardwareContext.memoryModule.read(address);
                            const byte2 = this.hardwareContext.memoryModule.read(address.computeSum(1));
                            const byte3 = this.hardwareContext.memoryModule.read(address.computeSum(2));
                            const byte4 = this.hardwareContext.memoryModule.read(address.computeSum(3));
                            return ByteSequenceCreator.QuadByte([
                                ByteSequenceCreator.Unbox(byte1),
                                ByteSequenceCreator.Unbox(byte2),
                                ByteSequenceCreator.Unbox(byte3),
                                ByteSequenceCreator.Unbox(byte4)
                            ]);
                        } else {
                            return new AlmExecOutput({
                                mutators: [],
                                flags: [FlagName.OutOfBounds]
                            });
                        }
                    }
                },
                getArg1: () => this.getVar2Name()
            }, (valueA, reg2Name) => {
                return this.executor.MEMREAD_Q(valueA, reg2Name);
            });
        } else if (mnemonic === Mnemonic.MEMREAD_X) {
            return this.beginInvoke({
                getArg0: () => {
                    const address = this.getQuadDynamicByteSequence(this.getVar1Value());
                    if (this.isExecOutputObject(address)) {
                        return address;
                    } else {
                        if (this.hardwareContext.memoryModule.SIZE.computeDifference(3).isGreaterThanOrEqualTo(address)) {
                            const byte1 = this.hardwareContext.memoryModule.read(address);
                            const byte2 = this.hardwareContext.memoryModule.read(address.computeSum(1));
                            const byte3 = this.hardwareContext.memoryModule.read(address.computeSum(2));
                            return ByteSequenceCreator.TriByte([
                                ByteSequenceCreator.Unbox(byte1),
                                ByteSequenceCreator.Unbox(byte2),
                                ByteSequenceCreator.Unbox(byte3)
                            ]);
                        } else {
                            return new AlmExecOutput({
                                mutators: [],
                                flags: [FlagName.OutOfBounds]
                            });
                        }
                    }
                },
                getArg1: () => this.getVar2Name()
            }, (valueA, reg2Name) => {
                return this.executor.MEMREAD_X(valueA, reg2Name);
            });
        } else if (mnemonic === Mnemonic.MEMREAD_D) {
            return this.beginInvoke({
                getArg0: () => {
                    const address = this.getQuadDynamicByteSequence(this.getVar1Value());
                    if (this.isExecOutputObject(address)) {
                        return address;
                    } else {
                        if (this.hardwareContext.memoryModule.SIZE.computeDifference(2).isGreaterThanOrEqualTo(address)) {
                            const byte1 = this.hardwareContext.memoryModule.read(address);
                            const byte2 = this.hardwareContext.memoryModule.read(address.computeSum(1));
                            return ByteSequenceCreator.DoubleByte([
                                ByteSequenceCreator.Unbox(byte1),
                                ByteSequenceCreator.Unbox(byte2)
                            ]);
                        } else {
                            return new AlmExecOutput({
                                mutators: [],
                                flags: [FlagName.OutOfBounds]
                            });
                        }
                    }
                },
                getArg1: () => this.getVar2Name()
            }, (valueA, reg2Name) => {
                return this.executor.MEMREAD_D(valueA, reg2Name);
            });
        } else if (mnemonic === Mnemonic.MEMWRITE) {
            return this.beginInvoke({
                getArg0: () => this.getQuadDynamicByteSequence(this.getVar1Value()),
                getArg1: () => {
                    const var2ByteSeq = this.getVar2Value();
                    if (this.isExecOutputObject(var2ByteSeq)) {
                        return var2ByteSeq;
                    } else {
                        let singleByteSeq: DynamicByteSequence = var2ByteSeq;
                        if (var2ByteSeq.LENGTH > 1) {
                            singleByteSeq = var2ByteSeq.getByte(1);
                        }
                        return this.getDynamicByteSequence(singleByteSeq);
                    }
                }
            }, (reg1Value, byteSeq) => this.executor.MEMWRITE(reg1Value, byteSeq));
        } else if (mnemonic === Mnemonic.MEMWRITE_Q) {
            return this.beginInvoke({
                getArg0: () => this.getQuadDynamicByteSequence(this.getVar1Value()),
                getArg1: () => {
                    const var2ByteSeq = this.getVar2Value();
                    if (this.isExecOutputObject(var2ByteSeq)) {
                        return var2ByteSeq;
                    } else {
                        return this.getQuadDynamicByteSequence(var2ByteSeq);
                    }
                }
            }, (reg1Value, byteSeq) => this.executor.MEMWRITE_Q(reg1Value, byteSeq));
        } else if (mnemonic === Mnemonic.MEMWRITE_X) {
            return this.beginInvoke({
                getArg0: () => this.getQuadDynamicByteSequence(this.getVar1Value()),
                getArg1: () => {
                    const var2ByteSeq = this.getVar2Value();
                    if (this.isExecOutputObject(var2ByteSeq)) {
                        return var2ByteSeq;
                    } else {
                        return this.getTriDynamicByteSequence(var2ByteSeq);
                    }
                }
            }, (reg1Value, byteSeq) => this.executor.MEMWRITE_X(reg1Value, byteSeq));
        } else if (mnemonic === Mnemonic.MEMWRITE_D) {
            return this.beginInvoke({
                getArg0: () => this.getQuadDynamicByteSequence(this.getVar1Value()),
                getArg1: () => {
                    const var2ByteSeq = this.getVar2Value();
                    if (this.isExecOutputObject(var2ByteSeq)) {
                        return var2ByteSeq;
                    } else {
                        return this.getDoubleDynamicByteSequence(var2ByteSeq);
                    }
                }
            }, (reg1Value, byteSeq) => this.executor.MEMWRITE_D(reg1Value, byteSeq));
        } else if (mnemonic === Mnemonic.PUSH) {
            return this.beginInvoke({
				getArg0: () => this.getDynamicByteSequence(this.getVar1Value()),
				getArg1: () => this.getQuadDynamicByteSequence(this.getRegisterValue(VariableRegisterReference.create(Register.StackPtr)))
			}, (rv, stackAddress) => this.executor.PUSH(rv, stackAddress));
        } else if (mnemonic === Mnemonic.PUSH_Q) {
            return this.beginInvoke({
				getArg0: () => this.getQuadDynamicByteSequence(this.getVar1Value()),
				getArg1: () => this.getQuadDynamicByteSequence(this.getRegisterValue(VariableRegisterReference.create(Register.StackPtr)))
			}, (rv, stackAddress) => this.executor.PUSH_Q(rv, stackAddress));
        } else if (mnemonic === Mnemonic.PUSH_X) {
            return this.beginInvoke({
				getArg0: () => this.getTriDynamicByteSequence(this.getVar1Value()),
				getArg1: () => this.getQuadDynamicByteSequence(this.getRegisterValue(VariableRegisterReference.create(Register.StackPtr)))
			}, (rv, stackAddress) => this.executor.PUSH_X(rv, stackAddress));
        } else if (mnemonic === Mnemonic.PUSH_D) {
            return this.beginInvoke({
				getArg0: () => this.getDoubleDynamicByteSequence(this.getVar1Value()),
				getArg1: () => this.getQuadDynamicByteSequence(this.getRegisterValue(VariableRegisterReference.create(Register.StackPtr)))
			}, (rv, stackAddress) => this.executor.PUSH_D(rv, stackAddress));
        } else if (mnemonic === Mnemonic.IPUSH) {
            return this.beginInvoke({
				getArg0: () => this.getDynamicByteSequence(this.getInlineValue()),
				getArg1: () => this.getQuadDynamicByteSequence(this.getRegisterValue(VariableRegisterReference.create(Register.StackPtr)))
			}, (inlineValue, stackAddress) => this.executor.IPUSH(inlineValue, stackAddress));
        } else if (mnemonic === Mnemonic.IPUSH_Q) {
            return this.beginInvoke({
				getArg0: () => this.getQuadDynamicByteSequence(this.getInlineValue()),
				getArg1: () => this.getQuadDynamicByteSequence(this.getRegisterValue(VariableRegisterReference.create(Register.StackPtr)))
			}, (inlineValue, stackAddress) => this.executor.IPUSH_Q(inlineValue, stackAddress));
        } else if (mnemonic === Mnemonic.IPUSH_X) {
            return this.beginInvoke({
				getArg0: () => this.getTriDynamicByteSequence(this.getInlineValue()),
				getArg1: () => this.getQuadDynamicByteSequence(this.getRegisterValue(VariableRegisterReference.create(Register.StackPtr)))
			}, (inlineValue, stackAddress) => this.executor.IPUSH_X(inlineValue, stackAddress));
        } else if (mnemonic === Mnemonic.IPUSH_D) {
            return this.beginInvoke({
				getArg0: () => this.getDoubleDynamicByteSequence(this.getInlineValue()),
				getArg1: () => this.getQuadDynamicByteSequence(this.getRegisterValue(VariableRegisterReference.create(Register.StackPtr)))
			}, (inlineValue, stackAddress) => this.executor.IPUSH_D(inlineValue, stackAddress));
        } else if (mnemonic === Mnemonic.POP) {
            return this.beginInvoke({
				getArg0: () => this.getVar1Name(),
				getArg1: () => this.getQuadDynamicByteSequence(this.getRegisterValue(VariableRegisterReference.create(Register.StackPtr)))
			}, (dr, stackAddress) => this.executor.POP(dr, stackAddress));
        } else if (mnemonic === Mnemonic.POP_Q) {
            return this.beginInvoke({
				getArg0: () => this.getVar1Name(),
				getArg1: () => this.getQuadDynamicByteSequence(this.getRegisterValue(VariableRegisterReference.create(Register.StackPtr)))
			}, (dr, stackAddress) => this.executor.POP_Q(dr, stackAddress));
        } else if (mnemonic === Mnemonic.POP_X) {
            return this.beginInvoke({
				getArg0: () => this.getVar1Name(),
				getArg1: () => this.getQuadDynamicByteSequence(this.getRegisterValue(VariableRegisterReference.create(Register.StackPtr)))
			}, (dr, stackAddress) => this.executor.POP_X(dr, stackAddress));
        } else if (mnemonic === Mnemonic.POP_D) {
            return this.beginInvoke({
				getArg0: () => this.getVar1Name(),
				getArg1: () => this.getQuadDynamicByteSequence(this.getRegisterValue(VariableRegisterReference.create(Register.StackPtr)))
			}, (dr, stackAddress) => this.executor.POP_D(dr, stackAddress));
        } else if (mnemonic === Mnemonic.JNZ) {
            return this.beginInvoke({
				getArg0: () => this.getVar1Value(),
				getArg1: () => this.getQuadDynamicByteSequence(this.getVar2Value())
			}, (var1Value, var2Value) => this.executor.JNZ(var1Value, var2Value));
        } else if (mnemonic === Mnemonic.JZ) {
            return this.beginInvoke({
				getArg0: () => this.getVar1Value(),
				getArg1: () => this.getQuadDynamicByteSequence(this.getVar2Value())
			}, (var1Value, var2Value) => this.executor.JZ(var1Value, var2Value));
        } else if (mnemonic === Mnemonic.JMP) {
            return this.beginInvoke({
				getArg0: () => this.getQuadDynamicByteSequence(this.getVar1Value())
			}, (var1Value) => this.executor.JMP(var1Value));
        } else if (mnemonic === Mnemonic.NO_OP) {
            return this.executor.NO_OP();
        } else if (mnemonic === Mnemonic.FLAGS) {
            return this.beginInvoke({
				getArg0: () => this.getVar1Name()
			}, (dr) => this.executor.FLAGS(dr));
        } else if (mnemonic === Mnemonic.END) {
            return this.executor.END();
        }
        
        else if (mnemonic === Mnemonic.ISCAN) {
            return this.beginInvoke({
				getArg0: () => this.getDynamicByteSequence(this.getVar1Value()),
				getArg1: () => this.getVar2Name()
			}, (var1Value, var2Name) => this.executor.ISCAN(var1Value, var2Name));
        } else if (mnemonic === Mnemonic.OSCAN) {
            return this.beginInvoke({
				getArg0: () => this.getDynamicByteSequence(this.getVar1Value()),
				getArg1: () => this.getVar2Name()
			}, (var1Value, var2Name) => this.executor.OSCAN(var1Value, var2Name));
        } else if (mnemonic === Mnemonic.IOSTAT) {
            return this.beginInvoke({
				getArg0: () => this.getDynamicByteSequence(this.getVar1Value()),
				getArg1: () => this.getVar2Name()
			}, (var1Value, var2Name) => this.executor.IOSTAT(var1Value, var2Name));
        } else if (mnemonic === Mnemonic.IOREAD_B) {
            return this.beginInvoke({
				getArg0: () => this.getDynamicByteSequence(this.getVar1Value()),
				getArg1: () => this.getVar2Name()
			}, (var1Value, var2Name) => this.executor.IOREAD_B(var1Value, var2Name));
        } else if (mnemonic === Mnemonic.IOREAD_D) {
            return this.beginInvoke({
				getArg0: () => this.getDynamicByteSequence(this.getVar1Value()),
				getArg1: () => this.getVar2Name()
			}, (var1Value, var2Name) => this.executor.IOREAD_D(var1Value, var2Name));
        } else if (mnemonic === Mnemonic.IOREAD_X) {
            return this.beginInvoke({
				getArg0: () => this.getDynamicByteSequence(this.getVar1Value()),
				getArg1: () => this.getVar2Name()
			}, (var1Value, var2Name) => this.executor.IOREAD_X(var1Value, var2Name));
        } else if (mnemonic === Mnemonic.IOREAD_Q) {
            return this.beginInvoke({
				getArg0: () => this.getDynamicByteSequence(this.getVar1Value()),
				getArg1: () => this.getVar2Name()
			}, (var1Value, var2Name) => this.executor.IOREAD_Q(var1Value, var2Name));
        } else if (mnemonic === Mnemonic.IOWRITE_B) {
            return this.beginInvoke({
				getArg0: () => this.getDynamicByteSequence(this.getVar1Value()),
				getArg1: () => this.getVar2Value()
			}, (var1Value, var2Value) => this.executor.IOWRITE_B(var1Value, var2Value));
        } else if (mnemonic === Mnemonic.IOWRITE_D) {
            return this.beginInvoke({
				getArg0: () => this.getDynamicByteSequence(this.getVar1Value()),
				getArg1: () => this.getVar2Value()
			}, (var1Value, var2Value) => this.executor.IOWRITE_D(var1Value, var2Value));
        } else if (mnemonic === Mnemonic.IOWRITE_X) {
            return this.beginInvoke({
				getArg0: () => this.getDynamicByteSequence(this.getVar1Value()),
				getArg1: () => this.getVar2Value()
			}, (var1Value, var2Value) => this.executor.IOWRITE_X(var1Value, var2Value));
        } else if (mnemonic === Mnemonic.IOWRITE_Q) {
            return this.beginInvoke({
                getArg0: () => this.getDynamicByteSequence(this.getVar1Value()),
                getArg1: () => this.getVar2Value()
            }, (var1Value, var2Value) => this.executor.IOWRITE_Q(var1Value, var2Value));
        } else if (mnemonic === Mnemonic.IOFLUSH) {
            return this.beginInvoke({
                getArg0: () => this.getDynamicByteSequence(this.getVar1Value())
            }, (var1Value) => this.executor.IOFLUSH(var1Value));
        } else if (mnemonic === Mnemonic.IODEV_IDP) {
            return this.beginInvoke({
                getArg0: () => this.getDynamicByteSequence(this.getVar1Value()),
                getArg1: () => this.getVar2Name()
            }, (port, destinationRegister) => this.executor.IODEV_IDP(port, destinationRegister));
        } else if (mnemonic === Mnemonic.IODEV_IDS) {
            return this.beginInvoke({
                getArg0: () => this.getDynamicByteSequence(this.getVar1Value()),
                getArg1: () => this.getVar2Name()
            }, (port, destinationRegister) => this.executor.IODEV_IDS(port, destinationRegister));
        } else if (mnemonic === Mnemonic.IODEV_CLS) {
            return this.beginInvoke({
                getArg0: () => this.getDynamicByteSequence(this.getVar1Value()),
                getArg1: () => this.getVar2Name()
            }, (port, destinationRegister) => this.executor.IODEV_CLS(port, destinationRegister));
        } else if (mnemonic === Mnemonic.IODEV_CLSX) {
            return this.beginInvoke({
                getArg0: () => this.getDynamicByteSequence(this.getVar1Value()),
                getArg1: () => this.getVar2Name()
            }, (port, destinationRegister) => this.executor.IODEV_CLSX(port, destinationRegister));
        }
        
        else if (mnemonic === Mnemonic.PERF_INFO) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Name()
            }, (regName) => this.executor.PERF_INFO(regName));
        } else if (mnemonic === Mnemonic.MODEL_INFO) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Name()
            }, (regName) => this.executor.MODEL_INFO(regName));
        } else if (mnemonic === Mnemonic.SERIAL_NUMBER) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Name()
            }, (regName) => this.executor.SERIAL_NUMBER(regName));
        } else if (mnemonic === Mnemonic.TICKS) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Name()
            }, (regName) => this.executor.TICKS(regName));
        } else if (mnemonic === Mnemonic.MEMSIZE) {
            return this.beginInvoke({
                getArg0: () => this.getVar1Name()
            }, (regName) => this.executor.MEMSIZE(regName));
        } else {
            throw new Error('FetcherContext.invoke: Unknown mnemonic');
        }
    }
}