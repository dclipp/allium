import { parseStage1 } from './stages/stage-1/stage-1-parser';
import { ParsedAssembly } from './parsed-assembly';
import { parseStage2 } from './stages/stage-2/stage-2-parser';
import { parseStage3 } from './stages/stage-3/stage-3-parser';
import { parseStage4 } from './stages/stage-4/stage-4-parser';
import { parseStage5 } from './stages/stage-5/stage-5-parser';
import { ParseOptions, DEFAULT_PARSE_OPTIONS } from './parse-options';
import { LocalPass } from './passes/local-pass';
import { DirectiveCommand } from './shared/directive/directive-command';
import { QuadByte, ByteSequenceCreator, INSTRUCTION_BYTE_COUNT, DynamicByteSequence, RegisterHelper } from '@allium/types';
import { GlobalPass } from './passes/global-pass';
import { PassDetails } from './shared/parser-types/pass-details';
import { FileMap, normalizeFileMap } from '../api-types/file-map';
import { AsmMessageHelper } from '../messages/asm-message-helper';
import { ASM_MESSAGES } from '../messages/asm-messages';
import { AsmMessageClassification } from '../messages/asm-message-classification';
import { ExtendedAsmMessageHelper, ExtendedAsmMessage } from '../messages/extended-asm-message';
import { MessageList } from '../messages/message-list';
import { Validator } from './validation/validator';
import { S3InstructionLine } from './stages/stage-3/s3-instruction-line';
import { S3LabelLine } from './stages/stage-3/s3-label-line';
import { EntryPointDetails } from './entry-point-details';
import { AssemblyEntryPoint } from '../api-types/assembly-entry-point';
import { S3InstructionParser } from './stages/stage-3/instruction/s3-instruction-parser';
import { Token } from './stages/stage-1/token';
import { InstructionArgumentKind } from './shared/kinds/instruction-argument-kind';
import { ConstantInjectorValueResolver } from './shared/constant-injector/constant-injector-value-resolver';
import { StageParser } from './stages/stage-parser';
import { WorkingParserPayload } from './shared/parser-types/internal-payload/working-parser-payload';
import { CompleteParserPayload } from './shared/parser-types/internal-payload/complete-parser-payload';
import { PassScope } from './passes/pass-scope';
import { InstructionReorderMapper } from './instruction-reorder-mapper';
import { InstructionReorderMap } from './shared/parser-types/instruction-reorder-map';
import { InternalGlobalPass } from './passes/internal-global-pass';
import { ObjectSymbol } from './shared/symbol/object-symbol';
import { AsmMessage } from '../messages/asm-message';
import { BlockLocationMapper } from './shared/parser-types/block-location/block-location-mapper';
// import { StageInvoker } from './stages/stage-invoker';

export class Parser {
    public static parse(fileMap: FileMap, options?: ParseOptions): ParsedAssembly {
        return Parser.iterateParse(fileMap, options || DEFAULT_PARSE_OPTIONS, false);
    }

