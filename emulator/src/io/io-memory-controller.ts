import { DoubleByte, ByteSequenceCreator } from '@allium/types';

export class IoMemoryController {
    public readonly capacity: DoubleByte;

    public get available(): DoubleByte {
        return this.capacity.computeDifference(this._allocatedSize);
    }

    public allocate(size: DoubleByte): void {
        if (this.available.isGreaterThanOrEqualTo(size)) {
            this._allocatedSize = this._allocatedSize.computeSum(size);
        } else {
            throw new Error('io allocate: Not enough memory');
        }
    }

    public free(size: DoubleByte): void {
        if (this._allocatedSize.isGreaterThanOrEqualTo(size)) {
            this._allocatedSize = this._allocatedSize.computeDifference(size);
        } else {
            throw new Error('io free: size being freed is less than the total allocated size');
        }
    }

    public constructor(capacity: DoubleByte) {
        this.capacity = capacity.clone();
        this._allocatedSize = ByteSequenceCreator.DoubleByte(0);
    }

    private _allocatedSize: DoubleByte;
}