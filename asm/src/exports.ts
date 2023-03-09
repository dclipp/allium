import './type-extensions/array-extensions';
import './type-extensions/string-extensions';
import { FileMap } from './api-types/file-map';
import { ParseOptions } from './parsing/parse-options';
import { Parser } from './parsing/parser';
import { Compiler } from './compilation/compiler';
import { Assembly } from './api-types/assembly';
import { BuildOptions, DEFAULT_BUILD_OPTIONS } from './api-types/build-options';
import { SourceMapGenerator } from './api-types/source-map/source-map-generator';
import { ExtendedAsmMessage, ExtendedAsmMessageHelper } from './messages/extended-asm-message';
import { CompiledAssembly } from './compilation/compiled-assembly';
import { AssemblyEntryPoint } from './api-types/assembly-entry-point';

export { AssemblySettings, AssemblySettingsConstructorParams } from './api-types/assembly-settings/assembly-settings';
export { AssemblySourceImport } from './api-types/assembly-settings/assembly-source-import';
export { AssemblyEntryPoint } from './api-types/assembly-entry-point';
export { FileMap } from './api-types/file-map';
export { ParseOptions, DEFAULT_PARSE_OPTIONS } from './parsing/parse-options';
export { AsmMessage } from './messages/asm-message';
export { AsmMessageClassification } from './messages/asm-message-classification';
export { ASM_MESSAGES as MessageDefinitions } from './messages/asm-messages';
// export { CompiledObject } from './compilation/compiled-object';
export { Assembly } from './api-types/assembly';
export { BuildOptions, DEFAULT_BUILD_OPTIONS } from './api-types/build-options';
export { AssemblySourceMap } from './api-types/source-map/assembly-source-map';
export { SourceLine } from './api-types/source-map/source-line';
export { SourceEntity } from './api-types/source-map/source-entity';
export { SourceEntityKind } from './api-types/source-map/source-entity-kind';
export { ConstructDetails } from './api-types/source-map/construct-details';
export { LanguageConstructKind } from './api-types/source-map/language-construct-kind';
export { NativeDataType } from './api-types/source-map/native-data-type';
export { Parser } from './parsing/parser';
export { Compiler } from './compilation/compiler';
export { ExtendedAsmMessage, ExtendedAsmMessageHelper } from './messages/extended-asm-message';
export { AsmMessageHelper } from './messages/asm-message-helper';
export { ParsedAssembly } from './parsing/parsed-assembly';
export { SourceMapGenerator } from './api-types/source-map/source-map-generator';
export { Disassembler } from './disassembly/disassembler';

// export { JsCompiler } from './compilation/js-compiler';//TODO??
export class AlmAssembler {
    public static parse(fileMap: FileMap, options?: ParseOptions): {
        readonly messages: Array<ExtendedAsmMessage>;
        readonly succeeded: boolean;
        readonly parserOptionsUsed: ParseOptions;
    } {
        const output = Parser.parse(fileMap, options);
        return {
            messages: output.messages,
            succeeded: output.succeeded,
            parserOptionsUsed: output.parserOptionsUsed
        }
    }

    public static compile(fileMap: FileMap, options?: ParseOptions, entryPoint?: AssemblyEntryPoint): CompiledAssembly {
        const parserOutput = Parser.parse(fileMap, options);
        return Compiler.compile(parserOutput, entryPoint);
    }

    public static build(fileMap: FileMap, options?: Partial<BuildOptions>): Assembly {
        const messages = new Array<ExtendedAsmMessage>();
        const useOptions = !!options ?
            {
                generateSourceMap: options.generateSourceMap === true,
                treatOversizedInlineValuesAsWarnings: options.treatOversizedInlineValuesAsWarnings === true,
                oversizedInlineValueSizing: options.oversizedInlineValueSizing || 'min-required',
                useMockForExternalAddresses: options.useMockForExternalAddresses === true,
                baseAddressOffset: options.baseAddressOffset || 0,
                entryPoint: options.entryPoint
            }
         : DEFAULT_BUILD_OPTIONS;
        const parserOutput = Parser.parse(fileMap, useOptions);
        parserOutput.messages.forEach(m => messages.push(m));

        const compiledAssembly = Compiler.compile(parserOutput, useOptions.entryPoint);
        compiledAssembly.messages.forEach(m => messages.push(m));

        const sourceMap = useOptions.generateSourceMap ? SourceMapGenerator.generate(parserOutput, fileMap) : undefined;

        return {
            buildSucceeded: parserOutput.succeeded && compiledAssembly.succeeded,
            messages: ExtendedAsmMessageHelper.getDistinctMessages(messages),
            totalByteCount: compiledAssembly.programBytes.length,
            compilation: compiledAssembly,
            sourceMap: sourceMap
        }
    }
}