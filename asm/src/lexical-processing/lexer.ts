import { Lexeme } from './types/lexeme';
import { GlobalPass } from '../parsing/passes/global-pass';
import { LexemeKind } from './types/lexeme-kind';
import { LexicalRelationship } from './types/lexical-relationship';
import { LexicalRelationshipType } from './types/lexical-relationship-type';
import { InstructionArgumentKind } from '../parsing/shared/kinds/instruction-argument-kind';
import { SourceElementMeaning } from './types/source-element-meaning';
import { MachineDataType } from './types/machine-data-type';
import { S3InstructionArg } from '../parsing/stages/stage-3/instruction/s3-instruction-arg';
import { Mnemonic, MnemonicHelper, ByteSequenceCreator, ByteSequenceLength, RegisterMask, RegisterHelper, NamedRegisterMask } from '@allium/types';
import { TokenRangeMap } from './types/token-range-map';
import { Token } from '../parsing/stages/stage-1/token';
import { S2InstructionLine } from '../parsing/stages/stage-2/instruction/s2-instruction-line';
import { S2DirectiveLine } from '../parsing/stages/stage-2/directive/s2-directive-line';
import { S2Line } from '../parsing/stages/stage-2/s2-line';
import { S3LabelLine } from '../parsing/stages/stage-3/s3-label-line';
import { ConstantInjectionKind } from '../parsing/shared/constant-injector/constant-injection-kind';
import { WorkingLexeme } from './types/working-lexeme';
import { LineProcessor } from './workers/line-processor';
import { LexemeId } from './types/lexeme-id';
import { postProcess } from './workers/post-process';
import { AutoAddressRefKind } from '../parsing/shared/auto-address-ref/auto-address-ref-kind';
import { DirectiveCommand } from '../parsing/shared/directive/directive-command';

export class Lexer {
    public static getLexemesForObject(fileIndex: number, fileContent: string, globalPass: GlobalPass, externalPasses: Array<GlobalPass>): Array<Lexeme> {
        const workingLexemes = new Array<WorkingLexeme>();
        const lines = fileContent.split('\n');
        const lineProcessor = new LineProcessor();
        for (let i = 0; i < lines.length; i++) {
            if (!!lines[i]) {
                lineProcessor.processLine(fileContent, globalPass, {
                    length: workingLexemes.length,
                    last: () => {
                        return workingLexemes.last();
                    },
                    push: (wl) => {
                        workingLexemes.push(wl);
                    }
                }, fileIndex, lines[i], i);
            } else {
                const lineIndex = workingLexemes.length > 0 ? workingLexemes.last().lineIndex + 1 : 0;
                const startPosition = workingLexemes.length > 0 ? workingLexemes.last().endPosition : 0;
                workingLexemes.push(Lexer.processNewlineLexeme(fileIndex, lineIndex, startPosition));
            }
        }
        
        const tokenRangeMap = TokenRangeMap.build(globalPass.stage1.tokens, workingLexemes);

        Lexer.associateInstructionArgs(workingLexemes, globalPass.stage2.instructionLines, tokenRangeMap);
        Lexer.associateDirectiveComponents(workingLexemes, globalPass.stage2.directiveLines, tokenRangeMap);
        Lexer.associateCommentComponents(workingLexemes, globalPass.stage2.commentLines, tokenRangeMap);

        Lexer.buildScopeRelationships(workingLexemes, globalPass.stage3.labelLines, tokenRangeMap);
        Lexer.buildValueRelationships(workingLexemes, globalPass, tokenRangeMap);

        Lexer.addSourceElements(workingLexemes, globalPass, externalPasses, tokenRangeMap);
        workingLexemes.filter(lx => lx.sourceElement === null).forEach(lx => {
            lx.sourceElement = 'none';
        })

        const lexemes = postProcess(fileIndex, fileContent, workingLexemes);

        return lexemes;
    }