    private static iterateParse(fileMap: FileMap, options: ParseOptions, entryPointApplied: boolean): ParsedAssembly {
        const normalizedFileMap = normalizeFileMap(fileMap);
        const messages = new Array<ExtendedAsmMessage>();

        const globalPasses = new Array<InternalGlobalPass>();
        const localPasses = normalizedFileMap.map(fm => Parser.buildLocalPass(fm.referenceName, fm.fileContent, options));
        localPasses.forEach((lp, lpi) => {
            const messagesForPass = new MessageList(lp.messages);
            messagesForPass.merge(Validator.validatePassOutput(lp));
            messagesForPass.toArray().forEach(m => {
                messages.push(ExtendedAsmMessageHelper.createFromAsmMessage(m, normalizedFileMap[lpi].fileContent, lp.objectName));
            })
        });

        const requiredBuildOrder = Parser.determineRequiredBuildOrder(localPasses.filter(lp => !lp.isEmptyObject));
        if (requiredBuildOrder.unresolvableDependencies.length > 0) {
            const unresolvableDependencyDetails = requiredBuildOrder.unresolvableDependencies.map(ud => {
                return `${ud.dependencyName} @ "${ud.referencedFromObject}"`;
            });
            const message = AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Common.UnresolvableDependencies);
            messages.push(ExtendedAsmMessageHelper.appendDetails(
                ExtendedAsmMessageHelper.createGlobalFromAsmMessage(message),
                unresolvableDependencyDetails
            ))
        } else {
            const orderedPasses = requiredBuildOrder.buildOrder.map(o => localPasses.find(lp => lp.objectName === o));
            orderedPasses.forEach(p => {
                const file = normalizedFileMap.find(sf => sf.referenceName === p.objectName);
                const globalInstructionCount = localPasses.map(gp => gp.totalInstructionCount).reduce((x, y) => x + y, 0);
                const baseAddressOffset = Parser.getBaseAddressOffset(messages, options);
                const globalPass = Parser.buildGlobalPass(file.fileContent, p, globalPasses, globalInstructionCount, options, baseAddressOffset);
                globalPass.messages.toArray().forEach(m => {
                    messages.push(ExtendedAsmMessageHelper.createFromAsmMessage(
                        m,
                        normalizedFileMap.find(sf => sf.referenceName === p.objectName).fileContent,
                        p.objectName));
                });
                globalPasses.push(globalPass);
            })
        }

        const entryPointDetails = {
            objectName: '',
            label: '',
            instructionMap: InstructionReorderMapper.getReorderMap(globalPasses, options.entryPoint)
        }

        let finalGlobalPasses: Array<GlobalPass> = globalPasses;
        if (!!options.entryPoint) {
            const postGlobalPasses = globalPasses.map(gp => Parser.buildPostGlobalPass(gp, gp.completePayload, options, gp.details, entryPointDetails.instructionMap));
            finalGlobalPasses = postGlobalPasses;
            entryPointDetails.objectName = options.entryPoint.objectName;
            entryPointDetails.label = options.entryPoint.label;
        }

