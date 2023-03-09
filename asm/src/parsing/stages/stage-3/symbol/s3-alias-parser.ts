import { ByteSequenceCreator, DynamicByteSequence, RealNumber, QuadByte, INSTRUCTION_BYTE_COUNT } from '@allium/types';
import { AliasOperand } from '../../../shared/alias/alias-operand';
import { AliasArithmeticOperator } from '../../../shared/alias/alias-arithmetic-operator';
import { AliasOperandType } from '../../../shared/alias/alias-operand-type';
import { AliasValue } from '../../../shared/alias/alias-value';
import { AliasCastType } from '../../../shared/alias/alias-cast-type';
import { ConstantInjectionKindMap, ConstantInjectionKind } from '../../../shared/constant-injector/constant-injection-kind';
import { ConstantInjectorValueResolver } from '../../../shared/constant-injector/constant-injector-value-resolver';
import { PassDetails } from '../../../shared/parser-types/pass-details';
import { PassScope } from '../../../passes/pass-scope';
import { S3DirectiveLine } from '../directive/s3-directive-line';
import { DirectiveCommand } from '../../../shared/directive/directive-command';
import { AutoAddressRefParser } from '../../../shared/auto-address-ref/auto-address-ref-parser';
import { AutoAddressRefKind } from '../../../shared/auto-address-ref/auto-address-ref-kind';
import { RelativeRefAnchor } from '../../../shared/auto-address-ref/relative-ref-anchor';
import { RelativeExpressionOperation } from '../../../shared/auto-address-ref/relative-expression-operation';
import { ObjectSymbol } from '../../../shared/symbol/object-symbol';
import { ObjectSymbolKind } from '../../../shared/symbol/object-symbol-kind';

/*
        ( B )
         / \
       (L) (R)

       ( B )
         / \
       (L) ( B )
            / \
          (L) (R)
               |
             ( B )
              / \
            (L) (R)
*/

type TreeNode = {
    readonly left: TreeNode | null;
    readonly right: TreeNode | null;
    readonly root: AliasArithmeticOperator;
} | AliasOperand;

export class S3AliasParser {
    private static buildNode(content: string): TreeNode {
        let left: TreeNode | null = null;
        let root: AliasArithmeticOperator | null = null;
        let right: TreeNode | null = null;

        const startIndex = content.indexOf('{');
        let leftOperand: AliasOperand | null = null;
        let inner = content;
        let leftRequiresClosing = false;

        if (startIndex < 0) {
            leftOperand = S3AliasParser.parseOperand(content);
        } else {
            inner = content.substring(startIndex + 1);
            leftOperand = S3AliasParser.parseOperand(inner);
            leftRequiresClosing = true;
        }
        if (!!leftOperand) {
            left = leftOperand;
            if (leftOperand.literal.length < inner.length) {
                const afterLeftLiteral = inner.substring(left.literal.length);
                if (RegExp(/^[ \t]{0,}\}/).test(afterLeftLiteral)) {
                    const endIndex = afterLeftLiteral.indexOf('}');
                    if (endIndex > -1) {
                        const afterLeftGroup = endIndex < afterLeftLiteral.length - 1
                            ? afterLeftLiteral.substring(endIndex + 1)
                            : '';

                        if (!!afterLeftGroup) {
                            let operatorLength = 0;
                            if (S3AliasParser.parseOperator(afterLeftGroup, (o) => {
                                if (o.operator !== 'not-found') {
                                    root = o.operator;
                                    operatorLength = o.length;
                                }
                            })) {
                                const afterOperator = afterLeftGroup.length > operatorLength
                                    ? afterLeftGroup.substring(operatorLength)
                                    : '';
                                if (!!afterOperator) {
                                    try {
                                        if (RegExp(/^([ \t]{0,})(\{[ \t]{0,}){2,}/).test(afterOperator)) {
                                            const nestedStart = afterOperator.indexOf('{');
                                            let nestedInner = afterOperator.substring(nestedStart + 1);
                                            nestedInner = nestedInner.substring(0, nestedInner.length - 1);
                                            right = S3AliasParser.buildNode(nestedInner);
                                        } else {
                                            right = S3AliasParser.buildNode(afterOperator);
                                        }
                                    } catch (exc) {
                                        throw new Error('Expected right side but found none');
                                    }
                                } else {
                                    throw new Error('Expected right side but found none');
                                }
                            } else {
                                throw new Error('Expected operator but found none');
                            }
                        }
                    } else if (leftRequiresClosing) {
                        throw new Error('Missing closing \')\' for left side');
                    }
                } else if (leftRequiresClosing) {
                    throw new Error('Missing closing \')\' for left side');
                }
            } else if (leftRequiresClosing) {
                throw new Error('Missing closing \')\' for left side');
            }
        } else {
            throw new Error('No parseable node found');
        }

        if (root !== null && !!right) {
            return {
                left: left,
                root: root,
                right: right
            }
        } else if (root !== null) {
            throw new Error('Expected right side but found none');
        } else if (!!right) {
            throw new Error('Expected operator but found none');
        } else {
            return left as AliasOperand;
        }
    }