    private static processNewlineLexeme(fileIndex: number, lineIndex: number, startPosition: number): WorkingLexeme {
        const endPosition = startPosition + 1;
        return {
            id: LexemeId.generate(fileIndex, lineIndex, startPosition, endPosition),
            lineIndex: lineIndex,
            startPosition: startPosition,
            endPosition: endPosition,
            kind: LexemeKind.Newline,
            text: '\n',
            relationshipOrigins: new Array<LexicalRelationship>(),
            sourceElement: 'none'
        };
    }

    private static associateInstructionArgs(workingLexemes: Array<WorkingLexeme>, instructionLines: Array<S2InstructionLine>, rangeMap: TokenRangeMap): void {
        instructionLines.forEach(il => {
            if (il.argumentList.length > 0) {
                il.argumentList.forEach(a => {
                    const lexemes = rangeMap(a.tokenIndices).map(lxId => workingLexemes.find(lx => lx.id === lxId));
                    lexemes.distinct('id').forEach((lx, lxi, arr) => {
                        arr.filter(lx2 => lx2.id !== lx.id).forEach(lx2 => {
                            lx.relationshipOrigins.push({
                                type: LexicalRelationshipType.Association,
                                toId: lx2.id
                            })
                        })
                    })
                })
            }
        })
    }

    private static associateDirectiveComponents(workingLexemes: Array<WorkingLexeme>, directiveLines: Array<S2DirectiveLine>, rangeMap: TokenRangeMap): void {
        directiveLines.forEach(dl => {
            const lexemes = rangeMap(dl.tokenIndices).map(lxId => workingLexemes.find(lx => lx.id === lxId));
            lexemes.distinct('id').forEach((lx, lxi, arr) => {
                arr.filter(lx2 => lx2.id !== lx.id).forEach(lx2 => {
                    lx.relationshipOrigins.push({
                        type: LexicalRelationshipType.Association,
                        toId: lx2.id
                    })
                })
            })
        })
    }

    private static associateCommentComponents(workingLexemes: Array<WorkingLexeme>, commentLines: Array<S2Line>, rangeMap: TokenRangeMap): void {
        commentLines.forEach(cl => {
            const lexemes = rangeMap(cl.tokenIndices).map(lxId => workingLexemes.find(lx => lx.id === lxId));
            lexemes.distinct('id').forEach((lx, lxi, arr) => {
                arr.filter(lx2 => lx2.id !== lx.id).forEach(lx2 => {
                    lx.relationshipOrigins.push({
                        type: LexicalRelationshipType.Association,
                        toId: lx2.id
                    })
                })
            })
        })
    }

    private static buildScopeRelationships(workingLexemes: Array<WorkingLexeme>, labelLines: Array<S3LabelLine>, rangeMap: TokenRangeMap): void {
        labelLines.forEach(lblLn => {
            const labelNameLexeme = rangeMap([lblLn.nameTokenIndex]).map(id => workingLexemes.find(lx => lx.id === id))[0];
            const nextLabel = labelLines.find(ln => ln.lineIndex > lblLn.lineIndex && !labelLines.some(ln2 => ln2.lineIndex > lblLn.lineIndex && ln2.lineIndex < ln.lineIndex));
            const nextLabelLineIndex = !!nextLabel ? nextLabel.lineIndex : Number.MAX_SAFE_INTEGER;
            workingLexemes.filter(lx => lx.lineIndex > lblLn.lineIndex && lx.lineIndex < nextLabelLineIndex).forEach(lx => {
                labelNameLexeme.relationshipOrigins.push({
                    type: LexicalRelationshipType.ProvisionOfScope,
                    toId: lx.id
                })
            })
        })

        // // Set global scopes
        // workingLexemes
        //     .filter(lx => !labelLines.some(lblLn => lblLn.lineIndex === lx.lineIndex) && !lx.relationshipOrigins.some(ro => ro.type === LexicalRelationshipType.ProvisionOfScope))
        //     .forEach(lx => {
        //         lx.relationshipOrigins.push({
        //             type: LexicalRelationshipType.ProvisionOfScope,
        //             toId: 
        //         })
        //     })
    }

