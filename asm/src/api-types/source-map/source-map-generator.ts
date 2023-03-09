import { AssemblySourceMap } from './assembly-source-map';
import { ParsedAssembly } from '../../parsing/parsed-assembly';
import { Lexer } from '../../lexical-processing/lexer';
import { FileMap, normalizeFileMap } from '../file-map';
import { SourceEntity } from './source-entity';
import { SourceLine } from './source-line';
import { QuadByte, ByteSequenceLength, ByteSequenceCreator, INSTRUCTION_BYTE_COUNT } from '@allium/types';
import { LexicalRelationshipType } from '../../lexical-processing/types/lexical-relationship-type';
import { LexemeKind } from '../../lexical-processing/types/lexeme-kind';
import { SourceEntityKind } from './source-entity-kind';
import { ConstructDetails } from './construct-details';
import { SourceElement } from '../../lexical-processing/types/source-element';
import { LanguageConstructKind } from './language-construct-kind';
import { SourceElementMeaning } from '../../lexical-processing/types/source-element-meaning';
import { MachineDataType } from '../../lexical-processing/types/machine-data-type';
import { NativeDataType } from './native-data-type';
import { AsmMessageClassification } from '../../messages/asm-message-classification';
import { ExtendedAsmMessage } from '../../messages/extended-asm-message';
import { Lexeme } from '../../lexical-processing/types/lexeme';
import { SourceMapSerializer } from './source-map-serializer';

export class SourceMapGenerator {
    public static generate(parsedObject: ParsedAssembly, fileMap: FileMap): AssemblySourceMap {
        const entities = SourceMapGenerator.buildEntities(parsedObject, normalizeFileMap(fileMap));// new Array<SourceEntity>();
        const entitiesByObject = SourceMapGenerator.groupBy(entities, (e) => e.objectName);
        const allLines = entitiesByObject.map(e => {
            return SourceMapGenerator.groupBy(e.values, (v) => v.lineIndex).map(x => {
                return {
                    objectName: e.key,
                    lineIndex: x.key,
                    entities: x.values
                }
            })
        }).reduce((x, y) => x.concat(y), [])

        return {
            LINES: allLines,
            HAS_ERRORS: !parsedObject.succeeded,
            MESSAGES: parsedObject.messages,
            getLineByAddress: (address: QuadByte) => {
                const location = SourceMapGenerator.findInstructionLocation(parsedObject, address);
                let line: SourceLine = undefined;
                if (!!location && location.lineIndexWithinObject > -1) {
                    line = allLines.find(ln => ln.objectName === location.objectName && ln.lineIndex === location.lineIndexWithinObject);
                }
                return line;
            },
            findReferencesToEntity: (id: string) => {
                return entities.filter(e => e.referencesToThis.includes(id));
            },
            findEntitiesReferencedBy: (id: string) => {
                const entity = entities.find(e => e.id === id);
                if (!!entity) {
                    return entity.referencesToThis.map(r => entities.find(e => e.id === r));
                } else {
                    return [];
                }
            },
            getGroupMembers: (groupId: string) => {
                return entities.filter(e => e.group === groupId);
            },
            getAddressForLine: (objectName: string, lineIndex: number) => {
                let address: QuadByte | 'not-an-instruction' = 'not-an-instruction';

                const globalPass = parsedObject.globalPasses.find(gp => gp.objectName === objectName);
                if (!!globalPass) {
                    const actualLineIndex = SourceMapGenerator.getNumericPropertyOrMinus1(
                        parsedObject.entryPoint.instructionMap.findByOriginalIndex(lineIndex), o => o.reorderedIndex);

                    const instructionLine = globalPass.stage3.instructionLines.find(il => il.lineIndex === actualLineIndex);
                    if (!!instructionLine && !!instructionLine.mnemonic) {
                        const instruction = globalPass.stage5.instructions.find(i => i.mnemonicTokenIndex === instructionLine.mnemonic.tokenIndices[0]);
                        if (!!instruction) {
                            address = instruction.address.clone();
                        }
                    }
                }
                
                return address;
            },
            findEntityById: (id: string) => {
                let entity: SourceEntity | 'not-found' = 'not-found';
                for (let i = 0; i < allLines.length && entity === 'not-found'; i++) {
                    const targetEntity = allLines[i].entities.find(e => e.id === id);
                    if (!!targetEntity) {
                        entity = targetEntity;
                    }
                }
                return entity;
            },
            toFileContent: () => {
                return SourceMapSerializer.serialize(allLines);
            }
        }
    }