    private static isOperand(o: any): o is AliasOperand {
        return !!o && Object.getOwnPropertyNames(o).includes('literal');
    }

    private static isDependencyDescription(o: any): o is { readonly dependsOn: string } {
        return !!o && Object.getOwnPropertyNames(o).includes('dependsOn');
    }

    private static isNumber(o: any): o is number {
        return o !== undefined && o !== null && Number(o) === o;
    }

    private static isDependencyDescriptorString(o: any): boolean {
        return !!o && !S3AliasParser.isNumber(o) && !!o.startsWith && o.startsWith('dep:');
    }

    private static evaluateOperand(operand: AliasOperand, passDetails: PassDetails, previouslyParsedAliases: Map<string, AliasValue>, directiveLines: Array<S3DirectiveLine>, internalSymbols: Array<ObjectSymbol>, lineIndex: number): number | string {// 'failed' | 'deferred' {
        let value: number | string = 'failed';

        switch (operand.type) {
            case AliasOperandType.AliasRef:
                value = S3AliasParser.tryResolveAliasRef(operand.literal, previouslyParsedAliases);
                break;
            case AliasOperandType.AutoAddressRef:
                value = S3AliasParser.tryResolveAutoAddressRef(operand.literal, passDetails, internalSymbols, directiveLines, lineIndex);
                break;
            case AliasOperandType.ConstantInjector:
                value = S3AliasParser.tryResolveConstantInjector(operand.literal);
                break;
            case AliasOperandType.ConstantInjectorQuotedValue:
                throw new Error('Not implemented: Alias - ConstantInjectorQuotedValue');
                break;
            case AliasOperandType.ImportRef:
                value = S3AliasParser.tryResolveImportRef(operand.literal, passDetails, directiveLines);
                break;
            case AliasOperandType.IntNumberBase10:
                value = Number.parseInt(operand.literal);
                break;
            case AliasOperandType.IntNumberBase16:
                value = Number.parseInt(operand.literal, 16);
                break;
            case AliasOperandType.FloatNumber:
                value = Number.parseFloat(operand.literal);
                break;
        }

        return value;
    }