    private static buildValueRelationships(workingLexemes: Array<WorkingLexeme>, globalPass: GlobalPass, rangeMap: TokenRangeMap): void {
        // directive receiver references
        globalPass.stage2.directiveLines
            .filter(dl => !!dl.directive)
            .map(dl => rangeMap(dl.directive.receiverTokenIndices)
                .map(id => workingLexemes.find(lx => lx.id === id))
                .filter(lx => !!lx))
            .reduce((x, y) => x.concat(y), [])
            .distinct('id')
            .forEach(receiverLexeme => {
                globalPass.stage3.instructionLines
                    .filter(il => il.argumentList.length > 0)
                    .map(il => il.argumentList.filter(a => a.determinedKind === InstructionArgumentKind.AliasRef && a.asAliasRef().aliasName === receiverLexeme.text))
                    .reduce((x, y) => x.concat(y), [])
                    .map(arg => rangeMap(arg.tokenIndices).map(ti => workingLexemes.find(lx => lx.id === ti)))
                    .reduce((x, y) => x.concat(y), [])
                    .distinct('id')
                    .forEach(receiverReferencingLexeme => {
                        receiverLexeme.relationshipOrigins.push({
                            type: LexicalRelationshipType.ProvisionOfValue,
                            toId: receiverReferencingLexeme.id
                        })
                    })
            })

        // label references
        globalPass.stage3.labelLines.forEach(lblLn => {
            const labelNameLexeme = rangeMap([lblLn.nameTokenIndex]).map(id => workingLexemes.find(lx => lx.id === id)).filter(lx => !!lx)[0];

            // Auto address ref args
            globalPass.stage3.instructionLines
                .filter(il => il.argumentList.length > 0)
                .map(il => il.argumentList.filter(a => Lexer.isLabelReferencedByAutoAddressRef(a, labelNameLexeme.text)))
                .reduce((x, y) => x.concat(y), [])
                .map(arg => rangeMap(arg.tokenIndices).map(ti => workingLexemes.find(lx => lx.id === ti)))
                .reduce((x, y) => x.concat(y), [])
                .distinct('id')
                .forEach(labelReferencingLexeme => {
                    labelNameLexeme.relationshipOrigins.push({
                        type: LexicalRelationshipType.ProvisionOfValue,
                        toId: labelReferencingLexeme.id
                    })
                })

            // Alias directives
            globalPass.stage2.directiveLines
                .filter(dl => !!dl.directive && dl.directive.hasParameter && dl.directive.normalizedCommandName === 'alias' && dl.directive.normalizedParameter.replace('$', '').trim() === labelNameLexeme.text)
                .map(dl => workingLexemes.find(lx => lx.id === rangeMap([dl.directive.parameterTokenIndices.last()])[0]))
                .filter(lx => !!lx)
                .distinct('id')
                .forEach(labelReferencingLexeme => {
                    labelNameLexeme.relationshipOrigins.push({
                        type: LexicalRelationshipType.ProvisionOfValue,
                        toId: labelReferencingLexeme.id
                    })
                })
        })
    }

