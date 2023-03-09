import { S4InstructionLine } from './stages/stage-4/s4-instruction-line';
import { PassOutput } from './passes/pass-output';
import { InstructionReorderMap } from './shared/parser-types/instruction-reorder-map';
import { AssemblyEntryPoint } from '../api-types/assembly-entry-point';

export class InstructionReorderMapper {
    private static identifyIndices(objectName: string, blockLabelName: string, dataset: Array<{ objectName: string, line: S4InstructionLine }>): Array<{
        readonly index: number,
        readonly lineIndex: number
    }> {
        const indices = new Array<{
            readonly index: number,
            readonly lineIndex: number
        }>();
        dataset.forEach((d, di) => {
            if (d.objectName === objectName && d.line.blockLabelName === blockLabelName) {
                indices.push({
                    index: di,
                    lineIndex: d.line.lineIndex
                });
            }
        })
        return indices;
    }

    // private static getInstructionCountForPreceedingPasses(globalPasses: Array<PassOutput>, objectName: string): number {
    //     const passIndex = globalPasses.findIndex(gp => gp.objectName === objectName);
    //     const preceedingInstructionCount = globalPasses
    //         .filter((gp, gpi) => gpi < passIndex)
    //         .map(gp => gp.totalInstructionCount)
    //         .reduce((x, y) => x + y, 0);
    //     return preceedingInstructionCount;
    // }

    private static computeOriginalIndex(globalPasses: Array<PassOutput>, objectName: string, lineIndex: number): number {
        const passIndex = globalPasses.findIndex(gp => gp.objectName === objectName);
        const preceedingInstructionCount = globalPasses
            .filter((gp, gpi) => gpi < passIndex)
            .map(gp => gp.totalInstructionCount)
            .reduce((x, y) => x + y, 0);

        const instructionIndexWithinObject = globalPasses[passIndex].stage2.instructionLines.sort((a, b) => a.lineIndex - b.lineIndex).findIndex(il => il.lineIndex === lineIndex);

        return preceedingInstructionCount + instructionIndexWithinObject;
    }
    