    private static evaluateTree(baseNode: TreeNode, passDetails: PassDetails, previouslyParsedAliases: Map<string, AliasValue>, directiveLines: Array<S3DirectiveLine>, internalSymbols: Array<ObjectSymbol>, lineIndex: number): number | string {
        let treeValue: number | string = 'failed';

        if (S3AliasParser.isOperand(baseNode)) {
            treeValue = S3AliasParser.evaluateOperand(baseNode, passDetails, previouslyParsedAliases, directiveLines, internalSymbols, lineIndex);
        } else {
            const leftValue = !!baseNode.left ? S3AliasParser.evaluateTree(baseNode.left, passDetails, previouslyParsedAliases, directiveLines, internalSymbols, lineIndex) : 'failed';
            const rightValue = !!baseNode.right ? S3AliasParser.evaluateTree(baseNode.right, passDetails, previouslyParsedAliases, directiveLines, internalSymbols, lineIndex) : 0;
            const operator = baseNode.root;

            if (leftValue === 'deferred' || rightValue === 'deferred') {
                treeValue = 'deferred';
            } else if (S3AliasParser.isDependencyDescriptorString(leftValue)) {
                treeValue = leftValue.toString();
            } else if (S3AliasParser.isDependencyDescriptorString(rightValue)) {
                treeValue = rightValue.toString();
            } else if (S3AliasParser.isNumber(leftValue) && S3AliasParser.isNumber(rightValue)) {
                switch (operator) {
                    case AliasArithmeticOperator.Add:
                        treeValue = leftValue + rightValue;
                        break;
                    case AliasArithmeticOperator.Divide:
                        treeValue = leftValue / rightValue;
                        break;
                    case AliasArithmeticOperator.Multiply:
                        treeValue = leftValue * rightValue;
                        break;
                    case AliasArithmeticOperator.Power:
                        treeValue = Math.pow(leftValue, rightValue);
                        break;
                    case AliasArithmeticOperator.Subtract:
                        treeValue = leftValue - rightValue;
                        break;
                }
            }
        }

        if (S3AliasParser.isNumber(treeValue) && Number.isNaN(treeValue)) {
            return 'failed';
        } else {
            return treeValue;
        }
    }

    private static parseOperand(content: string): AliasOperand | null {
        let bestMatchType: AliasOperandType | 'none' = 'none';
        let bestMatchLength = 0;

        for (let i = 1; i <= content.length; i++) {
            const sub = content.substring(0, i);
            if (S3AliasParser.ALIAS_REF_REGEX.test(sub)) {
                bestMatchType = AliasOperandType.AliasRef;
                bestMatchLength = i;
            } else if (S3AliasParser.AUTO_ADDRESS_REF_BLOCK_REGEX.test(sub) || S3AliasParser.AUTO_ADDRESS_REF_RELATIVE_REGEX.test(sub)) {
                bestMatchType = AliasOperandType.AutoAddressRef;
                bestMatchLength = i;
            } else if (S3AliasParser.CONSTANT_INJECTOR_REGEX.test(sub)) {
                bestMatchType = AliasOperandType.ConstantInjector;
                bestMatchLength = i;
            } else if (S3AliasParser.CONSTANT_INJECTOR_QUOTED_REGEX.test(sub)) {
                bestMatchType = AliasOperandType.ConstantInjectorQuotedValue;
                bestMatchLength = i;
            } else if (S3AliasParser.IMPORT_REF_REGEX.test(sub)) {
                bestMatchType = AliasOperandType.ImportRef;
                bestMatchLength = i;
            } else if (S3AliasParser.NUMBER_REGEX_BASE_10.test(sub)) {
                bestMatchType = AliasOperandType.IntNumberBase10;
                bestMatchLength = i;
            } else if (S3AliasParser.NUMBER_REGEX_BASE_16.test(sub)) {
                bestMatchType = AliasOperandType.IntNumberBase16;
                bestMatchLength = i;
            } else if (S3AliasParser.NUMBER_REGEX_FLOAT.test(sub)) {
                bestMatchType = AliasOperandType.FloatNumber;
                bestMatchLength = i;
            }
        }

        if (bestMatchType === 'none') {
            return null;
        } else {
            return {
                type: bestMatchType,
                literal: content.substring(0, bestMatchLength)
            };
        }
    }

