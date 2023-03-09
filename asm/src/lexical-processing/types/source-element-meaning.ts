export enum SourceElementMeaning {
    BlockName,
    Mnemonic,
    ConstantInjectorKey,
    ConstantInjectorValue,
    RegisterName,
    NamedRegisterMask,
    UnnamedRegisterMask,

    AutoAddressRefTargetLocalLabel,
    AutoAddressRefTargetEmbeddedLabel,
    AutoAddressRefTargetExternalLabel,
    AutoAddressRefExternalImportDirectiveLineIndex,
    AutoAddressRefTargetAddress,
    AutoAddressRef,

    InlineUnsignedNumber,
    InlineSignedNumber,
    InlineFloatNumber,

    /** Numeric value is the enum value of DirectiveCommand */
    DirectiveCommand,
    DirectiveReceiver,
    DirectiveParameter,

    /** Numeric value represents the lineIndex of the directive which declares the alias */
    AliasReference,

    Comment
}