    private static getNumericPropertyOrMinus1<T>(o: T | undefined, selector: (o: T) => number): number {
        if (o === undefined) {
            return -1;
        } else {
            return selector(o);
        }
    }

    private static findInstructionLocation(parsedObject: ParsedAssembly, address: QuadByte): {
        lineIndexWithinObject: number,
        objectName: string
    } {
        const runtimeInstructionIndex = ByteSequenceCreator.Unbox(address) / INSTRUCTION_BYTE_COUNT;
        const mapEntry = parsedObject.entryPoint.instructionMap.findByReorderedIndex(runtimeInstructionIndex);
        const instructionIndex = SourceMapGenerator.getNumericPropertyOrMinus1(mapEntry, o => o.originalIndex);

        let lineIndex = -1;
        let objectName = '';

        if (instructionIndex > -1) {
            const allInstructionTokens = parsedObject.globalPasses.map(gp => {
                return gp.stage4.instructionLines.map((il, ili) => {
                    return {
                        objectName: gp.objectName,
                        instructionLineIndexWithinObject: il.lineIndex
                    };
                }).filter(x => x !== null)
            }).reduce((x, y) => x.concat(y), []).sort((a, b) => {
                const remapA = parsedObject.entryPoint.instructionMap.findByLineIndex(a.instructionLineIndexWithinObject, a.objectName);
                const remapB = parsedObject.entryPoint.instructionMap.findByLineIndex(b.instructionLineIndexWithinObject, b.objectName);
                return remapA.reorderedIndex - remapB.reorderedIndex;
            });

            const targetInstruction = allInstructionTokens[runtimeInstructionIndex];
            if (!!targetInstruction) {
                const globalPass = parsedObject.globalPasses.find(gp => gp.objectName === targetInstruction.objectName);
                const instructionLine = globalPass.stage3.instructionLines.find(il => il.lineIndex === targetInstruction.instructionLineIndexWithinObject);
                if (!!instructionLine) {
                    lineIndex = instructionLine.lineIndex;
                    objectName = targetInstruction.objectName;
                }
            }
        }

        return {
            lineIndexWithinObject: lineIndex,
            objectName: objectName
        };
    }

