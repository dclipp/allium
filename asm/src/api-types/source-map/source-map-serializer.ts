import { SourceLine } from './source-line';
import { SourceEntityKind } from './source-entity-kind';
import { LanguageConstructKind } from './language-construct-kind';
import { NativeDataType } from './native-data-type';
import { ConstructDetails } from './construct-details';
import { SourceEntity } from './source-entity';

export class SourceMapSerializer {
    public static serialize(lines: ReadonlyArray<SourceLine>): string {
        const allEntities = lines.map(ln => ln.entities).reduce((x, y) => x.concat(y), []);
        const stringsMap = SourceMapSerializer.buildStringsMap(allEntities);

        const serializedEntities = lines
            .map(ln => ln.entities.map(e => SourceMapSerializer.serializeSourceEntity(e, stringsMap)).reduce((x, y) => x.concat(y), []))
            .reduce((x, y) => x.concat(y), [])
            .map(x => {
                let hexString = x.toString(16);
                if (hexString.length === 1) {
                    return `0${hexString}`;
                } else {
                    return hexString;
                }
            }).reduce((x, y) => x + y, '');

        const serializedStringsMap = stringsMap.map(s => {
            let serializedString = '';
            for (let i = 0; i < s.length; i++) {
                const charCode = s.charCodeAt(i);
                const char = s.charAt(i);
                if (charCode >= 32 && charCode <= 126) {
                    if (char === '#' || char === '[' || char === ']') {
                        serializedString += '#';
                    }

                    serializedString += char;
                } else {
                    let hexCodeString = charCode.toString(16);
                    if (hexCodeString.length === 1) {
                        hexCodeString = '0' + hexCodeString;
                    }

                    serializedString += `#${hexCodeString}`;
                }
            }
            return `[${serializedString}]`;
        }).reduce((x, y) => x + y, '');

        const header = 'v1:'
        const serializedStringsMapLength = (serializedStringsMap.length & 255).toString(16).padStart(2, '0')
            + ((serializedStringsMap.length >> 8) & 255).toString(16).padStart(2, '0')
            + ((serializedStringsMap.length >> 16) & 255).toString(16).padStart(2, '0')
            + ((serializedStringsMap.length >> 24) & 255).toString(16).padStart(2, '0');

        return header + serializedStringsMapLength + serializedStringsMap + serializedEntities;
    }

    private static serializeSourceEntityKind(kind: SourceEntityKind): number {
        let sekCode = -1;
        switch (kind) {
            case 'space-sequence':
                sekCode = 0;
                break;
            case 'tab-sequence':
                sekCode = 1;
                break;
            case 'punctuation':
                sekCode = 2;
                break;
            case 'language-construct':
                sekCode = 3;
                break;
            case 'newline':
                sekCode = 4;
                break;
            case 'comment':
                sekCode = 5;
                break;
            case 'garbage':
                sekCode = 6;
                break;
        }

        return sekCode;
    }
    
    private static serializeLanguageConstructKind(kind: LanguageConstructKind): number {
        let lcc = -1;

        switch (kind) {
            case 'block-name':
                lcc = 0;
                break;
            case 'mnemonic':
                lcc = 1;
                break;
            case 'constant-injector-key':
                lcc = 2;
                break;
            case 'constant-injector-value':
                lcc = 3;
                break;
            case 'register-name':
                lcc = 4;
                break;
            case 'named-register-mask':
                lcc = 5;
                break;
            case 'unnamed-register-mask':
                lcc = 6;
                break;
            case 'auto-address-ref-target-local-label':
                lcc = 7;
                break;
            case 'auto-address-ref-target-embedded-label':
                lcc = 71;
                break;
            case 'auto-address-ref-target-external-label':
                lcc = 8;
                break;
            case 'auto-address-ref-directive-line-index':
                lcc = 9;
                break;
            case 'auto-address-ref-target-address':
                lcc = 10;
                break;
            case 'auto-address-ref':
                lcc = 11;
                break;
            case 'inline-unsigned-number':
                lcc = 12;
                break;
            case 'inline-signed-number':
                lcc = 13;
                break;
            case 'inline-float-number':
                lcc = 14;
                break;
            case 'directive-command':
                lcc = 15;
                break;
            case 'directive-receiver':
                lcc = 16;
                break;
            case 'directive-parameter':
                lcc = 17;
                break;
            case 'alias-reference':
                lcc = 18;
                break;
            case 'comment':
                lcc = 19;
                break;
        }

        return lcc;
    }
    
    private static serializeNativeDataType(type: NativeDataType): number {
        let ndc = -1;

        switch (type) {
            case 'none':
                ndc = 0;
                break;
            case 'inline-unsigned-number':
                ndc = 1;
                break;
            case 'inline-signed-number':
                ndc = 2;
                break;
            case 'inline-float-number':
                ndc = 3;
                break;
            case 'flag-code':
                ndc = 4;
                break;
            case 'memory-address':
                ndc = 5;
                break;
            case 'register-name':
                ndc = 6;
                break;
            case 'register-mask':
                ndc = 7;
                break;
            case 'io-port':
                ndc = 8;
                break;
            case 'io-command':
                ndc = 9;
                break;
            case 'mnemonic':
                ndc = 10;
                break;
        }

        return ndc;
    }
    