    public static getReorderMap(globalPasses: Array<PassOutput>, entryPoint?: AssemblyEntryPoint): InstructionReorderMap {
        let map = new Array<{
            readonly originalIndex: number;
            readonly reorderedIndex: number;
            readonly originalObjectName: string;
            readonly lineIndexWithinObject: number;
        }>();

        const dataset = globalPasses
            .map(gp => gp.stage4.instructionLines.map(il => {
                return { objectName: gp.objectName, line: il }
            }))
            .reduce((x, y) => x.concat(y), []);
        const originalFirstBlock = globalPasses.length > 0 ? globalPasses[0].stage3.labelLines.find(ln => !globalPasses[0].stage3.labelLines.some(ln2 => ln2.lineIndex < ln.lineIndex)) : undefined;
        if (!!originalFirstBlock) {
            const indicesOfNaturalFirst = InstructionReorderMapper.identifyIndices(globalPasses[0].objectName, originalFirstBlock.normalizedName, dataset);
            const targetObjectName = !!entryPoint ? entryPoint.objectName : globalPasses[0].objectName;
            const targetBlockName = !!entryPoint ? entryPoint.label : originalFirstBlock.normalizedName;
            const indicesOfTargetSwap = InstructionReorderMapper.identifyIndices(targetObjectName, targetBlockName, dataset);
            const sizeDiff = Math.max(0, indicesOfNaturalFirst.length - indicesOfTargetSwap.length);
            const globalInstructionCount = globalPasses.map(gp => gp.stage5.instructions.length).reduce((x,y)=> x + y, 0);
        
            indicesOfTargetSwap.forEach((i, ii) => {
                map.push({
                    originalIndex: InstructionReorderMapper.computeOriginalIndex(globalPasses, targetObjectName, i.lineIndex),
                    reorderedIndex: map.length,
                    originalObjectName: targetObjectName,
                    lineIndexWithinObject: i.lineIndex
                });
            });
        
            let previousOriginalIndex = -1;
            dataset.forEach((ds, dsi) => {
                if (dsi >= indicesOfNaturalFirst.length) {
                    if (indicesOfTargetSwap.some(i => i.index === dsi)) {
                        if (indicesOfTargetSwap[0].index === dsi) {
                            indicesOfNaturalFirst.forEach((ni, ii) => {
                                const originalIndex = InstructionReorderMapper.computeOriginalIndex(globalPasses, ds.objectName, ds.line.lineIndex);
                                if (!map.some(m => m.originalIndex === originalIndex && m.originalObjectName === ds.objectName)) {
                                    map.push({
                                        originalIndex: originalIndex,
                                        reorderedIndex: map.length,
                                        originalObjectName: ds.objectName,
                                        lineIndexWithinObject: ds.line.lineIndex
                                    });
                                }
                            });
                        }
                    } else {
                        let originalIndex = InstructionReorderMapper.computeOriginalIndex(globalPasses, ds.objectName, ds.line.lineIndex);
                        if (previousOriginalIndex > -1 && originalIndex - 1 !== previousOriginalIndex) {
                            originalIndex = dsi + sizeDiff;

                            if (originalIndex >= globalInstructionCount) {
                                originalIndex -= indicesOfNaturalFirst.length + indicesOfTargetSwap.length;
                            }
                        }

                        if (!map.some(m => m.originalIndex === originalIndex && m.originalObjectName === ds.objectName)) {
                            map.push({
                                originalIndex: originalIndex,
                                reorderedIndex: map.length,
                                originalObjectName: ds.objectName,
                                lineIndexWithinObject: ds.line.lineIndex
                            });
                        }
                    }
                } else {
                    const originalIndex = InstructionReorderMapper.computeOriginalIndex(globalPasses, ds.objectName, ds.line.lineIndex);
                    if (!map.some(m => m.originalIndex === originalIndex && m.originalObjectName === ds.objectName)) {
                        map.push({
                            originalIndex: originalIndex,
                            reorderedIndex: map.length,
                            originalObjectName: ds.objectName,
                            lineIndexWithinObject: ds.line.lineIndex
                        });
                    }
                }

                previousOriginalIndex = map[map.length - 1].originalIndex;
            });

            dataset.filter(x => !map.some(y => y.originalObjectName === x.objectName && y.lineIndexWithinObject === x.line.lineIndex)).forEach(x => {
                map.push({
                    originalIndex: previousOriginalIndex + 1,
                    reorderedIndex: map.length,
                    originalObjectName: x.objectName,
                    lineIndexWithinObject: x.line.lineIndex
                });
                previousOriginalIndex++;
            })
            const pivotPoints = map.map((m,mi) => {
                if (mi < map.length - 1 && map[mi + 1].originalIndex !== m.originalIndex + 1 && m.originalObjectName !== globalPasses[0].objectName) {
                    return mi;
                } else {
                    return -1;
                }
            }).filter(mi => mi > -1);

            if (pivotPoints.length > 0) {
                const pivotValue = pivotPoints.map(p => map[p].originalIndex).min(v => v);
                let workingIndex = pivotValue + 1;

                const correctedMap = new Array<{
                    readonly originalIndex: number;
                    readonly reorderedIndex: number;
                    readonly originalObjectName: string;
                    readonly lineIndexWithinObject: number;
                }>();

                for (let i = 0; i < map.length; i++) {
                    const element = map[i];
                    if (element.originalObjectName === globalPasses[0].objectName) {
                        correctedMap.push(element);
                    } else if (element.originalIndex > pivotValue) {
                        correctedMap.push({
                            originalIndex: workingIndex,
                            reorderedIndex: element.reorderedIndex,
                            originalObjectName: element.originalObjectName,
                            lineIndexWithinObject: element.lineIndexWithinObject
                        });
                        workingIndex++;
                    } else {
                        correctedMap.push(element);
                    }
                }

                map = correctedMap.sort((a, b) => a.originalIndex - b.originalIndex);
            }
        }

        return {
            findByOriginalIndex: (originalIndex) => {
                return map.find(m => m.originalIndex === originalIndex);
            },
            findByReorderedIndex: (reorderedIndex) => {
                return map.find(m => m.reorderedIndex === reorderedIndex);
            },
            findByLineIndex: (lineIndexWithinObject, originalObjectName) => {
                return map.find(m => m.lineIndexWithinObject === lineIndexWithinObject && m.originalObjectName === originalObjectName);
            }
        }
    }
}