    private static addSourceElements(workingLexemes: Array<WorkingLexeme>, globalPass: GlobalPass, externalPasses: Array<GlobalPass>, rangeMap: TokenRangeMap): void {
        Lexer.addSourceElementsForLabels(workingLexemes, rangeMap, globalPass);
        Lexer.addSourceElementsForDirectives(workingLexemes, rangeMap, globalPass);
        globalPass.stage3.instructionLines
            .filter(il => il.argumentList.length > 0)
            .map(il => il.argumentList.map((a, ai) => {
                return {
                    mnemonicDetails: !!il.mnemonic ? il.mnemonic : undefined,
                    arg: a,
                    argIndex: ai
                }
            }))
            .reduce((x, y) => x.concat(y), [])
            .map(a => {
                return {
                    mnemonicDetails: a.mnemonicDetails,
                    arg: a.arg,
                    argIndex: a.argIndex,
                    lexemes: rangeMap(a.arg.tokenIndices).map(ti => workingLexemes.find(lx => lx.id === ti))
                }
            })
            .forEach(argSet => {
                let mnemonic: Mnemonic = undefined;
                if (!!argSet.mnemonicDetails) {
                    mnemonic = argSet.mnemonicDetails.mnemonic;
                    const mnemonicLexemeMatches = rangeMap(argSet.mnemonicDetails.tokenIndices)
                        .map(id => workingLexemes.find(wl => wl.id === id))
                        .filter(lx => !!lx);
                    if (mnemonicLexemeMatches.length > 0) {
                        mnemonicLexemeMatches[0].sourceElement = {
                            meaning: SourceElementMeaning.Mnemonic,
                            machineDataType: MachineDataType.Mnemonic,
                            byteLength: 1,
                            numericValue: mnemonic.valueOf()
                        }
                    }
                }
                Lexer.addSourceElementsForArg(mnemonic, argSet.arg, argSet.argIndex, argSet.lexemes, rangeMap, globalPass, externalPasses);
            })

        // Zero-op mnemonics
        globalPass.stage3.instructionLines
            .filter(il => il.argumentList.length === 0 && !!il.mnemonic)
            .forEach(il => {
                const mnemonicLexemeMatches = rangeMap(il.mnemonic.tokenIndices)
                    .map(id => workingLexemes.find(wl => wl.id === id))
                    .filter(lx => !!lx);
                if (mnemonicLexemeMatches.length > 0) {
                    mnemonicLexemeMatches[0].sourceElement = {
                        meaning: SourceElementMeaning.Mnemonic,
                        machineDataType: MachineDataType.Mnemonic,
                        byteLength: 1,
                        numericValue: il.mnemonic.mnemonic.valueOf()
                    }
                }
            })
    }

