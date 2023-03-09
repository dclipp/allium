import { WorkingParserPayload } from '../../../shared/parser-types/internal-payload/working-parser-payload';
import { PassDetails } from '../../../shared/parser-types/pass-details';
import { ParseOptions } from '../../../parse-options';
import { S3DirectiveLine } from '../directive/s3-directive-line';
import { DirectiveCommand } from '../../../shared/directive/directive-command';
import { S3AliasParser } from './s3-alias-parser';
import { MessageList } from '../../../../messages/message-list';
import { AliasValue } from '../../../shared/alias/alias-value';
import { ObjectSymbol } from '../../../shared/symbol/object-symbol';
import { ObjectSymbolKind } from '../../../shared/symbol/object-symbol-kind';
import { S3LabelLine } from '../s3-label-line';
import { PassScope } from '../../../passes/pass-scope';
import { ByteSequenceCreator, INSTRUCTION_BYTE_COUNT, DynamicByteSequence } from '@allium/types';
import { S2InstructionLine } from '../../stage-2/instruction/s2-instruction-line';

export class S3SymbolExtractor {
    public static extract(
        labelLines: Array<S3LabelLine>,
        instructionLines: Array<S2InstructionLine>,
        directiveLines: Array<S3DirectiveLine>,
        passDetails: PassDetails): { symbols: Array<ObjectSymbol>, messages: MessageList } {
        const symbols = new Array<ObjectSymbol>();
        const messages = new MessageList();
        const parsedAliases = new Map<string, AliasValue>();

        S3SymbolExtractor.extractBlockLabels(labelLines.filter(ln => !ln.isEmbedded), instructionLines, passDetails, symbols);

        S3SymbolExtractor.extractVirtualAliases(directiveLines, passDetails, symbols, parsedAliases);
        
        const aliasDirectives = directiveLines.filter(dl => dl.command === DirectiveCommand.Alias);
        const aliasDependencies = new Array<{ readonly index: number, readonly dependsOn: string }>();
        aliasDirectives.forEach((ad, adi) => {
            S3SymbolExtractor.processAliasDirective(ad, adi, directiveLines, passDetails, parsedAliases, symbols, aliasDependencies);
        })

        return {
            symbols: symbols,
            messages: messages
        }
    }

    private static isDependencyDescriptor(o: any): o is { readonly dependsOn: string } {
        return !!o && Object.getOwnPropertyNames(o).includes('dependsOn');
    }

    private static processAliasDirective(line: S3DirectiveLine, index: number, allDirectiveLines: Array<S3DirectiveLine>, passDetails: PassDetails, parsedAliases: Map<string, AliasValue>, symbols: Array<ObjectSymbol>, aliasDependencies: Array<{ readonly index: number, readonly dependsOn: string }>): void {
        const alias = S3AliasParser.parse(line.parameterValue, passDetails, parsedAliases, allDirectiveLines, symbols, line.lineIndex);
        const name = line.receiverName.trim();
        if (alias === 'deferred') {
            symbols.push({
                kind: ObjectSymbolKind.Alias,
                name: name,
                value: 'deferred'
            });
            parsedAliases.set(name, 'deferred');
        } else if (alias === 'error') {
            //TODO add to messages
            parsedAliases.set(name, 'error');
        } else if (S3SymbolExtractor.isDependencyDescriptor(alias)) {
            const importFromSymbol = parsedAliases.has(alias.dependsOn) ? parsedAliases.get(alias.dependsOn) : undefined;
            if (!!importFromSymbol && importFromSymbol !== 'deferred' && importFromSymbol !== 'error' && !S3SymbolExtractor.isDependencyDescriptor(importFromSymbol)) {
                symbols.push({
                    kind: ObjectSymbolKind.Alias,
                    name: name,
                    value: importFromSymbol
                });
                parsedAliases.set(name, alias);

                const spliceIndices = new Array<number>();
                aliasDependencies
                    .filter(dep => dep.dependsOn === name)
                    .forEach(dep => {
                        S3SymbolExtractor.processAliasDirective(allDirectiveLines[dep.index], dep.index, allDirectiveLines, passDetails, parsedAliases, symbols, aliasDependencies);
                        spliceIndices.push(dep.index);
                    })
                spliceIndices.sort((a, b) => b - a).forEach(i => {
                    aliasDependencies.splice(i, 1);
                })
            } else {
                aliasDependencies.push({
                    index: index,
                    dependsOn: alias.dependsOn
                })
                parsedAliases.set(name, { dependsOn: alias.dependsOn });
            }
        } else {
            symbols.push({
                kind: ObjectSymbolKind.Alias,
                name: name,
                value: alias
            });
            parsedAliases.set(name, alias);

            const spliceIndices = new Array<number>();
            aliasDependencies
                .filter(dep => dep.dependsOn === name)
                .forEach(dep => {
                    S3SymbolExtractor.processAliasDirective(allDirectiveLines[dep.index], dep.index, allDirectiveLines, passDetails, parsedAliases, symbols, aliasDependencies);
                    spliceIndices.push(dep.index);
                })
            spliceIndices.sort((a, b) => b - a).forEach(i => {
                aliasDependencies.splice(i, 1);
            })
        }
    }

