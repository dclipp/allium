import { FlagName } from './flag-name';

export class FlagHelper {
    public static TryGetFlagFromNumber(n: number, successCallback: (flagName: FlagName) => void): boolean {
        let success = false;
        if (n === 0) {
            success = true;
            successCallback(FlagName.Overflow);
        } else if (n === 1) {
            success = true;
            successCallback(FlagName.Underflow);
        } else if (n === 2) {
            success = true;
            successCallback(FlagName.OutOfBounds);
        } else if (n === 3) {
            success = true;
            successCallback(FlagName.RegisterSizeMismatch);
        } else if (n === 4) {
            success = true;
            successCallback(FlagName.IORejection);
        } else if (n === 5) {
            success = true;
            successCallback(FlagName.IllegalInstruction);
        } else if (n === 6) {
            success = true;
            successCallback(FlagName.IllegalArgument);
        }

        return success;
    }

    public static FlagArray(): Array<FlagName> {
        return [
            FlagName.Overflow,
            FlagName.Underflow,
            FlagName.OutOfBounds,
            FlagName.RegisterSizeMismatch,
            FlagName.IORejection,
            FlagName.IllegalInstruction,
            FlagName.IllegalArgument
        ]
    }

    public static GetFlagText(flag: FlagName): string {
        let str = '';

        switch (flag) {
            case FlagName.Overflow:
                str = 'overflow';
                break;
            case FlagName.Underflow:
                str = 'underflow';
                break;
            case FlagName.OutOfBounds:
                str = 'outofbounds';
                break;
            case FlagName.RegisterSizeMismatch:
                str = 'registersizemismatch';
                break;
            case FlagName.IORejection:
                str = 'iorejection';
                break;
            case FlagName.IllegalInstruction:
                str = 'illegalinstruction';
                break;
            case FlagName.IllegalArgument:
                str = 'illegalargument';
                break;
        }

        return str;
    }
}