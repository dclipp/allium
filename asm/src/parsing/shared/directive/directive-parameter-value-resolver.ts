import { DynamicByteSequence, ByteSequenceCreator } from '@allium/types';
import { Stage3Object } from '../../stages/stage-3/stage-3-object';
import { Stage4Object } from '../../stages/stage-4/stage-4-object';

export class DirectiveParameterValueResolver {
    public static tryResolve(parameterValue: string, stage3: Stage3Object, stage4: Stage4Object): DynamicByteSequence | 'invalid' {
        let value: DynamicByteSequence | 'invalid' = 'invalid';

        if (RegExp(/^([ \t]{0,})([0-9]+)([ \t]{0,})([qtdb]{0,1})$/).test(parameterValue)) { // Inline base-10 number
            const numericValue = Number.parseInt(parameterValue.trim().replace(/[qtdb]/g, ''));
            if (Number.isInteger(numericValue)) {
                const createSeq: (n: number) => DynamicByteSequence = parameterValue.endsWith('b')
                    ? (n) => ByteSequenceCreator.Byte(n)
                    : parameterValue.endsWith('d')
                    ? (n) => ByteSequenceCreator.DoubleByte(n)
                    : parameterValue.endsWith('t')
                    ? (n) => ByteSequenceCreator.TriByte(n)
                    : (n) => ByteSequenceCreator.QuadByte(n);

                value = createSeq(numericValue);
            }
        } else if (RegExp(/^([ \t]{0,})(0x)([ \t]{0,})([0-9]+)([ \t]{0,})([qtdb]{0,1})$/).test(parameterValue)) { // Inline base-16 number
            const numericValue = Number.parseInt(parameterValue.trim().replace(/[qtdb]/g, ''), 16);
            if (Number.isInteger(numericValue)) {
                const createSeq: (n: number) => DynamicByteSequence = parameterValue.endsWith('b')
                    ? (n) => ByteSequenceCreator.Byte(n)
                    : parameterValue.endsWith('d')
                    ? (n) => ByteSequenceCreator.DoubleByte(n)
                    : parameterValue.endsWith('t')
                    ? (n) => ByteSequenceCreator.TriByte(n)
                    : (n) => ByteSequenceCreator.QuadByte(n);

                value = createSeq(numericValue);
            }
        }

        return value;
    }
}