    private static extractBlockLabels(labelLines: Array<S3LabelLine>, instructionLines: Array<S2InstructionLine>, passDetails: PassDetails, symbols: Array<ObjectSymbol>): void {
        if (passDetails.scope === PassScope.Local) {
            labelLines.filter(ln => !ln.isEmbedded).forEach(ln => {
                symbols.push({
                    kind: ObjectSymbolKind.FirstClassBlockLabel,
                    name: ln.normalizedName,
                    value: 'deferred'
                })
            })
        } else {
            const sortedInstructionLines = instructionLines.sort((a, b) => a.lineIndex - b.lineIndex);
            labelLines.filter(ln => !ln.isEmbedded).forEach(ln => {
                const firstInstructionLineIndex = sortedInstructionLines.findIndex(il => il.lineIndex > ln.lineIndex);
                let instructionAddress = !!passDetails.objectBaseAddress
                    ? passDetails.objectBaseAddress.computeSum(firstInstructionLineIndex * INSTRUCTION_BYTE_COUNT)
                    : ByteSequenceCreator.QuadByte(firstInstructionLineIndex * INSTRUCTION_BYTE_COUNT);
                if (!!passDetails.instructionReorderMap) {
                    const reorder = passDetails.instructionReorderMap.findByOriginalIndex(firstInstructionLineIndex);
                    if (!!reorder) {
                        instructionAddress = ByteSequenceCreator.QuadByte(reorder.reorderedIndex * INSTRUCTION_BYTE_COUNT);
                    }
                }
                if (firstInstructionLineIndex > -1) {
                    symbols.push({
                        kind: ObjectSymbolKind.FirstClassBlockLabel,
                        name: ln.normalizedName,
                        value: instructionAddress
                    })
                }
            })
        }
    }

    /** Finds and adds directives which are not declared as an alias but which should be referenceable as an alias, such as direct imports */
    private static extractVirtualAliases(directiveLines: Array<S3DirectiveLine>, passDetails: PassDetails, symbols: Array<ObjectSymbol>, parsedAliases: Map<string, AliasValue>): void {
        directiveLines
            .filter(dl => dl.command === DirectiveCommand.Import && dl.hasParameter && dl.parameterValue.includes(':'))
            .forEach(dl => {
                const value = S3SymbolExtractor.findSymbolValue(passDetails, dl.parameterValue);
                if (value === 'not-found') {
                    //cTODO err
                } else {
                    symbols.push({
                        kind: ObjectSymbolKind.Alias,
                        name: dl.receiverName,
                        value: value
                    });
                    parsedAliases.set(dl.receiverName, value);
                }
            })
    }

    private static findSymbolValue(passDetails: PassDetails, directiveParameterValue: string): DynamicByteSequence | 'deferred' | 'not-found' {
        let value: DynamicByteSequence | 'deferred' | 'not-found' = 'not-found';
        const segments = !!directiveParameterValue ? directiveParameterValue.split(':').map(s => s.trim()) : undefined;
        const symbolSet = !!passDetails.symbols && !!segments && segments.length > 1 ? passDetails.symbols.find(s => s.objectName === segments[0]) : undefined;
        if (!!symbolSet) {
            const symbol = symbolSet.symbols.find(s => s.name === segments[1]);
            if (!!symbol) {
                value = symbol.value;
            }
        }
        return value;
    }
}