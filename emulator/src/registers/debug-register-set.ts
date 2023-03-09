import {
    DynamicByteSequence, QuadByte, Byte, NamedRegisterMask,
    Register, RegisterHelper, VariableRegisterReference,
    ByteSequenceCreator,
    RegisterMask,
    ByteSequenceLength
} from '@allium/types';
import { RegisterHitStats, RegisterHitsByMask, RegisterHitStatsElement, RegisterSet } from '@allium/arch';

export class DebugRegisterSet implements RegisterSet {
    private _readHits: Array<VariableRegisterReference>;
    private _writeHits: Array<VariableRegisterReference>;

    public readWhole(register: Register): QuadByte {
        this._readHits.push(VariableRegisterReference.create(register, RegisterMask(NamedRegisterMask.Full)));
        return this._registerQuads[register.valueOf()].clone();
    }

    public writeWhole(register: Register, value: QuadByte): void {
        this._writeHits.push(VariableRegisterReference.create(register, RegisterMask(NamedRegisterMask.Full)));
        this.writeMasked(register, RegisterMask(NamedRegisterMask.Full), value);
    }

    public readMasked(register: Register, mask: RegisterMask): DynamicByteSequence {
        return this.doRead(register, mask, true);
    }

    public readSilently(register: Register, mask: RegisterMask): DynamicByteSequence {
        return this.doRead(register, mask, false);
    }

    public writeMasked(register: Register, mask: RegisterMask, value: DynamicByteSequence): void {
        this.doWrite(register, mask, value, true);
    }

    public writeSilently(register: Register, mask: RegisterMask, value: DynamicByteSequence): void {
        this.doWrite(register, mask, value, false);
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
        this.resetHitStats();
    }

    public getHits(): RegisterHitStats {
        const reads = new Map<VariableRegisterReference, number>();
        const distinctReads = new Array<VariableRegisterReference>();
        this._readHits.forEach(rh => {
            if (!distinctReads.some(dr => RegisterHelper.IsReferenceToRegister(dr, rh, true))) {
                distinctReads.push(rh);
            }
        });

        const writes = new Map<VariableRegisterReference, number>();
        const distinctWrites = new Array<VariableRegisterReference>();
        this._writeHits.forEach(wh => {
            if (!distinctWrites.some(dw => RegisterHelper.IsReferenceToRegister(dw, wh, true))) {
                distinctWrites.push(wh);
            }
        });
        distinctWrites.forEach(dr => writes.set(dr, this._writeHits.filter(rh =>RegisterHelper.IsReferenceToRegister(dr, rh, true)).length));

        return this.filterZeroCountRegisterHits([{
            register: Register.InstructionPtr,
            reads: this.getHitsByMask(distinctReads.filter(dr => dr.register === Register.InstructionPtr)),
            writes: this.getHitsByMask(distinctWrites.filter(dw => dw.register === Register.InstructionPtr))
        }, {
            register: Register.Accumulator,
            reads: this.getHitsByMask(distinctReads.filter(dr => dr.register === Register.Accumulator)),
            writes: this.getHitsByMask(distinctWrites.filter(dw => dw.register === Register.Accumulator))
        }, {
            register: Register.Monday,
            reads: this.getHitsByMask(distinctReads.filter(dr => dr.register === Register.Monday)),
            writes: this.getHitsByMask(distinctWrites.filter(dw => dw.register === Register.Monday))
        }, {
            register: Register.Tuesday,
            reads: this.getHitsByMask(distinctReads.filter(dr => dr.register === Register.Tuesday)),
            writes: this.getHitsByMask(distinctWrites.filter(dw => dw.register === Register.Tuesday))
        }, {
            register: Register.Wednesday,
            reads: this.getHitsByMask(distinctReads.filter(dr => dr.register === Register.Wednesday)),
            writes: this.getHitsByMask(distinctWrites.filter(dw => dw.register === Register.Wednesday))
        }, {
            register: Register.Thursday,
            reads: this.getHitsByMask(distinctReads.filter(dr => dr.register === Register.Thursday)),
            writes: this.getHitsByMask(distinctWrites.filter(dw => dw.register === Register.Thursday))
        }, {
            register: Register.Friday,
            reads: this.getHitsByMask(distinctReads.filter(dr => dr.register === Register.Friday)),
            writes: this.getHitsByMask(distinctWrites.filter(dw => dw.register === Register.Friday))
        }])
    }

    public resetHitStats(): void {
        if (this._readHits.length > 0) {
            this._readHits.splice(0, this._readHits.length);
        }
        if (this._writeHits.length > 0) {
            this._writeHits.splice(0, this._writeHits.length);
        }
    }

    public constructor() {
        this._readHits = new Array<VariableRegisterReference>();
        this._writeHits = new Array<VariableRegisterReference>();
    }

    private doRead(register: Register, mask: RegisterMask, recordHit: boolean): DynamicByteSequence {
        if (recordHit) {
            this._readHits.push(VariableRegisterReference.create(register, mask));
        }
        const registerQuad = this._registerQuads[register.valueOf()];
        return registerQuad.getMaskedBytes(mask).clone();
    }

    private doWrite(register: Register, mask: RegisterMask, value: DynamicByteSequence, recordHit: boolean): void {
        if (recordHit) {
            this._writeHits.push(VariableRegisterReference.create(register, mask));
        }
        
        let effectiveValue: DynamicByteSequence = null;
        if (RegisterHelper.doesValueFitMask(mask, value)) {
            effectiveValue = value;
        } else if (mask === RegisterMask(NamedRegisterMask.Full)) {
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

    private getHitsByMask(counts: Array<VariableRegisterReference>): RegisterHitsByMask {
        return {
            full: counts.filter(c => c.mask.name === NamedRegisterMask.Full).length,
            hh: counts.filter(c => c.mask.name === NamedRegisterMask.HighHigh).length,
            hl: counts.filter(c => c.mask.name === NamedRegisterMask.HighLow).length,
            lh: counts.filter(c => c.mask.name === NamedRegisterMask.LowHigh).length,
            ll: counts.filter(c => c.mask.name === NamedRegisterMask.LowLow).length,
            COUNT: counts.length
        }
    }

    private filterZeroCountRegisterHits(registerHitStats: RegisterHitStats): RegisterHitStats {
        const filteredHitStats = new Array<RegisterHitStatsElement>();
        registerHitStats.forEach(rhs => {
            if (rhs.reads.COUNT > 0 || rhs.writes.COUNT > 0) {
                filteredHitStats.push(rhs);
            }
        })
        return filteredHitStats;
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
