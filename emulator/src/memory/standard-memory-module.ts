import { MemoryModuleFoundation } from './memory-module-foundation';
import { QuadByte } from '@allium/types';

export class StandardMemoryModule extends MemoryModuleFoundation {
    public constructor(memorySize: QuadByte) {
        super(memorySize);
    }
}