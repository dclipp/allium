import { DynamicByteSequence, VariableRegisterReference, NamedRegisterMask, RegisterMask, Register } from '@allium/types';
import { RegisterMutator, MutatorTarget } from '@allium/arch';

export class AlmRegisterMutator implements RegisterMutator {
    public readonly target: MutatorTarget;
    public readonly register: Register;
    public readonly mask: RegisterMask;
    public readonly newValue: DynamicByteSequence;

    public static forRegister(register: Register, value: DynamicByteSequence): AlmRegisterMutator {
        return new AlmRegisterMutator(register, RegisterMask(NamedRegisterMask.Full), value);
    }

    public static forVariable(registerReference: VariableRegisterReference, value: DynamicByteSequence): AlmRegisterMutator {
        return new AlmRegisterMutator(registerReference.register, registerReference.mask, value);
    }

    private constructor(register: Register, mask: RegisterMask, newValue: DynamicByteSequence) {
		this.target = MutatorTarget.Register;
        this.register = register;
        this.mask = {
            byte1: mask.byte1,
            byte2: mask.byte2,
            byte3: mask.byte3,
            byte4: mask.byte4,
            name: mask.name,
            sequenceLength: mask.sequenceLength
        };
        this.newValue = newValue;
    }
}