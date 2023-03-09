import { DynamicByteSequence, QuadByte, RegisterMask, Register } from '@allium/types';

export interface RegisterSet {
    /** Fetches the full 4-byte value of the register */
    readWhole: (register: Register) => QuadByte;

    /**
     * Fetches the masked value of the register and returns the result
     * as 4-byte sequence, with the 1st byte corresponding to the 1st byte of the mask,
     * and any bytes outside of the bounds of the mask represented by zero-byte values
     */
    readMasked: (register: Register, mask: RegisterMask) => DynamicByteSequence;

    /** Replaces the full value of the register with the provided value */
    writeWhole: (register: Register, value: QuadByte) => void;
    
    /**
     * Replaces the byte values of the register described by the mask with
     * the byte values of the provided value, beginning at the 1st byte of
     * the provided value
     */
    writeMasked: (register: Register, mask: RegisterMask, value: DynamicByteSequence) => void;

    /** Clears all registers and resets each value to zero */
    wipe: () => void;
}
