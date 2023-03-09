import { INSTRUCTION_BYTE_COUNT } from '@allium/types';
import { PassOutput } from '../../../passes/pass-output';
import { Token } from '../../../stages/stage-1/token';
import { S2Line } from '../../../stages/stage-2/s2-line';
import { S2LineKind } from '../../../stages/stage-2/s2-line-kind';
import { BlockLocationMap } from './block-location-map';
import { EmbeddedBlockLocation } from './embedded-block-location';
import { FirstClassBlockLocation } from './first-class-block-location';

type WorkingMutableInterface<T> = {
    -readonly [K in keyof T]: T[K] 
}

type WorkingFirstClassBlockLocation = WorkingMutableInterface<FirstClassBlockLocation>
type WorkingEmbeddedBlockLocation = WorkingMutableInterface<EmbeddedBlockLocation>

export class BlockLocationMapper {
    private static mapLocationsForObject(allLines: Array<S2Line>, allTokens: Array<Token>): Array<FirstClassBlockLocation> {
        const locations = new Array<{
            normalizedName: string;
            lineIndexAfterLabel: number;
            lastLineIndexInclusive: number;
            firstInstructionLineIndex: number;
            instructionCount: number;
            isEmbedded: boolean;
            parentBlockName: string | null;
        }>();

        let workingLocation: {
            normalizedName: string;
            lineIndexAfterLabel: number;
            lastLineIndexInclusive: number;
            firstInstructionLineIndex: number;
            instructionCount: number;
            isEmbedded: boolean;
            parentBlockName: string | null;
        } | null = null;

        const maybePushWorkingLocation = () => {
            if (workingLocation !== null) {
                locations.push({
                    normalizedName: workingLocation.normalizedName,
                    lineIndexAfterLabel: workingLocation.lineIndexAfterLabel,
                    lastLineIndexInclusive: workingLocation.lastLineIndexInclusive,
                    firstInstructionLineIndex: workingLocation.firstInstructionLineIndex,
                    instructionCount: workingLocation.instructionCount,
                    isEmbedded: workingLocation.isEmbedded,
                    parentBlockName: workingLocation.parentBlockName
                });
                workingLocation = null;
                return true;
            } else {
                return false;
            }
        }

        for (let i = 0; i < allLines.length; i++) {
            const line = allLines[i];
            if (line.kind === S2LineKind.Label) {
                maybePushWorkingLocation();
                const lineText = line.tokenIndices.map(ti => allTokens.find(t => t.index === ti).text).join(' ').trim();
                const isEmbedded = lineText.startsWith('.');
                workingLocation = {
                    normalizedName: lineText.replace(/\./g, '').replace(/:/g, '').trim(),
                    lineIndexAfterLabel: line.lineIndex + 1,
                    lastLineIndexInclusive: -1,
                    firstInstructionLineIndex: -1,
                    instructionCount: 0,
                    isEmbedded: isEmbedded,
                    parentBlockName: isEmbedded ? locations.filter(x => !x.isEmbedded).last().normalizedName : null
                };
            } else {
                if (workingLocation !== null) {
                    if (line.kind === S2LineKind.Instruction) {
                        workingLocation.instructionCount++;
                        if (workingLocation.firstInstructionLineIndex === -1) {
                            workingLocation.firstInstructionLineIndex = line.lineIndex;
                        }
                    }
                    workingLocation.lastLineIndexInclusive = line.lineIndex;
                }
            }
        }

        maybePushWorkingLocation();
        
        const intermediates: Array<{
            normalizedName: string;
            lineIndexOfLabel: number;
            lineIndexAfterLabel: number;
            lastLineIndexInclusive: number;
            isEmbedded: boolean;
            nominalAddress: number;
            parentBlockName: string | null;
        }> = locations.map((b, bi, ba) => {
            let nominalAddress = -1;
            if (b.instructionCount > 0) {
                if (bi === 0) {
                    nominalAddress = 0;
                } else {
                    nominalAddress = (ba.slice(0, bi)
                        .map(bb => bb.instructionCount)
                        .reduce((x, y) => x + y, 0)) * INSTRUCTION_BYTE_COUNT;
                }
            }
            
            return {
                normalizedName: b.normalizedName,
                lineIndexOfLabel: b.lineIndexAfterLabel - 1,
                lineIndexAfterLabel: b.lineIndexAfterLabel,
                lastLineIndexInclusive: b.lastLineIndexInclusive,
                isEmbedded: b.isEmbedded,
                nominalAddress: nominalAddress,
                parentBlockName: b.parentBlockName
            }
        });

        return intermediates.filter(x => !x.isEmbedded).map(x => {
            let embeddedBlocks: Array<WorkingEmbeddedBlockLocation> = intermediates.filter(y => y.isEmbedded && y.parentBlockName === x.normalizedName).map(y => {
                return {
                    normalizedName: y.normalizedName,
                    isLabeled: 'labeled',
                    lineIndexOfLabel: y.lineIndexOfLabel,
                    lineIndexAfterLabel: y.lineIndexAfterLabel,
                    lastLineIndexInclusive: y.lastLineIndexInclusive,
                    nominalAddress: y.nominalAddress,
                    isEmbedded: true
                };
            });

            let addedUnlabeledBlock = false;
            if (embeddedBlocks.length > 0 && x.lineIndexAfterLabel !== embeddedBlocks[0].lineIndexOfLabel) {
                embeddedBlocks = [{
                    isLabeled: '',
                    lineIndexOfLabel: x.lineIndexOfLabel,
                    lineIndexAfterLabel: x.lineIndexAfterLabel,
                    lastLineIndexInclusive: embeddedBlocks[0].lineIndexOfLabel - 1,
                    nominalAddress: x.nominalAddress,
                    isEmbedded: true
                } as WorkingEmbeddedBlockLocation].concat(embeddedBlocks);
                addedUnlabeledBlock = true;
            }

            return {
                normalizedName: x.normalizedName,
                lineIndexOfLabel: x.lineIndexOfLabel,
                lineIndexAfterLabel: x.lineIndexAfterLabel,
                lastLineIndexInclusive: embeddedBlocks.length > 0 ? embeddedBlocks.last().lastLineIndexInclusive : x.lastLineIndexInclusive,
                nominalAddress: !addedUnlabeledBlock && x.nominalAddress === -1 && embeddedBlocks.length > 0
                    ? embeddedBlocks[0].nominalAddress
                    : x.nominalAddress,
                embeddedBlocks: embeddedBlocks
            } as WorkingFirstClassBlockLocation
        });
    }