    private static parseOperator(content: string, setResult: (o: {
        readonly operator: AliasArithmeticOperator | 'not-found';
        readonly length: number;
    }) => void): boolean {
        if (!!content) {
            let operator: AliasArithmeticOperator | 'none' = 'none';
            if (S3AliasParser.OPERATOR_ADD_REGEX.test(content)) {
                operator = AliasArithmeticOperator.Add;
            } else if (S3AliasParser.OPERATOR_DIVIDE_REGEX.test(content)) {
                operator = AliasArithmeticOperator.Divide;
            } else if (S3AliasParser.OPERATOR_MULT_REGEX.test(content)) {
                operator = AliasArithmeticOperator.Multiply;
            } else if (S3AliasParser.OPERATOR_SUBTRACT_REGEX.test(content)) {
                operator = AliasArithmeticOperator.Subtract;
            } else if (S3AliasParser.OPERATOR_POWER_REGEX.test(content)) {
                operator = AliasArithmeticOperator.Power;
            }

            if (operator === 'none') {
                setResult({
                    operator: 'not-found',
                    length: 0
                })
                return false;
            } else {
                const operatorLength = content.length - content.trim().length + 1;
                setResult({
                    operator: operator,
                    length: operatorLength
                })
                return true;
            }
        } else {
            setResult({
                operator: 'not-found',
                length: 0
            })
            return false;
        }
    }

    private static tryResolveConstantInjector(content: string): number | 'failed' {
        let value: number | 'failed' = 'failed';

        try {
            const matches = content.match(RegExp(/[ \t]{0,}@[ \t]{0,}([a-zA-Z]+)[ \t]{0,}=[ \t]{0,}([\._a-zA-Z0-9]+)/));
            if (!!matches && matches.length > 2) {
                const commandLiteral = matches[1].toString();
                const valueLiteral = matches[2].toString();
                if (!!commandLiteral && !!valueLiteral) {
                    let injectionKind: ConstantInjectionKind | undefined = undefined;
                    let injectionValue: number | undefined = undefined;
                    const injectionKindName = Object.keys(ConstantInjectionKindMap).find(k => k === commandLiteral.trim());
                    if (!!injectionKindName) {
                        injectionKind = ConstantInjectionKindMap[injectionKindName];
                        if (injectionKind !== undefined) {
                            let numeric = Number.NaN;
                            if (valueLiteral.includes('.')) {
                                numeric = Number.parseFloat(valueLiteral);
                            } else {
                                numeric = Number.parseInt(valueLiteral);
                            }

                            if (!Number.isNaN(numeric)) {
                                injectionValue = numeric;
                            }
                        }
                    }

                    if (injectionKind !== undefined && injectionValue !== undefined) {
                        if (injectionKind === ConstantInjectionKind.Float || Number.isInteger(injectionValue)) {
                            const resolvedCi = ConstantInjectorValueResolver.tryResolve(injectionKind, injectionValue);
                            if (resolvedCi !== 'invalid') {
                                if (injectionKind === ConstantInjectionKind.Float) {
                                    value = RealNumber.decode(resolvedCi as QuadByte);
                                } else {
                                    value = ByteSequenceCreator.Unbox(resolvedCi);
                                }
                            }
                        }
                    }
                }
            }
        } catch (exc) {

        }

        return value;
    }

    private static tryResolveImportRef(content: string, passDetails: PassDetails, directiveLines: Array<S3DirectiveLine>): number | 'failed' | 'deferred' {
        if (passDetails.scope === PassScope.Local) {
            return 'deferred';
        } else if (!!passDetails.symbols) {
            const segments = content.split(':').map(s => s.trim());
            const importDirective = directiveLines.find(dl => dl.command === DirectiveCommand.Import && dl.receiverName === segments[0]);
            if (!!importDirective) {
                const objectName = importDirective.hasParameter
                    ? importDirective.parameterValue.trim()
                    : undefined;
                const symbol = !!objectName ? passDetails.symbols.findMember(s => s.objectName === objectName && s.symbols.some(t => t.name === segments[1]), s => s.symbols.find(t => t.name === segments[1])) : undefined;
                if (!!symbol) {
                    if (symbol.value === 'deferred') {
                        return 'deferred';
                    } else {
                        return ByteSequenceCreator.Unbox(symbol.value);
                    }
                } else {
                    return 'failed';    
                }
            } else {
                return 'failed';
            }
        } else {
            return 'failed';
        }
    }

