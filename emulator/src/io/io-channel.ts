import { Byte } from '@allium/types';
import { IoBuffer } from './io-buffer';

export class IoChannel {
    public preproduce(data: Byte): void {
        this._buffer.write(data);
    }

    public preproducibleLength(): number {
        return this._buffer.writableLength();
    }

    public produce(): void {
        this._buffer.commitWrites();
    }

    public consume(count: number): Array<Byte> {
        return this._buffer.read(count);
    }

    public consumableLength(): number {
        return this._buffer.readableLength();
    }

    public serialize(): {
        readonly committedBytes: Array<number>,
        readonly uncommittedBytes: Array<number>,
        readonly size: number
    } {
        return this._buffer.serialize();
    }

    public readonly bufferSize: number;

    public constructor(bufferSize: number) {
        this._buffer = new IoBuffer(bufferSize);
        this.bufferSize = bufferSize;
    }

    private readonly _buffer: IoBuffer;
}