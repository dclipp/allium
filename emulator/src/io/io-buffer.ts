import { Byte, ByteSequenceCreator } from '@allium/types';

export class IoBuffer {
    public writableLength(): number {
        return this._bufferSize - this._uncommittedBytes.length;
    }

    public readableLength(): number {
        return this._committedBytes.length;
    }

    public commitWrites(): void {
        let count = 0;
        for (let i = 0; i < this._uncommittedBytes.length && this._committedBytes.length < this._bufferSize; i++) {
            count++;
        }

        if (count > 0) {
            this._uncommittedBytes.splice(0, count).forEach(b => {
                this._committedBytes.push(b);
            })
        }
    }

    public clearWrites(): void {
        if (this._uncommittedBytes.length > 0) {
            this._uncommittedBytes.splice(0, this._uncommittedBytes.length);
        }
    }

    public read(length: number): Array<Byte> {
        if (this._committedBytes.length >= length) {
            return this._committedBytes.splice(0, length);
        } else {
            throw new Error('Length exceeds available committed byte count');
        }
    }

    public write(data: Byte): void {
        if (this._uncommittedBytes.length < this._bufferSize) {
            this._uncommittedBytes.push(data);
        } else {
            throw new Error('The uncommitted byte buffer is full');
        }
    }

    public serialize(): {
        readonly committedBytes: Array<number>,
        readonly uncommittedBytes: Array<number>,
        readonly size: number
    } {
        return {
            committedBytes: this._committedBytes.map(b => ByteSequenceCreator.Unbox(b)),
            uncommittedBytes: this._uncommittedBytes.map(b => ByteSequenceCreator.Unbox(b)),
            size: this._bufferSize
        }
    }

    public constructor(bufferSize: number) {
        this._committedBytes = new Array<Byte>();
        this._uncommittedBytes = new Array<Byte>();
        this._bufferSize = bufferSize;
    }

    private readonly _committedBytes: Array<Byte>;
    private readonly _uncommittedBytes: Array<Byte>;
    private readonly _bufferSize: number;
}