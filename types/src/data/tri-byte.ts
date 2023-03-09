import { ByteSequence } from './byte-sequence';

export interface TriByte extends ByteSequence<3> {
    readonly LENGTH: 3;
}