    private static buildEntities(parsedObject: ParsedAssembly, fileMap: FileMap): Array<SourceEntity> {
        const workingEntities = new Array<{
            objectName: string;
            id: string;
            lineIndex: number;
            startPosition: number;
            endPosition: number;
            kind: SourceEntityKind;
            text: string;
            constructDetails: ConstructDetails | 'none';
            group?: string;
            referencesFromThis: Array<string>;
            referencesToThis: Array<string>;
            messages: Array<ExtendedAsmMessage>
        }>();

        const associationRelationships = new Array<{ groupId: string, lexemeIds: Array<string> }>();
        parsedObject.globalPasses.forEach((gp, i, arr) => {
            const externalPasses = arr.filter(a => a.objectName !== gp.objectName);
            const currentFileContent = fileMap.find(f => f.referenceName === gp.objectName).fileContent;
            Lexer.getLexemesForObject(i, currentFileContent, gp, externalPasses).forEach(lx => {
                if (SourceMapGenerator.validateLexeme(lx, parsedObject.messages, gp.objectName, currentFileContent)) {
                    workingEntities.push({
                        objectName: gp.objectName,
                        id: lx.id,
                        lineIndex: lx.lineIndex,
                        startPosition: lx.startPosition,
                        endPosition: lx.endPosition,
                        kind: SourceMapGenerator._SOURCE_ENTITY_KIND_MAP.find(k => k.lexemeKind === lx.kind).sourceEntityKind,
                        text: lx.text,
                        constructDetails: SourceMapGenerator.mapSourceElementToConstructDetails(lx.sourceElement),
                        group: undefined,
                        referencesFromThis: lx.relationshipOrigins.filter(ro => ro.type === LexicalRelationshipType.ProvisionOfValue).map(ro => ro.toId),
                        referencesToThis: [],
                        messages: SourceMapGenerator.getMessagesForEntity(lx.startPosition, lx.endPosition, parsedObject.messages)
                    });

                    const associations = lx.kind === LexemeKind.Comment ? [] : lx.relationshipOrigins.filter(ro => ro.type === LexicalRelationshipType.Association);
                    if (associations.length > 0) {
                        associations.forEach(a => {
                            const arIndex = associationRelationships.findIndex(ar => ar.lexemeIds.includes(lx.id));
                            if (arIndex > -1) {
                                associationRelationships[arIndex].lexemeIds.push(a.toId);
                            } else {
                                associationRelationships.push({
                                    groupId: SourceMapGenerator.generateGroupId(i, lx.lineIndex, lx.startPosition),
                                    lexemeIds: [lx.id, a.toId]
                                })
                            }
                        })
                    }
                } else {
                    workingEntities.push({
                        objectName: gp.objectName,
                        id: lx.id,
                        lineIndex: lx.lineIndex,
                        startPosition: lx.startPosition,
                        endPosition: lx.endPosition,
                        kind: 'garbage',
                        text: lx.text,
                        constructDetails: 'none',
                        group: undefined,
                        referencesFromThis: lx.relationshipOrigins.filter(ro => ro.type === LexicalRelationshipType.ProvisionOfValue).map(ro => ro.toId),
                        referencesToThis: [],
                        messages: SourceMapGenerator.getMessagesForEntity(lx.startPosition, lx.endPosition, parsedObject.messages)
                    });
                }
            })
        });

        workingEntities.forEach((we, i, arr) => {
            const preceedingConstructDetails = i > 0
                ? arr[i - 1].constructDetails
                : 'none';
            if (we.kind === 'garbage' && preceedingConstructDetails !== 'none' && arr[i - 1].text === '.' && preceedingConstructDetails.kind === 'block-name') {
                arr[i].kind = 'language-construct';
                arr[i].constructDetails = {
                    kind: preceedingConstructDetails.kind,
                    dataType: preceedingConstructDetails.dataType,
                    nativeByteLength: preceedingConstructDetails.nativeByteLength === 'none'
                        ? 'none'
                        : preceedingConstructDetails.nativeByteLength,
                    numericValue: preceedingConstructDetails.numericValue
                };
                arr[i].referencesFromThis = arr[i - 1].referencesFromThis.map(r => r);
                arr[i].referencesToThis = arr[i - 1].referencesToThis.map(r => r);
                arr[i].group = arr[i - 1].group;
                arr[i - 1].constructDetails = 'none';
                arr[i - 1].referencesFromThis = [];
                arr[i - 1].referencesToThis = [];
            }
        })

        workingEntities.forEach((we, i, arr) => {
            if (we.referencesFromThis.length > 0) {
                arr.filter(ew => ew.id !== we.id && we.referencesFromThis.includes(ew.id)).forEach(ew => {
                    ew.referencesToThis.push(we.id);
                })
            }
        })

        associationRelationships.forEach(ar => {
            ar.lexemeIds.distinct().forEach(li => {
                const weIndex = workingEntities.findIndex(we => we.id === li);
                if (weIndex > -1) {
                    workingEntities[weIndex].group = ar.groupId;
                }
            })
        })

        return workingEntities;
    }
    
