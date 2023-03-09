import { RegisterMask } from './register-mask';
import { VariableRegisterReference } from './variable-register-reference';
import { Register } from './register';
import { Byte } from '../data/byte';
import { DynamicByteSequence } from '../data/dynamic-byte-sequence';
import { ByteSequenceCreator } from '../data/byte-sequence-creator';
import { NamedRegisterMask } from './named-register-mask';

const _getRegisterKeyValues = function (): Array<{ name: string, value: number }> {
    const a = new Array<{ name: string, value: number }>();
    const names = Object.keys(Register).filter(k => !RegExp(/^[0-9]+$/).test(k));
    names.forEach((k, i) => {
        a.push({
            name: k.toLowerCase(),
            value: i
        });
    });
    return a;
}

const _getMaskKeyValues = function (): Array<{ name: string, shortName: string, value: number }> {
    const a = new Array<{ name: string, shortName: string, value: number }>();
    const names = Object.keys(NamedRegisterMask).filter(k => !RegExp(/^[0-9]+$/).test(k));
    names.forEach((k, i) => {
        a.push({
            name: k.toLowerCase(),
            shortName: '',
            value: i
        });
    });
    a[0].shortName = 'f';
    a[1].shortName = 'h';
    a[2].shortName = 'l';
    a[3].shortName = 'hl';
    a[4].shortName = 'lh';
    a[5].shortName = 'hh';
    a[6].shortName = 'll';
    a[7].shortName = 'hx';
    a[8].shortName = 'lx';
    a[9].shortName = 'u';

    return a;
}

const _getRegisterEnumValue = function (n: number): Register {
    const regValue = n & 15;

    return regValue as Register;
}

const _getRegisterMaskValue = function (n: number): RegisterMask {
    const byte1 = (n & 16) === 16;
    const byte2 = (n & 32) === 32;
    const byte3 = (n & 64) === 64;
    const byte4 = (n & 128) === 128;

    return RegisterMask({
        byte1: byte1,
        byte2: byte2,
        byte3: byte3,
        byte4: byte4
    })
}

export class RegisterHelper {
    /** Returns the VariableRegisterReference represented by a Byte value */
    public static GetRegisterReferenceFromByte(byte: Byte): VariableRegisterReference {
        const v = ByteSequenceCreator.Unbox(byte);
        let regRef: VariableRegisterReference = null;
        if (v > -1 && v < 256) {
            regRef = VariableRegisterReference.create(_getRegisterEnumValue(v), _getRegisterMaskValue(v));
        } else {
            throw new Error(`RegisterHelper.GetRegisterReferenceFromByte: ${v} is not a valid register reference`);
        }
     
     
        return regRef;
    }

    /** Returns the (lowercase) name of a register */
    public static GetRegisterName(register: Register): string {
        let str = '';

        switch (register) {
            case Register.InstructionPtr:
                str = 'instructionptr';
                break;
            case Register.Accumulator:
                str = 'accumulator';
                break;
            case Register.Monday:
                str = 'monday';
                break;
            case Register.Tuesday:
                str = 'tuesday';
                break;
            case Register.Wednesday:
                str = 'wednesday';
                break;
            case Register.Thursday:
                str = 'thursday';
                break;
            case Register.Friday:
                str = 'friday';
                break;
            case Register.G7:
                str = 'g7';
                break;
            case Register.G8:
                str = 'g8';
                break;
            case Register.G9:
                str = 'g9';
                break;
            case Register.G10:
                str = 'g10';
                break;
            case Register.G11:
                str = 'g11';
                break;
            case Register.G12:
                str = 'g12';
                break;
            case Register.G13:
                str = 'g13';
                break;
            case Register.G14:
                str = 'g14';
                break;
            case Register.StackPtr:
                str = 'stackptr';
                break;
        }

        return str;
    }

    /** Returns the (lowercase) name of a named register mask */
    public static GetMaskName(mask: NamedRegisterMask): {
        fullName: string,
        acronym: string
    } {
        let str = '';
        let acronym = '';

        switch (mask) {
            case NamedRegisterMask.Full:
                str = 'full';
                acronym = 'f';
                break;
            case NamedRegisterMask.High:
                str = 'high';
                acronym = 'h';
                break;
            case NamedRegisterMask.Low:
                str = 'low';
                acronym = 'l';
                break;
            case NamedRegisterMask.HighLow:
                str = 'highlow';
                acronym = 'hl';
                break;
            case NamedRegisterMask.LowHigh:
                str = 'lowhigh';
                acronym = 'lh';
                break;
            case NamedRegisterMask.HighHigh:
                str = 'highhigh';
                acronym = 'hh';
                break;
            case NamedRegisterMask.LowLow:
                str = 'lowlow';
                acronym = 'll';
                break;
            case NamedRegisterMask.ExtendedHigh:
                str = 'extendedhigh';
                acronym = 'hx';
                break;
            case NamedRegisterMask.ExtendedLow:
                str = 'extendedlow';
                acronym = 'lx';
                break;
            case NamedRegisterMask.Unnamed:
                str = 'unnamed';
                acronym = 'u';
                break;
        }

        return {
            fullName: str,
            acronym: acronym
        };
    }