        return {
            globalPasses: finalGlobalPasses,
            messages: ExtendedAsmMessageHelper.getDistinctMessages(messages),
            succeeded: !messages.some(m => m.classification === AsmMessageClassification.Critical || m.classification === AsmMessageClassification.Fatal),
            parserOptionsUsed: options,
            entryPoint: entryPointDetails
        }
    }

    private static parseStages(content: string, passDetails: PassDetails, options: ParseOptions): CompleteParserPayload {
        const messages = new MessageList();
        let workingPayload: WorkingParserPayload = {
            sourceContent: content,
            stage1: null,
            stage2: null,
            stage3: null,
            stage4: null,
            stage5: null
        }

        // const requiredExternalSymbols = new Array<{
        //     readonly objectName: string;
        //     readonly symbol?: string;
        // }>();
        // const blockAddresses = new Map<string, QuadByte>();
        // let totalInstructionCount = 0;
        // let succeeded = false;

        for (let i = 0; i < Parser._stageParsers.length; i++) {
            workingPayload = Parser.invokeStage2(Parser._stageParsers[i], messages, workingPayload, passDetails, options);
        }

        return {
            sourceContent: workingPayload.sourceContent,
            stage1: workingPayload.stage1,
            stage2: workingPayload.stage2,
            stage3: workingPayload.stage3,
            stage4: workingPayload.stage4,
            stage5: workingPayload.stage5,
            messages: messages
        }
    }

    private static buildLocalPass(objectName: string, content: string, options: ParseOptions): LocalPass {
        const optionValidationMessages = Validator.validateOptions(options);
        const baseAddressOffset = Parser.getBaseAddressOffset(optionValidationMessages, options);
        
        if (!!content) {
            const stageObjects = Parser.parseStages(content, { scope: PassScope.Local, baseAddressOffset: baseAddressOffset }, options);
            const requiredExternalSymbols = new Array<{
                readonly objectName: string;
                readonly symbol?: string;
            }>();
            const blockAddresses = new Map<string, QuadByte>();
            let totalInstructionCount = 0;
            let succeeded = false;

            succeeded = !stageObjects.messages.hasFailureMessages;

            if (succeeded) {
                stageObjects.stage3.directiveLines.filter(dl => dl.command === DirectiveCommand.Import).forEach(dl => {
                    const importPath = dl.parameterValue.split(':');
                    requiredExternalSymbols.push({
                        objectName: importPath[0],
                        symbol: importPath.length > 0 ? importPath[1] : undefined
                    })
                })

                stageObjects.stage5.instructions.forEach(i => {
                    const associatedLabel = stageObjects.stage2.labelLines.find((ln, lnIdx, arr) => ln.lineIndex < i.mnemonicTokenIndex && !arr.some((y, j) => y.lineIndex > ln.lineIndex && y.lineIndex < i.mnemonicTokenIndex));
                    const pLabel = !!associatedLabel ? stageObjects.stage3.labelLines.find(ln => ln.lineIndex === associatedLabel.lineIndex) : undefined;
                    const labelName = !!pLabel ? pLabel.normalizedName : 'MISSING_LABEL';
                    blockAddresses.set(labelName, i.address.clone());
                    totalInstructionCount++;
                })
            }

            stageObjects.messages.merge(optionValidationMessages);
            
            return {
                isEmptyObject: false,
                requiredExternalSymbols: requiredExternalSymbols,
                totalInstructionCount: totalInstructionCount,
                blockAddresses: blockAddresses,
                objectName: objectName,
                messages: stageObjects.messages,
                succeeded: succeeded,
                stage1: stageObjects.stage1,
                stage2: stageObjects.stage2,
                stage3: stageObjects.stage3,
                stage4: stageObjects.stage4,
                stage5: stageObjects.stage5
            }
        } else {
            return {
                isEmptyObject: true,
                requiredExternalSymbols: [],
                totalInstructionCount: 0,
                blockAddresses: new Map<string, QuadByte>(),
                objectName: objectName,
                messages: optionValidationMessages,
                succeeded: true,
                stage1: {
                    tokens: []
                },
                stage2: {
                    labelLines: [],
                    instructionLines: [],
                    directiveLines: [],
                    commentLines: [],
                    blankLines: []
                },
                stage3: {
                    labelLines: [],
                    instructionLines: [],
                    directiveLines: [],
                    blankLines: [],
                    symbols: []
                },
                stage4: {
                    labelLines: [],
                    instructionLines: []
                },
                stage5: {
                    instructions: [],
                    byteCount: 0
                }
            }
        }
    }

    private static buildGlobalPass(content: string, localPass: LocalPass, preceedingObjects: Array<GlobalPass>, globalInstructionCount: number, options: ParseOptions, useBaseAddressOffset: QuadByte | undefined): InternalGlobalPass {
        const messages = new MessageList();

        const baseAddress = preceedingObjects.length > 0
            ? preceedingObjects[preceedingObjects.length - 1].tailAddress.computeSum(1)
            : ByteSequenceCreator.QuadByte(0);
        const tailAddressValue = localPass.totalInstructionCount * INSTRUCTION_BYTE_COUNT - 1 + ByteSequenceCreator.Unbox(baseAddress);
        const tailAddress = ByteSequenceCreator.QuadByte(Math.max(0, tailAddressValue));
        const passDetails: PassDetails = {
            scope: PassScope.Global,
            globalInstructionCount: globalInstructionCount,
            symbols: Parser.createSymbolsMap(preceedingObjects),
            objectBaseAddress: baseAddress.clone(),
            baseAddressOffset: useBaseAddressOffset,
            blockLocationMap: BlockLocationMapper.buildBlockLocationMap([localPass]).get(localPass.objectName)
        };
        const blockAddresses = new Map<string, QuadByte>();
        let totalInstructionCount = 0;
        let succeeded = false;

        const stageObjects = Parser.parseStages(content, passDetails, options);
        messages.merge(stageObjects.messages);

        succeeded = !messages.hasFailureMessages;

        if (succeeded) {
            stageObjects.stage5.instructions.forEach(i => {
                const associatedLabel = stageObjects.stage2.labelLines.find((ln, lnIdx, arr) => ln.lineIndex < i.mnemonicTokenIndex && !arr.some((y, j) => y.lineIndex > ln.lineIndex && y.lineIndex < i.mnemonicTokenIndex));
                const pLabel = !!associatedLabel ? stageObjects.stage3.labelLines.find(ln => ln.lineIndex === associatedLabel.lineIndex) : undefined;
                const labelName = !!pLabel ? pLabel.normalizedName : 'MISSING_LABEL';
                blockAddresses.set(labelName, Parser.computeBlockAddress(labelName, stageObjects.stage3.labelLines, stageObjects.stage3.instructionLines, baseAddress));
                totalInstructionCount++;
            })

            stageObjects.stage5.instructions.filter(i => !i.isFullyResolved).forEach(instruction => {
                const endTokenIndices = instruction.argumentList.length > 0
                    ? instruction.argumentList[instruction.argumentList.length - 1].tokenIndices
                    : [instruction.mnemonicTokenIndex];
                const lastToken = stageObjects.stage1.tokens.find(t => t.index === endTokenIndices[endTokenIndices.length - 1]);
                const startTokenIndices = instruction.argumentList.length > 0
                    ? instruction.argumentList[0].tokenIndices
                    : [instruction.mnemonicTokenIndex];instruction
                const firstToken = stageObjects.stage1.tokens.find(t => t.index === startTokenIndices[0]);
                messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.GlobalPass.UnresolvedExternal, {
                    startPosition: !!firstToken ? firstToken.startPosition : -1,
                    endPosition: !!lastToken ? lastToken.endPosition : -1
                }))
            })
        }

        succeeded = !messages.hasFailureMessages;

        return {
            baseAddress: baseAddress,
            tailAddress: tailAddress,
            totalInstructionCount: totalInstructionCount,
            blockAddresses: blockAddresses,
            objectName: localPass.objectName,
            messages: messages,
            succeeded: succeeded,
            stage1: stageObjects.stage1,
            stage2: stageObjects.stage2,
            stage3: stageObjects.stage3,
            stage4: stageObjects.stage4,
            stage5: stageObjects.stage5,
            completePayload: stageObjects,
            details: passDetails
        }
    }

    private static buildPostGlobalPass(globalPass: InternalGlobalPass, globalStageObjects: CompleteParserPayload, options: ParseOptions, globalPassDetails: PassDetails, reorderMap: InstructionReorderMap): GlobalPass {
        const messages = new MessageList();
        messages.merge(globalStageObjects.messages);

        const passDetails: PassDetails = {
            scope: PassScope.PostGlobal,
            globalInstructionCount: globalPassDetails.globalInstructionCount,
            symbols: globalPassDetails.symbols,
            objectBaseAddress: globalPassDetails.objectBaseAddress,
            instructionReorderMap: reorderMap,
            baseAddressOffset: globalPassDetails.baseAddressOffset,
            blockLocationMap: globalPassDetails.blockLocationMap
        };

        const stage4Output = parseStage4(globalStageObjects, passDetails, options);
        messages.merge(stage4Output.messages);

        const workingStageObjects: WorkingParserPayload = {
            sourceContent: globalStageObjects.sourceContent,
            stage1: globalStageObjects.stage1,
            stage2: globalStageObjects.stage2,
            stage3: globalStageObjects.stage3,
            stage4: stage4Output.object,
            stage5: null
        }

        const stage5Output = parseStage5(workingStageObjects, passDetails, options);
        messages.merge(stage5Output.messages);

        return {
            baseAddress: globalPass.baseAddress,
            tailAddress: globalPass.tailAddress,
            totalInstructionCount: globalPass.totalInstructionCount,
            blockAddresses: globalPass.blockAddresses,
            objectName: globalPass.objectName,
            messages: messages,
            succeeded: !messages.hasFailureMessages,
            stage1: workingStageObjects.stage1,
            stage2: workingStageObjects.stage2,
            stage3: workingStageObjects.stage3,
            stage4: workingStageObjects.stage4,
            stage5: stage5Output.object
        }
    }

    private static createSymbolsMap(preceedingObjects: Array<GlobalPass>): Array<{
        readonly objectName: string;
        readonly symbols: Array<ObjectSymbol>;
    }> {
        const symbols = new Array<{
            readonly objectName: string;
            readonly symbols: Array<ObjectSymbol>;
        }>();

        preceedingObjects.forEach(p => {
            symbols.push({
                objectName: p.objectName,
                symbols: p.stage3.symbols
            })
        })

        return symbols;
    }

    private static determineRequiredBuildOrder(localPasses: Array<LocalPass>): {
        buildOrder: Array<string>,
        unresolvableDependencies: Array<{ referencedFromObject: string, dependencyName: string }>
    } {
        const buildOrder = new Array<string>();
        
        const allRequirements = localPasses.map(lp => {
            return {
                determinationDone: false,
                passObjectName: lp.objectName,
                requirements: lp.requiredExternalSymbols
            }
        })

        // Add objects with no requirements
        allRequirements
            .filter(r => r.requirements.length === 0)
            .sort((a, b) => a.passObjectName.localeCompare(b.passObjectName)) // sort to ensure that the build order is deterministic
            .forEach(r => {
                buildOrder.push(r.passObjectName);
                r.determinationDone = true;
            });

        let previousDeterminationsRemaining = -1;
        let determinationsRemaining = allRequirements.filter(r => !r.determinationDone).length;

        while (determinationsRemaining > 0 && determinationsRemaining !== previousDeterminationsRemaining) {
            previousDeterminationsRemaining = determinationsRemaining;
            const determinableReqs = allRequirements
                .filter(r => !r.determinationDone && r.requirements.every(s => buildOrder.includes(s.objectName)))
                .sort((a, b) => a.passObjectName.localeCompare(b.passObjectName)); // sort to ensure that the build order is deterministic

            determinableReqs.forEach(r => {
                r.determinationDone = true;
                buildOrder.push(r.passObjectName);
            })
            
            determinationsRemaining = allRequirements.filter(r => !r.determinationDone).length;
        }

        const unresolvableDependencies = new Array<{ referencedFromObject: string, dependencyName: string }>();
        const unresolvableObjects = allRequirements.filter(r => !r.determinationDone);
        if (unresolvableObjects.length > 0) {
            unresolvableObjects.forEach(uo => {
                uo.requirements.filter(r => !buildOrder.includes(r.objectName)).forEach(rq => {
                    const pass = localPasses.find(lp => lp.objectName === uo.passObjectName);
                    if (!pass.stage3.directiveLines.some(dl => dl.command === DirectiveCommand.Import && dl.receiverName === rq.objectName)) {
                        unresolvableDependencies.push({
                            referencedFromObject: uo.passObjectName,
                            dependencyName: `${rq.objectName}${!!rq.symbol ? ':' + rq.symbol : ''}`
                        })
                    }
                })
            });
        }

        return {
            buildOrder: buildOrder,
            unresolvableDependencies: unresolvableDependencies
        };
    }

    private static computeBlockAddress(labelName: string, labelLines: Array<S3LabelLine>, instructionLines: Array<S3InstructionLine>,
        objectBaseAddress: QuadByte): QuadByte {
        let address: QuadByte = undefined;

        const labelLine = labelLines.find(ln => !ln.isEmbedded && ln.normalizedName === labelName);
        if (!!labelLine) {
            const instructionLinesBefore = instructionLines.filter(il => il.lineIndex < labelLine.lineIndex).length;
            address = objectBaseAddress.computeSum(instructionLinesBefore * INSTRUCTION_BYTE_COUNT);
        }

        return address || ByteSequenceCreator.QuadByte(0);
    }

    private static evaluateDirectiveParameter(parameterTokens: Array<Token>, globalInstructionCount: number, options: ParseOptions): DynamicByteSequence | 'invalid' {
        const cleanedParameterTokens = parameterTokens.map((t, ti) => {
            if (ti === 0) {
                if (t.text === '=') {
                    return null;
                } else if (t.text.startsWith('=')) {
                    const textWithoutEqSign = t.text.substring(1).trim();
                    return {
                        index: t.index,
                        startPosition: t.startPosition + (t.text.length - textWithoutEqSign.length),
                        endPosition: t.endPosition,
                        length: textWithoutEqSign.length,
                        text: textWithoutEqSign
                    }
                } else {
                    return t;
                }
            } else {
                return t;
            }
        }).filter(t => !!t);

        const lineIndex = -1;//todo!!!
        const argResult = S3InstructionParser.tryParseArgument(cleanedParameterTokens, lineIndex, globalInstructionCount, options);
        if (argResult === 'invalid') {
            return 'invalid';
        } else {
            let value: DynamicByteSequence | 'invalid' = 'invalid';
            switch (argResult.arg.determinedKind) {
                case InstructionArgumentKind.RegisterRef:
                    value = ByteSequenceCreator.Byte(RegisterHelper.getNumericFromRegisterReference(argResult.arg.asRegRef()));
                    break;
                case InstructionArgumentKind.InlineValue:
                    value = ByteSequenceCreator.QuadByte(argResult.arg.asInlineValue());
                    break;
                case InstructionArgumentKind.ConstantInjector:
                    value = ConstantInjectorValueResolver.tryResolve(argResult.arg.asConstantInjector().injectionKind, argResult.arg.asConstantInjector().injectionValue);
                    break;
                // case InstructionArgumentKind.PossibleAlias:
                //     // value = ByteSequenceCreator.Byte(RegisterHelper.getNumericFromRegisterReference(argResult.arg.asRegRef()));
                //     break;
            }
            return value;
        }
    }

    private static invokeStage2(
        stageParser: StageParser<any>,
        messageList: MessageList,
        currentPayload: WorkingParserPayload,
        passDetails: PassDetails,
        options: ParseOptions): WorkingParserPayload {
        const stageObject = stageParser(currentPayload, passDetails, options);
        messageList.merge(stageObject.messages);
        const updatedPayload = {
            sourceContent: currentPayload.sourceContent,
            stage1: currentPayload.stage1,
            stage2: currentPayload.stage2,
            stage3: currentPayload.stage3,
            stage4: currentPayload.stage4,
            stage5: currentPayload.stage5
        }
        const targetKey = Object.keys(updatedPayload).find(k => currentPayload[k] === null);
        updatedPayload[targetKey] = stageObject.object;
        return updatedPayload;
    };

    private static getBaseAddressOffset(messageList: Array<AsmMessage> | { toArray(): Array<AsmMessage> }, options: ParseOptions): QuadByte | undefined {
        let hasInvalidOffsetMessage = false;
        if (Array.isArray(messageList)) {
            hasInvalidOffsetMessage = messageList.some(m => m.code === ASM_MESSAGES.Parser.Validation.Options.InvalidBaseAddressOffset.code);
        } else {
            hasInvalidOffsetMessage = messageList.toArray().some(m => m.code === ASM_MESSAGES.Parser.Validation.Options.InvalidBaseAddressOffset.code);
        }

        const baseAddressOffset: QuadByte | undefined = hasInvalidOffsetMessage || options.baseAddressOffset === undefined
            ? undefined
            : ByteSequenceCreator.QuadByte(options.baseAddressOffset);
        return baseAddressOffset;
    }

    private static readonly _stageParsers = [
        parseStage1,
        parseStage2,
        parseStage3,
        parseStage4,
        parseStage5
    ]
}