    private static serializeConstructDetails(constructDetails: ConstructDetails | 'none'): Array<number> {
        const codes = new Array<number>();

        if (constructDetails === 'none') {
            codes.push(0);
        } else {
            codes.push(1);
            codes.push(SourceMapSerializer.serializeLanguageConstructKind(constructDetails.kind));
            codes.push(SourceMapSerializer.serializeNativeDataType(constructDetails.dataType));
            if (constructDetails.nativeByteLength === 'none') {
                codes.push(0);
            } else {
                codes.push(constructDetails.nativeByteLength);
            }
            if (constructDetails.numericValue === 'none') {
                codes.push(0);
            } else {
                codes.push(1);
                codes.push(constructDetails.numericValue & 255)
                codes.push((constructDetails.numericValue >> 8) & 255);
                codes.push((constructDetails.numericValue >> 16) & 255);
                codes.push((constructDetails.numericValue >> 24) & 255);
            }
        }

        return codes;
    }

    /**
     * kind [1]
     * lineIndex [4]
     * startPosition [4]
     * endPosition [4]
     * idLength [4]
     * idChars [var]
     * objectNameMapIndex [4]
     * textMapIndex [4]
     * hasGroup [1]
     * groupMapIndex [0 or 4]
     * referencesToThisCount [4]
     * referencesToThisMapIndices [0 or (4 times count)]
     * constructDetails [var]
     */
    private static serializeSourceEntity(sourceEntity: SourceEntity, stringsMap: Array<string>): Array<number> {
        const codes = new Array<number>();

        codes.push(SourceMapSerializer.serializeSourceEntityKind(sourceEntity.kind));

        codes.push(sourceEntity.lineIndex & 255);
        codes.push((sourceEntity.lineIndex >> 8) & 255);
        codes.push((sourceEntity.lineIndex >> 16) & 255);
        codes.push((sourceEntity.lineIndex >> 24) & 255);

        codes.push(sourceEntity.startPosition & 255);
        codes.push((sourceEntity.startPosition >> 8) & 255);
        codes.push((sourceEntity.startPosition >> 16) & 255);
        codes.push((sourceEntity.startPosition >> 24) & 255);

        codes.push(sourceEntity.endPosition & 255);
        codes.push((sourceEntity.endPosition >> 8) & 255);
        codes.push((sourceEntity.endPosition >> 16) & 255);
        codes.push((sourceEntity.endPosition >> 24) & 255);

        codes.push(sourceEntity.id.length & 255);
        codes.push((sourceEntity.id.length >> 8) & 255);
        codes.push((sourceEntity.id.length >> 16) & 255);
        codes.push((sourceEntity.id.length >> 24) & 255);

        for (let i = 0; i < sourceEntity.id.length; i++) {
            codes.push(sourceEntity.id.charCodeAt(i));
        }

        SourceMapSerializer.appendStringsMapIndex(sourceEntity.objectName, stringsMap, (c) => {
            codes.push(c);
        });

        SourceMapSerializer.appendStringsMapIndex(sourceEntity.text, stringsMap, (c) => {
            codes.push(c);
        });

        if (!!sourceEntity.group) {
            codes.push(1);
            SourceMapSerializer.appendStringsMapIndex(sourceEntity.group, stringsMap, (c) => {
                codes.push(c);
            });
        } else {
            codes.push(0);
        }

        codes.push(sourceEntity.referencesToThis.length & 255);
        codes.push((sourceEntity.referencesToThis.length >> 8) & 255);
        codes.push((sourceEntity.referencesToThis.length >> 16) & 255);
        codes.push((sourceEntity.referencesToThis.length >> 24) & 255);

        if (sourceEntity.referencesToThis.length > 0) {
            sourceEntity.referencesToThis.forEach(r => {
                SourceMapSerializer.appendStringsMapIndex(r, stringsMap, (c) => {
                    codes.push(c);
                });
            });
        }

        SourceMapSerializer.serializeConstructDetails(sourceEntity.constructDetails).forEach(c => {
            codes.push(c);
        });
//TODO messages
        return codes;
    }

    private static buildStringsMap(entities: Array<SourceEntity>, workingMapIn?: Array<string>): Array<string> {
        const workingMap = new Array<string>();
        if (!!workingMapIn) {
            workingMapIn.forEach(s => workingMap.push(s));
        }

        entities.forEach(e => {
            if (!workingMap.includes(e.objectName)) {
                workingMap.push(e.objectName);
            }

            if (!workingMap.includes(e.text)) {
                workingMap.push(e.text);
            }

            if (!!e.group && !workingMap.includes(e.group)) {
                workingMap.push(e.group);
            }

            e.referencesToThis.forEach(r => {
                if (!workingMap.includes(r)) {
                    workingMap.push(r);
                }
            });
        });

        return workingMap;
    }

    private static appendStringsMapIndex(s: string, stringsMap: Array<string>, pushCode: (c: number) => void): void {
        const mapIndex = stringsMap.indexOf(s);
        if (mapIndex > -1) {
            pushCode(mapIndex & 255);
            pushCode((mapIndex >> 8) & 255);
            pushCode((mapIndex >> 16) & 255);
            pushCode((mapIndex >> 24) & 255);
        } else {
            throw new Error(`String not found in map: "${s}"`);
        }
    }
}