import { QuadByte, Byte } from '@allium/types';
import { MemoryMutator, MutatorTarget } from '@allium/arch';

export class AlmMemoryMutator implements MemoryMutator {
    public readonly target: MutatorTarget;
    public readonly address: QuadByte;
    public readonly newValue: Byte;

    public static create(address: QuadByte, newValue: Byte): AlmMemoryMutator {
        return new AlmMemoryMutator(address, newValue);
    }

    private constructor(address: QuadByte, newValue: Byte) {
        this.target = MutatorTarget.Memory;
        this.address = address;
        this.newValue = newValue;
    }
}