    private static tryResolveAutoAddressRef(content: string, passDetails: PassDetails, internalSymbols: Array<ObjectSymbol>, directiveLines: Array<S3DirectiveLine>, lineIndex: number): number | 'failed' | 'deferred' {
        if (passDetails.scope === PassScope.Local) {
            return 'deferred';
        } else {
            let value: number | 'failed' | 'deferred' = 'failed';
            const autoAddressRef = AutoAddressRefParser.tryParse(content);
            if (autoAddressRef.succeeded) {
                if (autoAddressRef.value.kind === AutoAddressRefKind.Block) {
                    if (autoAddressRef.value.isEmbedded) {
                        if (!!passDetails.blockLocationMap) {
                            const embeddedBlockTarget = passDetails.blockLocationMap.getEmbeddedBlock(autoAddressRef.value.blockName, lineIndex);
                            if (!!embeddedBlockTarget) {
                                const index = embeddedBlockTarget.nominalAddress / INSTRUCTION_BYTE_COUNT;
                                const reorder = !!passDetails.instructionReorderMap ? passDetails.instructionReorderMap.findByOriginalIndex(index) : undefined;
                                if (!!reorder) {
                                    value = reorder.reorderedIndex * INSTRUCTION_BYTE_COUNT;
                                } else {
                                    value = index * INSTRUCTION_BYTE_COUNT;
                                }
                            } else {
                                value = 'failed';
                            }
                        } else {
                            value = 'deferred';
                        }
                    } else if (autoAddressRef.value.isExternalBlock) {
                        const importedAsName = autoAddressRef.value.externalObjectName;
                        const line = directiveLines.find(dl => dl.command === DirectiveCommand.Import && dl.receiverName === importedAsName);
                        if (!!line && line.hasParameter) {
                            const targetObjectName = line.parameterValue.trim();
                            const targetBlockName = autoAddressRef.value.blockName;
                            const symbol = passDetails.symbols.findMember(r => r.objectName === targetObjectName && r.symbols.some(s => s.kind === ObjectSymbolKind.FirstClassBlockLabel && s.name === targetBlockName), (r) => r.symbols.find(s => s.name === targetBlockName));
                            if (!!symbol) {
                                if (symbol.value === 'deferred') {
                                    value = 'deferred';
                                } else {
                                    const index = ByteSequenceCreator.Unbox(symbol.value) / INSTRUCTION_BYTE_COUNT;
                                    const reorder = !!passDetails.instructionReorderMap ? passDetails.instructionReorderMap.findByOriginalIndex(index) : undefined;
                                    if (!!reorder) {
                                        value = reorder.reorderedIndex * INSTRUCTION_BYTE_COUNT;
                                    } else {
                                        value = index * INSTRUCTION_BYTE_COUNT;
                                    }
                                }
                            }
                        }
                    } else {
                        const targetBlockName = autoAddressRef.value.blockName;
                        const symbol = internalSymbols.find(s => s.kind === ObjectSymbolKind.FirstClassBlockLabel && s.name === targetBlockName);
                        if (!!symbol) {
                            if (symbol.value === 'deferred') {
                                value = 'deferred';
                            } else {
                                const index = ByteSequenceCreator.Unbox(symbol.value) / INSTRUCTION_BYTE_COUNT;
                                const reorder = !!passDetails.instructionReorderMap ? passDetails.instructionReorderMap.findByOriginalIndex(index) : undefined;
                                if (!!reorder) {
                                    value = reorder.reorderedIndex * INSTRUCTION_BYTE_COUNT;
                                } else {
                                    value = index * INSTRUCTION_BYTE_COUNT;
                                }
                            }
                        }
                    }
                } else if (autoAddressRef.value.kind === AutoAddressRefKind.Relative) {
                    if (autoAddressRef.value.relativeTo === RelativeRefAnchor.RefPosition) {
                        // error
                    } else {
                        let address = passDetails.globalInstructionCount * INSTRUCTION_BYTE_COUNT;
                        if (autoAddressRef.value.hasExpression) {
                            if (autoAddressRef.value.expression.operation === RelativeExpressionOperation.Add) {
                                address += autoAddressRef.value.expression.parameter;
                            } else if (autoAddressRef.value.expression.operation === RelativeExpressionOperation.Subtract) {
                                address -= autoAddressRef.value.expression.parameter;
                            }
                        }

                        if (address >= 0 && address < Math.pow(2, 32)) {
                            value = address;
                        }
                    }
                }
            }
            return value;
        }
    }

