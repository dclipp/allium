import {
    DynamicByteSequence, QuadByte, Byte, NamedRegisterMask,
    Register, RegisterHelper, ByteSequenceCreator, RegisterMask, ByteSequenceLength
} from '@allium/types';
import { RegisterSet } from '@allium/arch';

export class StandardRegisterSet implements RegisterSet {

    public readWhole(register: Register): QuadByte {
        return this._registerQuads[register.valueOf()].clone();
    }

    public writeWhole(register: Register, value: QuadByte): void {
        this.writeMasked(register, RegisterMask(NamedRegisterMask.Full), value);
    }

    public readMasked(register: Register, mask: RegisterMask): DynamicByteSequence {
        const registerQuad = this._registerQuads[register.valueOf()];
        return registerQuad.getMaskedBytes(mask).clone();
    }

    public writeMasked(register: Register, mask: RegisterMask, value: DynamicByteSequence): void {
        let effectiveValue: DynamicByteSequence = null;
        if (RegisterHelper.doesValueFitMask(mask, value)) {
            effectiveValue = value;
        } else if (mask.name === NamedRegisterMask.Full) {
            const nv = Number.parseInt(value.toString());
            if (value.LENGTH === 3) {
                effectiveValue = ByteSequenceCreator.QuadByte(
                    nv & 255
                    + ((nv << 8) & 255)
                    + ((nv << 16) & 255)
                    + ((nv << 24) & 255)
                );
            } else if (value.LENGTH === 2) {
                effectiveValue = ByteSequenceCreator.QuadByte(
                    nv & 255
                    + ((nv << 8) & 255)
                    + ((nv << 16) & 255)
                );
            } else { // value.LENGTH === 1
                effectiveValue = ByteSequenceCreator.QuadByte(
                    nv & 255
                );
            }
        }

        if (effectiveValue !== null) {
            const registerIndex = register.valueOf();
            const updates = new Array<{
                byteNumber: 1 | 2 | 3 | 4,
                updateValue: Byte
            }>();

            if (mask.byte1) {
                updates.push({
                    byteNumber: updates.length + 1 as ByteSequenceLength,
                    updateValue: effectiveValue.getByte(1)
                })
            };
            if (mask.byte2) {
                updates.push({
                    byteNumber: updates.length + 1 as ByteSequenceLength,
                    updateValue: effectiveValue.getByte(2)
                })
            };
            if (mask.byte3) {
                updates.push({
                    byteNumber: updates.length + 1 as ByteSequenceLength,
                    updateValue: effectiveValue.getByte(3)
                })
            };
            if (mask.byte4) {
                updates.push({
                    byteNumber: updates.length + 1 as ByteSequenceLength,
                    updateValue: effectiveValue.getByte(4)
                })
            };

            this.updateQuad(registerIndex, updates);
        } else {
            throw new Error('Mask/value size mismatch @RegisterSet.writeMasked');
        }
    }

    public wipe(): void {
        const zero = ByteSequenceCreator.QuadByte(0);
        this.writeWhole(Register.InstructionPtr, zero);
        this.writeWhole(Register.Accumulator, zero);
        this.writeWhole(Register.Monday, zero);
        this.writeWhole(Register.Tuesday, zero);
        this.writeWhole(Register.Wednesday, zero);
        this.writeWhole(Register.Thursday, zero);
        this.writeWhole(Register.Friday, zero);
    }

    public constructor() {
    }

    private updateQuad(index: number, updates: Array<{
        byteNumber: 1 | 2 | 3 | 4,
        updateValue: Byte
    }>) {
        let updatedQuad = this._registerQuads[index];
        updates.forEach(u => {
            updatedQuad = updatedQuad.setByte(u.updateValue, u.byteNumber);
        });
        this._registerQuads[index] = updatedQuad;
    }

    private _registerQuads = [
        ByteSequenceCreator.QuadByte(0),
        ByteSequenceCreator.QuadByte(0),
        ByteSequenceCreator.QuadByte(0),
        ByteSequenceCreator.QuadByte(0),
        ByteSequenceCreator.QuadByte(0),
        ByteSequenceCreator.QuadByte(0),
        ByteSequenceCreator.QuadByte(0),
        ByteSequenceCreator.QuadByte(0),
        ByteSequenceCreator.QuadByte(0),
        ByteSequenceCreator.QuadByte(0),
        ByteSequenceCreator.QuadByte(0),
        ByteSequenceCreator.QuadByte(0),
        ByteSequenceCreator.QuadByte(0),
        ByteSequenceCreator.QuadByte(0),
        ByteSequenceCreator.QuadByte(0),
        ByteSequenceCreator.QuadByte(0)
    ]

}