    private static mapSourceElementToConstructDetails(sourceElement: SourceElement | 'none'): ConstructDetails | 'none' {
        if (sourceElement === 'none') {
            return 'none';
        } else {
            return {
                kind: SourceMapGenerator._LANGUAGE_CONSTRUCT_KIND_MAP.find(m => m.meaning === sourceElement.meaning).kind,
                dataType: SourceMapGenerator._DATA_TYPE_MAP.find(t => t.machineType === sourceElement.machineDataType).nativeType,
                nativeByteLength: sourceElement.byteLength === 'less-than-1' || sourceElement.byteLength === 0
                    ? 'none'
                    : sourceElement.byteLength as ByteSequenceLength,
                numericValue: sourceElement.numericValue
            }
        }
    }

    private static generateGroupId(fileIndex: number, lineIndex: number, firstElementStartPosition: number): string {
        return `${fileIndex}/${lineIndex}/g${firstElementStartPosition}`;
    }

    private static groupBy<T, U>(list: Array<T>, keySelector: (v: T) => U): Array<{ key: U, values: Array<T> }> {
        const groups = new Array<{ key: U, values: Array<T> }>();
        list.forEach(x => {
            const key = keySelector(x);
            const indexOfGroup = groups.findIndex(g => g.key === key);
            if (indexOfGroup > -1) {
                groups[indexOfGroup].values.push(x);
            } else {
                groups.push({
                    key: key,
                    values: [x]
                })
            }
        })
        return groups;
    }

    private static lexemeHasFailureMessage(lexemeStartPosition: number, lexemeEndPosition: number, messages: Array<ExtendedAsmMessage>): boolean {
        return messages.some(m => (m.classification === AsmMessageClassification.Critical || m.classification === AsmMessageClassification.Fatal)
            && !!m.contentCoordinates && m.contentCoordinates.startPosition <= lexemeStartPosition && m.contentCoordinates.endPosition >= lexemeEndPosition);
    }

    private static getMessagesForEntity(startPosition: number, endPosition: number, messages: Array<ExtendedAsmMessage>): Array<ExtendedAsmMessage> {
        return messages.filter(m => !!m.contentCoordinates && m.contentCoordinates.startPosition <= startPosition && m.contentCoordinates.endPosition >= endPosition);
    }

    private static validateLexeme(lexeme: Lexeme, messages: Array<ExtendedAsmMessage>, objectName: string, fileContent: string): boolean {
        if (lexeme.sourceElement === 'none' && lexeme.kind === LexemeKind.SourceElement
            && !SourceMapGenerator.lexemeHasFailureMessage(lexeme.startPosition, lexeme.endPosition, messages)) {
            // return PublicMessageHelper.createFromAsmMessage(AsmMessageHelper.generateMessage(
            //     ASM_MESSAGES.Parser.StructuralView.InvalidContent,//TODO
            //     { startPosition: lexeme.startPosition, endPosition: lexeme.endPosition }
            // ), fileContent, objectName);
            return false;
            // throw new Error(`Invalid lexeme: ${JSON.stringify(lx)}, file: ${gp.objectName}`)
        } else {
            return true;
        }
    }

    private static readonly _SOURCE_ENTITY_KIND_MAP: Array<{ lexemeKind: LexemeKind, sourceEntityKind: SourceEntityKind }> = [
        {
            lexemeKind: LexemeKind.SpaceSequence,
            sourceEntityKind: 'space-sequence'
        },
        {
            lexemeKind: LexemeKind.TabSequence,
            sourceEntityKind: 'tab-sequence'
        },
        {
            lexemeKind: LexemeKind.GrammaticalElement,
            sourceEntityKind: 'punctuation'
        },
        {
            lexemeKind: LexemeKind.SourceElement,
            sourceEntityKind: 'language-construct'
        },
        {
            lexemeKind: LexemeKind.Newline,
            sourceEntityKind: 'newline'
        },
        {
            lexemeKind: LexemeKind.Comment,
            sourceEntityKind: 'comment'
        }
    ]