    private static tryResolveAliasRef(content: string, parsedAliases: Map<string, AliasValue>): number | string {
        const referencedAliasName = content.replace('#', '').trim();
        if (parsedAliases.has(referencedAliasName)) {
            const ra = parsedAliases.get(referencedAliasName);
            if (ra === 'error') {
                return 'failed';
            } else if (ra === 'deferred') {
                return 'deferred';
            } else if (S3AliasParser.isDependencyDescription(ra)) {
                return `dep:${referencedAliasName}`;
            } else {
                return ByteSequenceCreator.Unbox(ra);// { seq: ra.sequence, isFixedLength: ra.isFixedLength };
            }
        } else {
            return `dep:${referencedAliasName}`;
        }
    }

    public static parse(content: string, passDetails: PassDetails, previouslyParsedAliases: Map<string, AliasValue>, directiveLines: Array<S3DirectiveLine>, internalSymbols: Array<ObjectSymbol>, lineIndex: number): AliasValue {//| 'error' | 'deferred' {
        let castType = AliasCastType.None;

        const tests: Array<[RegExp, AliasCastType]> = [
            [RegExp(/[.]{0,}as[ \t]{1,}Byte$/g), AliasCastType.Byte],
            [RegExp(/[.]{0,}as[ \t]{1,}DoubleByte$/g), AliasCastType.DoubleByte],
            [RegExp(/[.]{0,}as[ \t]{1,}TriByte$/g), AliasCastType.TriByte],
            [RegExp(/[.]{0,}as[ \t]{1,}QuadByte$/g), AliasCastType.QuadByte],
            [RegExp(/[.]{0,}as[ \t]{1,}Float$/g), AliasCastType.Float],
            [RegExp(/[.]{0,}as[ \t]{1,}Address$/g), AliasCastType.Address],
            [RegExp(/[.]{0,}as[ \t]{1,}(.){0,}$/g), AliasCastType.Invalid]
        ]

        let useContent = content;
        for (let i = 0; i < tests.length && castType === AliasCastType.None; i++) {
            const current = tests[i];
            const m = content.match(current[0]);
            if (!!m && m.length > 0) {
                castType = current[1];
                if (castType !== AliasCastType.Invalid) {
                    useContent = content.substring(0, content.lastIndexOf(m[0]));
                }
            }
        }
       
        if (castType === AliasCastType.Invalid) {
            throw new Error('Invalid cast');
        } else {
            while (useContent.endsWith(' ') && useContent.length > 0) {
                useContent = useContent.substring(0, useContent.length - 1);
            }
            while (useContent.endsWith('\t') && useContent.length > 0) {
                useContent = useContent.substring(0, useContent.length - 1);
            }

            let retVal: AliasValue = 'error';
            // let seq: DynamicByteSequence | null = null;
            // let isDynamicLength = false;
            // let isDeferred = false;
            const treeValue = S3AliasParser.evaluateTree(S3AliasParser.buildNode(useContent), passDetails, previouslyParsedAliases, directiveLines, internalSymbols, lineIndex);
            if (treeValue === 'deferred') {
                retVal = 'deferred';
            } else if (S3AliasParser.isDependencyDescriptorString(treeValue)) {
                retVal = { dependsOn: treeValue.toString().split(':')[1] };
            } else if (S3AliasParser.isNumber(treeValue)) {
                let seq: DynamicByteSequence | null = null;
                let isDynamicLength = false;

                if (castType === AliasCastType.None) {
                    if (Number.isInteger(treeValue)) {
                        seq = ByteSequenceCreator.QuadByte(treeValue);
                    } else if (!Number.isNaN(treeValue)) {
                        seq = RealNumber.encode(treeValue);
                    }
                } else {
                    switch (castType) {
                        case AliasCastType.Byte:
                            seq = ByteSequenceCreator.Byte(treeValue);
                            break;
                        case AliasCastType.DoubleByte:
                            seq = ByteSequenceCreator.DoubleByte(treeValue);
                            break;
                        case AliasCastType.TriByte:
                            seq = ByteSequenceCreator.TriByte(treeValue);
                            break;
                        case AliasCastType.QuadByte:
                            seq = ByteSequenceCreator.QuadByte(treeValue);
                            break;
                        case AliasCastType.Float:
                            seq = RealNumber.encode(treeValue);
                            break;
                        case AliasCastType.Address:
                            seq = ByteSequenceCreator.QuadByte(treeValue);
                            isDynamicLength = true;
                            break;
                    }
                }

                if (seq === null) {
                    retVal = 'error';
                } else {
                    retVal = seq;
                }
            }
            
            return retVal;
        }
    }

