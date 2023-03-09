import { QuadByte, Byte, ByteSequenceCreator, DynamicByteSequence } from '@allium/types';
import { MemoryModule } from '@allium/arch';

class MemoryModuleByte {
    private _value: Byte;

    public readonly Address: QuadByte;

    public getValue(): Byte {
        return this._value;
    }

    public setValue(v: DynamicByteSequence): void {
        this._value = this._value.setBytes(v, 1);
    }

    public asByte(): Byte {
        return this._value.clone();
    }

    public constructor(address: QuadByte, value?: Byte) {
        this.Address = address.clone();
        if (!!value) {
            this._value = value.clone();
        } else {
            this._value = ByteSequenceCreator.Byte(0);
        }
    }
}

export abstract class MemoryModuleFoundation implements MemoryModule {
    protected _bytes = new Array<MemoryModuleByte>();

    public readonly SIZE: QuadByte;
    
    public read(address: QuadByte): Byte {
        return this._performRead(address);
    }

    public write(address: QuadByte, value: Byte): void {
        this._performWrite(address, value);
    }

    public wipe(): void {
        this._performWipe();
    }

    protected constructor(memorySize: QuadByte) {
        this.SIZE = memorySize.clone();
    }

    protected _performRead(address: QuadByte): Byte {
        const index = this._bytes.findIndex(b => b.Address.isEqualTo(address));
        if (index > -1) {
            return this._bytes[index].asByte();
        } else {
            this._bytes.push(new MemoryModuleByte(address));
            return ByteSequenceCreator.Byte(0);
        }
    }

    protected _performWrite(address: QuadByte, value: Byte): void {
        const index = this._bytes.findIndex(b => b.Address.isEqualTo(address));
        if (index > -1) {
            this._bytes[index].setValue(value);
        } else {
            this._bytes.push(new MemoryModuleByte(address, value));
        }
    }

    protected _performWipe(): void {
        this._bytes = new Array<MemoryModuleByte>();
    }

}