    private static addSourceElementsForArg(mnemonic: Mnemonic, arg: S3InstructionArg, argIndex: number, lexemes: Array<WorkingLexeme>, rangeMap: TokenRangeMap,
        globalPass: GlobalPass, externalPasses: Array<GlobalPass>): void {
        if (arg.determinedKind === InstructionArgumentKind.RegisterRef) {
            const regRef = arg.asRegRef();
            const regNameLexeme = lexemes.find(lx => lx.kind === LexemeKind.SourceElement && lx.text.toLowerCase() === RegisterHelper.GetRegisterName(regRef.register));
            if (!!regNameLexeme) {
                regNameLexeme.sourceElement = {
                    meaning: SourceElementMeaning.RegisterName,
                    machineDataType: MachineDataType.RegisterName,
                    byteLength: 'less-than-1',
                    numericValue: regRef.register.valueOf()
                }
            }

            const regMaskLexeme = regRef.mask.name === NamedRegisterMask.Full
                ? undefined
                : lexemes.find(lx => lx.kind === LexemeKind.SourceElement && lx.text.toLowerCase() === RegisterHelper.GetMaskName(regRef.mask.name).acronym);
            if (!!regMaskLexeme) {
                regMaskLexeme.sourceElement = {
                    meaning: SourceElementMeaning.NamedRegisterMask,
                    machineDataType: MachineDataType.RegisterMask,
                    byteLength: 'less-than-1',
                    numericValue: regRef.mask.name.valueOf()
                }
            }
        } else if (arg.determinedKind === InstructionArgumentKind.InlineValue) {
            const ivLexemes = rangeMap(arg.tokenIndices).map(id => lexemes.find(lx => lx.id === id)).filter(lx => !!lx && lx.kind === LexemeKind.SourceElement);
            if (ivLexemes.length > 0) {
                const details = Lexer._INLINE_ARG_SPECIFIC_DATA_TYPES.find(s => s.mnemonic === mnemonic);
                ivLexemes[0].sourceElement = {
                    meaning: Lexer.getMeaningForInlineArg(mnemonic, argIndex),
                    machineDataType: !!details ? details.dataType : MachineDataType.InlineUnsignedNumber,
                    byteLength: !!details ? details.byteLength as ByteSequenceLength : 4,
                    numericValue: arg.asInlineValue()
                }
            }
        } else if (arg.determinedKind === InstructionArgumentKind.AutoAddressRef) {
            Lexer.addSourceElementsForAutoAddressRef(arg, lexemes, rangeMap, globalPass, externalPasses);
        } else if (arg.determinedKind === InstructionArgumentKind.ConstantInjector) {
            const ciLexemes = rangeMap(arg.tokenIndices).map(id => lexemes.find(lx => lx.id === id)).filter(lx => !!lx && lx.kind === LexemeKind.SourceElement);
            if (ciLexemes.length > 0) {
                const ciDetails = arg.asConstantInjector();
                ciLexemes[0].sourceElement = {
                    meaning: SourceElementMeaning.ConstantInjectorKey,
                    machineDataType: MachineDataType.None,
                    byteLength: 0,
                    numericValue: ciDetails.injectionKind.valueOf()
                }
                if (ciLexemes.length > 1) {
                    let machineDataType: MachineDataType = MachineDataType.FlagCode;
                    let byteLength: ByteSequenceLength = 1;
                    if (ciDetails.injectionKind === ConstantInjectionKind.Vector) {
                        machineDataType = MachineDataType.InlineSignedNumber;
                        byteLength = 4;
                    } else if (ciDetails.injectionKind === ConstantInjectionKind.Float) {
                        machineDataType = MachineDataType.InlineFloatNumber;
                        byteLength = 4;
                    }
                    ciLexemes.last().sourceElement = {
                        meaning: SourceElementMeaning.ConstantInjectorValue,
                        machineDataType: machineDataType,
                        byteLength: byteLength,
                        numericValue: ciDetails.hasValue ? ciDetails.injectionValue : Number.NaN
                    }
                }
            }
        } else if (arg.determinedKind === InstructionArgumentKind.AliasRef) {
            rangeMap(arg.tokenIndices).map(id => lexemes.find(lx => lx.id === id)).filter(lx => !!lx && lx.kind === LexemeKind.SourceElement).forEach(lx => {
                const symbol = globalPass.stage3.symbols.find(s => s.name === lx.text);
                if (!!symbol && symbol.value !== 'deferred') {
                    lx.sourceElement = {
                        meaning: SourceElementMeaning.AliasReference,
                        machineDataType: MachineDataType.None,
                        byteLength: symbol.value.LENGTH,
                        numericValue: ByteSequenceCreator.Unbox(symbol.value)
                    }
                } else {
                    lx.sourceElement = 'none';
                }
            })
        }
    }

