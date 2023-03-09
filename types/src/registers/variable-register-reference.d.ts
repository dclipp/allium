import { RegisterMask } from './register-mask';
import { Register } from './register';
import { ByteSequenceLength } from '../data/byte-sequence-length';

export declare class VariableRegisterReference {
    public readonly register: Register;
    public readonly mask: RegisterMask;
    public readonly size: ByteSequenceLength;
    public static create(register: Register, mask?: RegisterMask): VariableRegisterReference;
}