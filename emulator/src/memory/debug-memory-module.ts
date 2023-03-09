import { MemoryModuleFoundation } from './memory-module-foundation';
import { QuadByte, Byte, ByteSequenceCreator } from '@allium/types';
import { MemoryHitStats } from '@allium/arch';

export class DebugMemoryModule extends MemoryModuleFoundation {
    private readonly _readHits: Array<number>;
    private readonly _writeHits: Array<number>;

    public getHits(): MemoryHitStats {
        const reads = new Map<QuadByte, number>();
        const distinctReads = new Array<number>();
        this._readHits.forEach(rh => {
            if (!distinctReads.some(dr => dr === rh)) {
                distinctReads.push(rh);
            }
        });
        distinctReads.forEach(dr => reads.set(ByteSequenceCreator.QuadByte(dr), this._readHits.filter(rh => rh === dr).length));

        const writes = new Map<QuadByte, number>();
        const distinctWrites = new Array<number>();
        this._writeHits.forEach(wh => {
            if (!distinctWrites.some(dw => dw === wh)) {
                distinctWrites.push(wh);
            }
        });
        distinctWrites.forEach(dw => writes.set(ByteSequenceCreator.QuadByte(dw), this._writeHits.filter(rh => rh === dw).length));

        return {
            reads: distinctReads.map(qb => ByteSequenceCreator.QuadByte(qb)),
            writes: distinctWrites.map(qb => ByteSequenceCreator.QuadByte(qb))
        }
    }

    public resetHitStats(): void {
        if (this._readHits.length > 0) {
            this._readHits.splice(0, this._readHits.length);
        }
        if (this._writeHits.length > 0) {
            this._writeHits.splice(0, this._writeHits.length);
        }
    }

    public read(address: QuadByte): Byte {
        const val = this._performRead(address);
        this._readHits.push(ByteSequenceCreator.Unbox(address));
        return val;
    }

    public write(address: QuadByte, value: Byte): void {
        this._performWrite(address, value);
        this._writeHits.push(ByteSequenceCreator.Unbox(address));
    }

    public readSilently(address: QuadByte): Byte {
        return this._performRead(address);
    }

    public writeSilently(address: QuadByte, value: Byte): void {
        this._performWrite(address, value);
    }

    public wipe(): void {
        this._performWipe();
        this.resetHitStats();
    }


    public constructor(memorySize: QuadByte) {
        super(memorySize);
        this._readHits = new Array<number>();
        this._writeHits = new Array<number>();
    }
}