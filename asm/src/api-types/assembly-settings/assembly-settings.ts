import { AssemblySourceImport } from './assembly-source-import';
import { AssemblyEntryPoint } from '../assembly-entry-point';

export interface AssemblySettingsConstructorParams {
    assemblyName: string,
    entryPoint?: AssemblyEntryPoint,
    sourceImports?: Array<AssemblySourceImport>,
    treatOversizedInlineValuesAsWarnings?: boolean,
    oversizedInlineValueSizing?: 'quad' | 'tri' | 'double' | 'min-required'
};

export class AssemblySettings {
    public readonly _AssemblySettings: '_AssemblySettings';
    public readonly assemblyName: string;
    public readonly entryPoint: AssemblyEntryPoint;
    public readonly sourceImports: Array<AssemblySourceImport>;
    public readonly treatOversizedInlineValuesAsWarnings: boolean;
    public readonly oversizedInlineValueSizing: 'quad' | 'tri' | 'double' | 'min-required';

    public update(values: Partial<AssemblySettings>): AssemblySettings {
        let constructorObject: AssemblySettingsConstructorParams = {
            assemblyName: '',
            entryPoint: undefined,
            sourceImports: new Array<AssemblySourceImport>(),
            treatOversizedInlineValuesAsWarnings: undefined,
            oversizedInlineValueSizing: undefined
        };

        Object.keys(constructorObject).forEach(k => {
            if (values[k] === undefined) {
                constructorObject[k] = this[k];
            } else {
                constructorObject[k] = values[k];
            }
        })


        return new AssemblySettings(constructorObject);
    }

    private constructor(values: AssemblySettingsConstructorParams) {
        this._AssemblySettings = '_AssemblySettings';
        this.assemblyName = values.assemblyName;
        this.entryPoint = values.entryPoint;
        this.sourceImports = values.sourceImports || [];
        this.treatOversizedInlineValuesAsWarnings = values.treatOversizedInlineValuesAsWarnings || false;
        this.oversizedInlineValueSizing = values.oversizedInlineValueSizing || 'min-required';
    }

    public static fromJson(json: string): AssemblySettings {
        return new AssemblySettings(JSON.parse(json) as AssemblySettingsConstructorParams);
    }

    public static build(params: AssemblySettingsConstructorParams): AssemblySettings {
        return new AssemblySettings(params);
    }

    public static default(): AssemblySettings {
        return new AssemblySettings({
            assemblyName: ''
        })
    }

    public static serialize(assemblySettings: AssemblySettings): string {
        return JSON.stringify(assemblySettings);
    }

    // public constructor(from?: string) {
    //     if (!!from) {
    //         const jsonObject = JSON.parse(from);
    //         this.assemblyName = jsonObject.assemblyName;
    //         this.sourceImports = jsonObject.sourceImports;
    //     }
    // }
}