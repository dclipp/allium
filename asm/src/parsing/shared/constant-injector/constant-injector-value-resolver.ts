import { DynamicByteSequence, ByteSequenceCreator, RealNumber } from '@allium/types';
import { ConstantInjectionKind } from './constant-injection-kind';

export class ConstantInjectorValueResolver {
    public static tryResolve(injectionKind: ConstantInjectionKind, injectionValue?: number): DynamicByteSequence | 'invalid' {
        let value: DynamicByteSequence | 'invalid' = 'invalid';

        if (injectionValue !== undefined) {
            switch (injectionKind) {
                case ConstantInjectionKind.Flag:
                    value = ByteSequenceCreator.Byte(injectionValue);
                    break;
                case ConstantInjectionKind.Vector:
                    value = ByteSequenceCreator.QuadByte(injectionValue);
                    break;
                case ConstantInjectionKind.Float:
                    value = RealNumber.encode(injectionValue);
                    break;
            }
        }

        return value;
    }

    // public static tryResolve(injectionKind: ConstantInjectionKind, injectionValue?: number): DynamicByteSequence | 'invalid' {
    //     let value: DynamicByteSequence | 'invalid' = 'invalid';

    //     if (injectionValue !== undefined) {
    //         switch (injectionKind) {
    //             case ConstantInjectionKind.Flag:
    //                 value = ByteSequenceCreator.Byte(injectionValue);
    //                 break;
    //             case ConstantInjectionKind.Vector:
    //             case ConstantInjectionKind.Float:
    //                 value = ByteSequenceCreator.QuadByte(injectionValue);
    //                 break;
    //         }
    //     }

    //     return value;
    // }
}