    /**
     * Determines if the register or register reference points to the provided register reference
     * @param objectInQuestion The value to be examined
     * @param reference The known reference to which objectInQuestion will be compared
     * @param strict
     *  If true, both the register and mask must be an exact match in order to be considered
     *  a reference to provided register.
     *  If false, objectInQuestion will be considered a reference to the provided register as
     *  long as the registers match and the mask (if provided) is either an exact match or is
     *  a subset of the mask of the known reference
     * */
    public static IsReferenceToRegister(objectInQuestion: Register | VariableRegisterReference, reference: VariableRegisterReference, strict: boolean): boolean {
        if (RegisterHelper._isVariableRegisterReferenceArgument(objectInQuestion)) {
            if (objectInQuestion.register === reference.register) {
                if (strict) {
                    return reference.mask === objectInQuestion.mask;
                } else {
                    return true;
                }
            } else {
                return false;
            }
        } else { // objectInQuestion is a Register enum value
            if (objectInQuestion === reference.register) {
                if (strict) {
                    return reference.mask.name === NamedRegisterMask.Full;
                } else {
                    return true;
                }
            } else {
                return false;
            }
        }
    }

    /** Determines if the provided value has the same byte count as the given mask */
    public static doesValueFitMask(mask: RegisterMask, value: DynamicByteSequence): boolean {
        let isValueSizeOkay = false;

        switch (mask.name) {
            case NamedRegisterMask.Full:
                isValueSizeOkay = value.LENGTH === 4;
                break;
            case NamedRegisterMask.ExtendedHigh:    
            case NamedRegisterMask.ExtendedLow:
                isValueSizeOkay = value.LENGTH === 3;
                break;
            case NamedRegisterMask.High:
            case NamedRegisterMask.Low:
                isValueSizeOkay = value.LENGTH === 2;
                break;
            case NamedRegisterMask.HighLow:
            case NamedRegisterMask.LowHigh:
            case NamedRegisterMask.HighHigh:
            case NamedRegisterMask.LowLow:
                isValueSizeOkay = value.LENGTH === 1;
                break;
            case NamedRegisterMask.Unnamed:
                isValueSizeOkay = value.LENGTH === Object.keys(mask)
                    .filter(k => k.startsWith('byte'))
                    .map(k => (mask as any)[k] === true)
                    .filter(t => t === true).length
                break;
        }

        return isValueSizeOkay;
    }

    /** Converts a register or register reference to a VariableRegisterReference */
    public static toVariableRegisterReference(value: Register | VariableRegisterReference): VariableRegisterReference {
        if (RegisterHelper._isVariableRegisterReferenceArgument(value)) {
            return VariableRegisterReference.create(value.register, value.mask);
        } else { // objectInQuestion is a Register enum value
            return VariableRegisterReference.create(value, NamedRegisterMask.Full);
        }
    }

    public static parseRegisterNameFromString(candidate: string): Register | undefined {
        const lower = candidate.toLowerCase();
        const index = RegisterHelper._registerKeyValues.findIndex(x => x.name === lower);
        if (index > -1) {
            return RegisterHelper._registerKeyValues[index].value as Register;
        } else {
            return undefined;
        }
    }

    public static parseNamedRegisterMaskFromString(candidate: string): NamedRegisterMask | undefined {
        const lower = candidate.toLowerCase();
        const index = RegisterHelper._maskKeyValues.findIndex(x => x.name === lower);
        if (index > -1) {
            return RegisterHelper._maskKeyValues[index].value as NamedRegisterMask;
        } else {
            const shortIndex = RegisterHelper._maskKeyValues.findIndex(x => x.shortName === lower);
            if (shortIndex > -1) {
                return RegisterHelper._maskKeyValues[shortIndex].value as NamedRegisterMask;
            } else {
                return undefined;
            }
        }
    }

    public static parseRegisterMaskFromString(candidate: string): RegisterMask | undefined {
        const bits = candidate.replace(/[ \t]/g, '').match(/[0-1]/g);
        if (bits.length > 0 && bits.every(b => b === '1' || b === '0')) {
            return RegisterMask({
                byte1: bits[0] === '1',
                byte2: bits.length > 1 && bits[1] === '1',
                byte3: bits.length > 2 && bits[2] === '1',
                byte4: bits.length > 3 && bits[3] === '1'
            });
        } else {
            return undefined;
        }
    }

    public static getNumericFromRegisterReference(registerReference: VariableRegisterReference): number {
        let numeric = registerReference.register.valueOf();
        if (registerReference.mask.byte1) {
            numeric += 16;
        }
        if (registerReference.mask.byte2) {
            numeric += 32;
        }
        if (registerReference.mask.byte3) {
            numeric += 64;
        }
        if (registerReference.mask.byte4) {
            numeric += 128;
        }

        return numeric;
    }

    public static validateRegisterNumeric(registerNumeric: number): boolean {
        return registerNumeric > -1 && registerNumeric < 256 && (registerNumeric >> 4 > 0);
    }

    public static getRegisterReferenceFromNumeric(registerNumeric: number): VariableRegisterReference {
        if (registerNumeric > -1 && registerNumeric < 256) {
            return VariableRegisterReference.create(_getRegisterEnumValue(registerNumeric), _getRegisterMaskValue(registerNumeric));
        } else {
            throw new Error(`RegisterHelper.getRegisterReferenceFromNumeric: ${registerNumeric} is not a valid register numeric`);
        }
    }

    private static _isVariableRegisterReferenceArgument( o: any ) : o is VariableRegisterReference {
        return o['mask'] !== undefined;
    }

    private static readonly _registerKeyValues = _getRegisterKeyValues();
    private static readonly _maskKeyValues = _getMaskKeyValues();
}