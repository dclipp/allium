import { ByteSequence } from './byte-sequence';

export interface DoubleByte extends ByteSequence<2> {
    readonly LENGTH: 2;
}
