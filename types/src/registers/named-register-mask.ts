export enum NamedRegisterMask {
    Full,
    High,
    Low,
    HighLow,
    LowHigh,
    HighHigh,
    LowLow,
    ExtendedHigh,
    ExtendedLow,
    Unnamed
}

export const namedRegisterMaskMap = new Map<number, NamedRegisterMask>([
    [0xF, NamedRegisterMask.Full],
    [0xC, NamedRegisterMask.High],
    [0x3, NamedRegisterMask.Low],
    [0x4, NamedRegisterMask.HighLow],
    [0x2, NamedRegisterMask.LowHigh],
    [0x8, NamedRegisterMask.HighHigh],
    [0x1, NamedRegisterMask.LowLow],
    [0xE, NamedRegisterMask.ExtendedHigh],
    [0x7, NamedRegisterMask.ExtendedLow]
])