    private static addSourceElementsForAutoAddressRef(arg: S3InstructionArg, lexemes: Array<WorkingLexeme>, rangeMap: TokenRangeMap, globalPass: GlobalPass,
        externalPasses: Array<GlobalPass>): void {
        const addressRefDetails = arg.asAutoAddressRef();

        if (addressRefDetails.kind === AutoAddressRefKind.Block) {
            if (addressRefDetails.isExternalBlock) {
                rangeMap(arg.tokenIndices)
                    .map(id => lexemes.find(lx => lx.id === id && lx.kind === LexemeKind.SourceElement))
                    .filter(lx => !!lx)
                    .forEach((lx, lxi) => {
                        const importDirectiveLine = globalPass.stage3.directiveLines.find(dl => dl.command === DirectiveCommand.Import && dl.receiverName === addressRefDetails.externalObjectName);
                        if (lxi === 0) { // line index of import directive
                            lx.sourceElement = {
                                meaning: SourceElementMeaning.AutoAddressRefExternalImportDirectiveLineIndex,
                                machineDataType: MachineDataType.None,
                                byteLength: 0,
                                numericValue: !!importDirectiveLine ? importDirectiveLine.lineIndex : Number.NaN
                            }
                        } else if (!!importDirectiveLine) { // address of target block
                            let targetAddress = Number.NaN;
                            const externalObjectName = importDirectiveLine.parameterValue;
                            if (!!externalObjectName) {
                                const externalPass = externalPasses.find(ep => ep.objectName === externalObjectName);
                                if (!!externalPass) {
                                    const externalAddress = externalPass.blockAddresses.has(addressRefDetails.blockName)
                                        ? externalPass.blockAddresses.get(addressRefDetails.blockName)
                                        : undefined;
                                    if (!!externalAddress) {
                                        targetAddress = ByteSequenceCreator.Unbox(externalAddress);
                                    }
                                }
                            }
                            lx.sourceElement = {
                                meaning: SourceElementMeaning.AutoAddressRefTargetExternalLabel,
                                machineDataType: MachineDataType.MemoryAddress,
                                byteLength: 4,
                                numericValue: targetAddress
                            }
                        }
                    })
            } else {
                rangeMap(arg.tokenIndices)
                    .map(id => lexemes.find(lx => lx.id === id && lx.kind === LexemeKind.SourceElement))
                    .filter(lx => !!lx)
                    .forEach(lx => {
                        const targetAddress = globalPass.blockAddresses.get(addressRefDetails.blockName);
                        lx.sourceElement = {
                            meaning: addressRefDetails.isEmbedded
                                ? SourceElementMeaning.AutoAddressRefTargetEmbeddedLabel
                                : SourceElementMeaning.AutoAddressRefTargetLocalLabel,
                            machineDataType: MachineDataType.MemoryAddress,
                            byteLength: 4,
                            numericValue: !!targetAddress ? ByteSequenceCreator.Unbox(targetAddress) : Number.NaN
                        }
                    })
            }
        } else if (addressRefDetails.kind === AutoAddressRefKind.Relative) {
            rangeMap(arg.tokenIndices)
            .map(id => lexemes.find(lx => lx.id === id && lx.kind === LexemeKind.SourceElement))
            .filter(lx => !!lx)
            .forEach(lx => {
                let targetAddress = Number.NaN;
                const instructionLine = globalPass.stage3.instructionLines.find(il => !!il.mnemonic
                    && il.mnemonic.tokenIndices[0]
                    && il.argumentList.some(a => a.tokenIndices.every(ti => arg.tokenIndices.includes(ti))));
                
                if (!!instructionLine) {
                    const immediateLine = globalPass.stage4.instructionLines.find(il => il.lineIndex === instructionLine.lineIndex);
                    if (!!immediateLine) {
                        const immediateArg = immediateLine.autoAddressRefs.find(a => a.tokenIndices.every(ti => arg.tokenIndices.includes(ti)));
                        if (!!immediateArg && immediateArg.resolvedAddress !== 'deferred' && immediateArg.resolvedAddress !== 'error') {
                            targetAddress = ByteSequenceCreator.Unbox(immediateArg.resolvedAddress);
                        }
                    }
                }

                lx.sourceElement = {
                    meaning: SourceElementMeaning.AutoAddressRefTargetAddress,
                    machineDataType: MachineDataType.MemoryAddress,
                    byteLength: 4,
                    numericValue: targetAddress
                }
            })
        }
    }