    private static readonly ALIAS_REF_REGEX = RegExp(/^[ \t]{0,}#[ \t]{0,}([_a-zA-Z][_a-zA-Z0-9]{0,})$/);
    // private static readonly AUTO_ADDRESS_REF_REGEX = RegExp(/^$/);
    private static readonly AUTO_ADDRESS_REF_BLOCK_REGEX = RegExp('^[ \\t]{0,}' + AutoAddressRefParser.blockRefRegex.source + '$');
    private static readonly AUTO_ADDRESS_REF_RELATIVE_REGEX = RegExp('^[ \\t]{0,}' + AutoAddressRefParser.relativeRefRegex.source + '$');
    private static readonly CONSTANT_INJECTOR_REGEX = RegExp(/^[ \t]{0,}@[ \t]{0,}([a-zA-Z]+)[ \t]{0,}=[ \t]{0,}[\._a-zA-Z0-9]+$/);
    private static readonly CONSTANT_INJECTOR_QUOTED_REGEX = RegExp(/^[ \t]{0,}@[ \t]{0,}([a-zA-Z]+)[ \t]{0,}=[ \t]{0,}"([\x00-\x21\x23-\x7F]{0,})"$/);
    private static readonly IMPORT_REF_REGEX = RegExp(/^[ \t]{0,}[_a-zA-Z][_a-zA-Z0-9]{0,}[ \t]{0,}:[ \t]{0,}[_a-zA-Z][_a-zA-Z0-9]{0,}$/);
    private static readonly NUMBER_REGEX_BASE_10 = RegExp(/^[ \t]{0,}([0-9]+)$/);
    private static readonly NUMBER_REGEX_BASE_16 = RegExp(/^[ \t]{0,}(0x([0-9a-fA-F]+))$/);
    private static readonly NUMBER_REGEX_FLOAT = RegExp(/^[ \t]{0,}([\.0-9]+)$/);

    private static readonly OPERATOR_ADD_REGEX = RegExp(/^[ \t]{0,}\+/);
    private static readonly OPERATOR_DIVIDE_REGEX = RegExp(/^[ \t]{0,}\//);
    private static readonly OPERATOR_MULT_REGEX = RegExp(/^[ \t]{0,}\*/);
    private static readonly OPERATOR_SUBTRACT_REGEX = RegExp(/^[ \t]{0,}\-*/);
    private static readonly OPERATOR_POWER_REGEX = RegExp(/^[ \t]{0,}\-^/);
}