    private static readonly _LANGUAGE_CONSTRUCT_KIND_MAP: Array<{ meaning: SourceElementMeaning, kind: LanguageConstructKind }> = [
        {
            meaning: SourceElementMeaning.BlockName,
            kind: 'block-name'
        },
        {
            meaning: SourceElementMeaning.Mnemonic,
            kind: 'mnemonic'
        },
        {
            meaning: SourceElementMeaning.ConstantInjectorKey,
            kind: 'constant-injector-key'
        },
        {
            meaning: SourceElementMeaning.ConstantInjectorValue,
            kind: 'constant-injector-value'
        },
        {
            meaning: SourceElementMeaning.RegisterName,
            kind: 'register-name'
        },
        {
            meaning: SourceElementMeaning.NamedRegisterMask,
            kind: 'named-register-mask'
        },
        {
            meaning: SourceElementMeaning.UnnamedRegisterMask,
            kind: 'unnamed-register-mask'
        },
        {
            meaning: SourceElementMeaning.AutoAddressRefTargetLocalLabel,
            kind: 'auto-address-ref-target-local-label'
        },
        {
            meaning: SourceElementMeaning.AutoAddressRefTargetEmbeddedLabel,
            kind: 'auto-address-ref-target-embedded-label'
        },
        {
            meaning: SourceElementMeaning.AutoAddressRefTargetExternalLabel,
            kind: 'auto-address-ref-target-external-label'
        },
        {
            meaning: SourceElementMeaning.AutoAddressRefExternalImportDirectiveLineIndex,
            kind: 'auto-address-ref-directive-line-index'
        },
        {
            meaning: SourceElementMeaning.AutoAddressRefTargetAddress,
            kind: 'auto-address-ref-target-address'
        },
        {
            meaning: SourceElementMeaning.AutoAddressRef,
            kind: 'auto-address-ref'
        },
        {
            meaning: SourceElementMeaning.InlineUnsignedNumber,
            kind: 'inline-unsigned-number'
        },
        {
            meaning: SourceElementMeaning.InlineSignedNumber,
            kind: 'inline-signed-number'
        },
        {
            meaning: SourceElementMeaning.InlineFloatNumber,
            kind: 'inline-float-number'
        },
        {
            meaning: SourceElementMeaning.DirectiveCommand,
            kind: 'directive-command'
        },
        {
            meaning: SourceElementMeaning.DirectiveReceiver,
            kind: 'directive-receiver'
        },
        {
            meaning: SourceElementMeaning.DirectiveParameter,
            kind: 'directive-parameter'
        },
        {
            meaning: SourceElementMeaning.AliasReference,
            kind: 'alias-reference'
        },
        {
            meaning: SourceElementMeaning.Comment,
            kind: 'comment'
        }
    ]

    private static readonly _DATA_TYPE_MAP: Array<{ machineType: MachineDataType, nativeType: NativeDataType }> = [
        {
            machineType: MachineDataType.None,
            nativeType: 'none'
        },
            {
            machineType: MachineDataType.InlineUnsignedNumber,
            nativeType: 'inline-unsigned-number'
        },
            {
            machineType: MachineDataType.InlineSignedNumber,
            nativeType: 'inline-signed-number'
        },
            {
            machineType: MachineDataType.InlineFloatNumber,
            nativeType: 'inline-float-number'
        },
            {
            machineType: MachineDataType.FlagCode,
            nativeType: 'flag-code'
        },
            {
            machineType: MachineDataType.MemoryAddress,
            nativeType: 'memory-address'
        },
            {
            machineType: MachineDataType.RegisterName,
            nativeType: 'register-name'
        },
            {
            machineType: MachineDataType.RegisterMask,
            nativeType: 'register-mask'
        },
            {
            machineType: MachineDataType.IoPort,
            nativeType: 'io-port'
        },
            {
            machineType: MachineDataType.IoCommand,
            nativeType: 'io-command'
        },
            {
            machineType: MachineDataType.Mnemonic,
            nativeType: 'mnemonic'
        }
    ]
}