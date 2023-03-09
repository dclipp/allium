const fs = require('fs');

function buildMessageObject(containerObject, rootPath) {
    if (!!containerObject['code']) {
        const code = containerObject.code;
        const masterCode = containerObject.masterCode || 0;
        return [{
            runtimeCode: code + masterCode,
            path: rootPath
        }]
    } else {
        return Object.keys(containerObject)
            .map(k => buildMessageObject(containerObject[k], `${rootPath}.${k}`))
            .reduce((x, y) => x.concat(y), []);
    }
}

function parseMessages() {
    let json = fs.readFileSync(`resources/message-templates/parser-messages.json`, { encoding: 'utf8'})//TODO'';
    const o = JSON.parse(json);
    return Object.keys(o).map(k => buildMessageObject(o[k], k)).reduce((x, y) => x.concat(y), []);
}

function buildLocalizationProperty(containerObject, rootPath) {
    if (!!containerObject['length']) {
        return [{
            vocab: containerObject,
            path: rootPath
        }]
    } else {
        return Object.keys(containerObject)
            .map(k => buildLocalizationProperty(containerObject[k], `${rootPath}.${k}`))
            .reduce((x, y) => x.concat(y), []);
    }
}

function parseLocalizations(json) {
    const o = JSON.parse(json);
    return Object.keys(o).map(k => buildLocalizationProperty(o[k], k)).reduce((x, y) => x.concat(y), []);
}

function appendTokens(toArray, localizationProps) {
    localizationProps.forEach(lzn => {
        lzn.vocab.split(' ').filter(v => !!v).forEach(v => {
            const index = toArray.indexOf(v);
            if (index < 0) {
                toArray.push(v);
            }
        })
    })
}

function mapVocabToTokenIndices(tokenIndices, vocab) {
    return vocab.split(' ').filter(v => !!v).map(v => {
        return tokenIndices.indexOf(v);
    })
}

function direntToString(o) {
    if (!!o.name) {
        return o.name;
    } else {
        return o;
    }
}

function mapLocalizations(tokens, messageDefinitions) {
    const files = fs.readdirSync('resources/strings/messages', {
        withFileTypes: true
    }).map(f => direntToString(f)).filter(f => f.toLowerCase().endsWith('.json'));

    return files.map(f => {
        const currentJson = fs.readFileSync(`resources/strings/messages/${f}`, { encoding: 'utf8'});
        const localizationProperties = parseLocalizations(currentJson);
        const locale = f.substring(0, f.lastIndexOf('.')).split('_');
        appendTokens(tokens, localizationProperties);

        return {
            language: locale[0],
            region: locale[1],
            localizations: messageDefinitions.map(def => {
                const prop = localizationProperties.find(lp => lp.path === def.path);
                let vocabTokens = [];
                if (!!prop) {
                    vocabTokens = mapVocabToTokenIndices(tokens, prop.vocab);
                } else {
                    console.warn(`WARNING: No localization entry for "${def.path}" (${locale[0]}_${locale[1]})`);
                }

                return {
                    runtimeCode: def.runtimeCode,
                    vocabTokens: vocabTokens
                }
            })
        }
    });
}

function generateTsSourceFile(stringSets, tokens) {
    const setsJson = JSON.stringify(stringSets, null, 2);
    const setsSource = setsJson
        .replace(/"language"/g, 'language')
        .replace(/"region"/g, 'region')
        .replace(/"localizations"/g, 'localizations')
        .replace(/"runtimeCode"/g, 'runtimeCode')
        .replace(/"vocabTokens"/g, 'vocabTokens')
        .replace(/"/g, '\'');

    const tokensJson = JSON.stringify(tokens, null, 2);
    const tokensSource = `const TOKENS: ReadonlyArray<string> = ${tokensJson}`;

    const localizationTypeDef = '{ readonly runtimeCode: number, readonly vocabTokens: ReadonlyArray<number> }';
    const arrayTypeDef = `ReadonlyArray<{\n\treadonly language: string\n\treadonly region: string\n\treadonly localizations: ReadonlyArray<${localizationTypeDef}>\n}>`;
    
    const autoGenComment = '//\n// This file is auto-generated via the \'src:update:message-strings\' script\n//\n';
    const defaultPropConstDef = 'const DEFAULT_PROPERTY_VALUE = \'default\';\n';
    const localizeMessageFnDef = "export function localizeMessage(runtimeCode: number, language: string, region: string): string {\n\tlet localizations: ReadonlyArray<{ readonly runtimeCode: number, readonly vocabTokens: ReadonlyArray<number> }> = MESSAGE_STRINGS.find(ms => ms.language === DEFAULT_PROPERTY_VALUE && ms.region === DEFAULT_PROPERTY_VALUE).localizations;\n\n\tconst languageLocalizationSets = MESSAGE_STRINGS.filter(ms => ms.language === language);\n\tconst regionLocalizationSet = languageLocalizationSets.find(ls => ls.region === region);\n\n\tif (!!regionLocalizationSet) {\n\t\tlocalizations = regionLocalizationSet.localizations;\n\t} else {\n\t\tconst languageDefault = MESSAGE_STRINGS.find(ms => ms.language === language && ms.region === DEFAULT_PROPERTY_VALUE);\n\t\tif (!!languageDefault) {\n\t\t\tlocalizations = languageDefault.localizations;\n\t\t}\n\t}\n\n\tconst localization = localizations.find(lzn => lzn.runtimeCode === runtimeCode);\n\tif (!!localization) {\n\t\treturn localization.vocabTokens\n\t\t\t.map(ti => TOKENS[ti])\n\t\t\t.reduce((x, y, i, a) => `${x}${y}` + (i === a.length - 1 ? '' : ' '), '');\n\t} else {\n\t\treturn '?';\n\t}\n}\n";
    const tsSource = `${autoGenComment}\n${defaultPropConstDef}\n${tokensSource}\nconst MESSAGE_STRINGS: ${arrayTypeDef} = ${setsSource}\n\n${localizeMessageFnDef}`;

    fs.writeFileSync('src/messages/asm-message-strings.ts', tsSource);
}

// function generateFile() {
//     const importText = 'import { AsmMessageClassification } from \'./asm-message-classification\'\n'
//         + 'import { AsmMessageTemplate } from \'./asm-message-template\'\n';
//     return `${importText}\nexport class ASM_MESSAGES {\n${generateAll()}\n}`;
// }

const tokens = [];
generateTsSourceFile(mapLocalizations(tokens, parseMessages()), tokens);
// console.log(JSON.stringify(mapLocalizations(parseMessages()), null, 2));
// fs.writeFileSync('src/messages/asm-message-strings.ts', generateFile());