    private static addSourceElementsForLabels(lexemes: Array<WorkingLexeme>, rangeMap: TokenRangeMap, globalPass: GlobalPass): void {
        globalPass.stage3.labelLines.forEach(lblLn => {
            const labelNameLexeme = rangeMap([lblLn.nameTokenIndex]).map(id => lexemes.find(lx => lx.id === id))[0];
            if (!!labelNameLexeme) {
                labelNameLexeme.sourceElement = {
                    meaning: SourceElementMeaning.BlockName,
                    machineDataType: MachineDataType.MemoryAddress,
                    byteLength: 4,
                    numericValue: globalPass.blockAddresses.has(lblLn.normalizedName)
                        ? ByteSequenceCreator.Unbox(globalPass.blockAddresses.get(lblLn.normalizedName))
                        : Number.NaN
                }
            }
        })
    }

    private static addSourceElementsForDirectives(lexemes: Array<WorkingLexeme>, rangeMap: TokenRangeMap, globalPass: GlobalPass): void {
        globalPass.stage2.directiveLines.forEach(dl => {
            rangeMap(dl.tokenIndices).map(id => lexemes.find(lx => lx.id === id && lx.kind === LexemeKind.SourceElement)).filter(lx => !!lx).forEach((lx, lxi) => {
                if (lxi === 0) {
                    const pvDirectiveLine = globalPass.stage3.directiveLines.find(d => d.lineIndex === dl.lineIndex);
                    lx.sourceElement = {
                        meaning: SourceElementMeaning.DirectiveCommand,
                        machineDataType: MachineDataType.None,
                        byteLength: 0,
                        numericValue: !!pvDirectiveLine ? pvDirectiveLine.command.valueOf() : Number.NaN
                    }
                } else {
                    lx.sourceElement = {
                        meaning: lxi === 1 ? SourceElementMeaning.DirectiveReceiver : SourceElementMeaning.DirectiveParameter,
                        machineDataType: MachineDataType.None,
                        byteLength: 0,
                        numericValue: 'none'
                    }
                }
            })
        })
    }

    private static getMeaningForInlineArg(mnemonic: Mnemonic, argIndex: number): SourceElementMeaning {
        const details = Lexer._INLINE_ARG_SPECIFIC_DATA_TYPES.find(d => d.mnemonic === mnemonic);
        if (!!details) {
            return details.dataType === MachineDataType.FlagCode
                ? SourceElementMeaning.InlineUnsignedNumber
                : details.dataType === MachineDataType.InlineSignedNumber
                ? SourceElementMeaning.InlineSignedNumber
                : SourceElementMeaning.InlineFloatNumber;
        } else if (MnemonicHelper.isInlineQuadValueOp(mnemonic) || (argIndex > 0 && MnemonicHelper.isInlineLessThanQuadValueOp(mnemonic))) {
            return SourceElementMeaning.InlineUnsignedNumber;
        } else {
            return SourceElementMeaning.InlineUnsignedNumber;//TODO error?
        }
    }

    private static isLabelReferencedByAutoAddressRef(arg: S3InstructionArg, labelNameText: string): boolean {
        if (arg.determinedKind === InstructionArgumentKind.AutoAddressRef) {
            const details =  arg.asAutoAddressRef();
            if (details.kind === AutoAddressRefKind.Block) {
                return details.blockName === labelNameText;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    private static readonly _INLINE_ARG_SPECIFIC_DATA_TYPES = [
        {
            mnemonic: Mnemonic.ADDF,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.SUBF,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.MULTF,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.DIVF,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.FLOORF,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.CEILF,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.ROUNDF,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.ADDV,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.SUBV,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.MULTV,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.DIVV,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.MODV,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.EQV,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.GTV,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.LTV,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.ABSV,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.NEGV,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.MAG,
            dataType: MachineDataType.InlineFloatNumber,
            byteLength: 1
        },
        {
            mnemonic: Mnemonic.FLAG_ACK,
            dataType: MachineDataType.FlagCode,
            byteLength: 1
        }
    ]
}