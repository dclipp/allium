export enum ConstantInjectionKind {
    Flag,
    Vector,
    Float
}

export const ConstantInjectionKindMap: {
    readonly flag: ConstantInjectionKind,
    readonly vec: ConstantInjectionKind.Vector,
    readonly float: ConstantInjectionKind.Float
} = {
    flag: ConstantInjectionKind.Flag,
    vec: ConstantInjectionKind.Vector,
    float: ConstantInjectionKind.Float
}