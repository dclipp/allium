import { Mnemonic, VariableRegisterReference } from '@allium/types';
import { ConstantInjectionKind } from '../../../shared/constant-injector/constant-injection-kind';
import { AutoAddressRef } from '../../../shared/auto-address-ref/auto-address-ref';

export interface S3InstructionUnit {
    readonly tokenIndices: Array<number>;
    readonly lineIndex: number;
    
    asMnemonic(): Mnemonic;
    asRegRef(): VariableRegisterReference;
    asInlineValue(): number;
    asConstantInjector(): { readonly injectionKind: ConstantInjectionKind, hasValue: boolean, injectionValue?: number };
    asAutoAddressRef(): AutoAddressRef;
    asAliasRef(): { readonly aliasName: string };
}