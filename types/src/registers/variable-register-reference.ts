import { RegisterMask } from './register-mask';
import { Register } from './register';
import { ByteSequenceLength } from '../data/byte-sequence-length';
import { NamedRegisterMask } from './named-register-mask';

export class VariableRegisterReference {
    public readonly register: Register;
    public readonly mask: RegisterMask;
    public readonly size: ByteSequenceLength;

    private constructor(register: Register, byte1: boolean, byte2: boolean, byte3: boolean, byte4: boolean) {
        this.register = register;

        this.mask = RegisterMask({
            byte1: byte1,
            byte2: byte2,
            byte3: byte3,
            byte4: byte4
        })

        this.size = this.mask.sequenceLength;
    }

    public static create(register: Register, mask?: {
        readonly byte1: boolean,
        readonly byte2: boolean,
        readonly byte3: boolean,
        readonly byte4: boolean
    } | NamedRegisterMask.Full
        | NamedRegisterMask.High
        | NamedRegisterMask.Low
        | NamedRegisterMask.HighLow
        | NamedRegisterMask.LowHigh
        | NamedRegisterMask.HighHigh
        | NamedRegisterMask.LowLow
        | NamedRegisterMask.ExtendedHigh
        | NamedRegisterMask.ExtendedLow): VariableRegisterReference {
        if (mask === undefined) {
            return new VariableRegisterReference(register, true, true, true, true);
        } else if (Object.getOwnPropertyNames(mask).includes('byte1')) {
            const m = mask as {
                readonly byte1: boolean,
                readonly byte2: boolean,
                readonly byte3: boolean,
                readonly byte4: boolean
            };
            return new VariableRegisterReference(register, m.byte1, m.byte2, m.byte3, m.byte4);
        } else {
            const nrm = mask as NamedRegisterMask;
            let byte1 = false;
            let byte2 = false;
            let byte3 = false;
            let byte4 = false;

            if (nrm === NamedRegisterMask.Full) {
                byte1 = true;
                byte2 = true;
                byte3 = true;
                byte4 = true;
            } else if (nrm === NamedRegisterMask.High) {
                byte1 = true;
                byte2 = true;
            } else if (nrm === NamedRegisterMask.Low) {
                byte3 = true;
                byte4 = true;
            } else if (nrm === NamedRegisterMask.HighLow) {
                byte2 = true;
            } else if (nrm === NamedRegisterMask.LowHigh) {
                byte3 = true;
            } else if (nrm === NamedRegisterMask.HighHigh) {
                byte1 = true;
            } else if (nrm === NamedRegisterMask.LowLow) {
                byte4 = true;
            } else if (nrm === NamedRegisterMask.ExtendedHigh) {
                byte1 = true;
                byte2 = true;
                byte3 = true;
            } else if (nrm === NamedRegisterMask.ExtendedLow) {
                byte2 = true;
                byte3 = true;
                byte4 = true;
            }

            return new VariableRegisterReference(register, byte1, byte2, byte3, byte4);
        }
    }
}