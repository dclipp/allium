import { ByteSequence } from './byte-sequence';

export interface QuadByte extends ByteSequence<4> {
    readonly LENGTH: 4;
}