    public static mapLocationsForAllObjects(passes: Array<PassOutput>): Map<string, Array<FirstClassBlockLocation>> {
        const m = new Map<string, Array<FirstClassBlockLocation>>();

        passes.map(p => {
            const allLines = p.stage2.blankLines
                .concat(p.stage2.commentLines)
                .concat(p.stage2.directiveLines)
                .concat(p.stage2.instructionLines)
                .concat(p.stage2.labelLines)
                .sort((a, b) => a.lineIndex - b.lineIndex);

            m.set(p.objectName, BlockLocationMapper.mapLocationsForObject(allLines, p.stage1.tokens));
        });
        
        return m;
    }

    private static createMapForObject(firstClassLocations: Array<FirstClassBlockLocation>): BlockLocationMap {
        const _getFirstClassBlockContainingLine: (fromLineIndex: number) => FirstClassBlockLocation | null = (fromLineIndex) => {
            return firstClassLocations.find(fcl => fromLineIndex >= fcl.lineIndexAfterLabel && fromLineIndex <= fcl.lastLineIndexInclusive) || null;
        };

        const _getEmbeddedBlock: (embeddedBlockName: string | null, fromLineIndex: number) => EmbeddedBlockLocation | null = (embeddedBlockName, fromLineIndex) => {
            const firstClassLocation = _getFirstClassBlockContainingLine(fromLineIndex);
            if (!!firstClassLocation) {
                return firstClassLocation.embeddedBlocks.find(eb => !!embeddedBlockName ? (eb.isLabeled === 'labeled' && eb.normalizedName === embeddedBlockName) : eb.isLabeled !== 'labeled') || null;
            } else {
                return null;
            }
        };
        
        return {
            firstClassBlocks: () => {
                return firstClassLocations;
            },
            getEmbeddedBlock: (embeddedBlockName, fromLineIndex) => {
                return _getEmbeddedBlock(embeddedBlockName, fromLineIndex);
            },
            getUnlabeledEmbeddedBlock: (fromLineIndex) => {
                return _getEmbeddedBlock(null, fromLineIndex);
            },
            getFirstClassBlockContainingLine: (fromLineIndex) => {
                return _getFirstClassBlockContainingLine(fromLineIndex);
            }
        };
    }

    public static buildBlockLocationMap(passes: Array<PassOutput>): Map<string, BlockLocationMap> {
        const m = new Map<string, BlockLocationMap>();
        BlockLocationMapper.mapLocationsForAllObjects(passes).forEach((v, k) => {
            m.set(k, BlockLocationMapper.createMapForObject(v));
        });
        return m;
    }
}