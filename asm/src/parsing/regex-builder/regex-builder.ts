import { RegexBuilderTemplate } from './regex-builder-template';

export class RegexBuilder {
    public static build(...sections: Array<RegexBuilderTemplate | string | { custom: string }>): RegExp {
        let regexString = '';
        for (let i = 0; i < sections.length; i++) {
            const current = sections[i];
            if (RegexBuilder.isRegexBuilderTemplate(current)) {
                regexString += RegexBuilder.getTemplateRegexString(current);
            } else if (RegexBuilder.isCustomTemplate(current)) {
                regexString += current.custom;
            } else {
                regexString += `[${RegexBuilder.escapeLiteral(current)}]{1}`;
            }
        }

        return new RegExp('^' + regexString + '$');
    }

    public static customizeAnyPrintableTemplate(atLeast1: boolean, allowLinearWhitespace: boolean, ...except: Array<string>): { custom: string } {
        if (!allowLinearWhitespace) {
            if (!except.includes(' ')) {
                except.push(' ');
            }
            if (!except.includes('\\t')) {
                except.push('\\t');
            }
        }
        let charString = '';
        RegexBuilder._PRINTABLE_CHARACTERS.filter(pc => !except.includes(pc)).forEach(pc => {
            charString += RegexBuilder.escapeLiteral(pc);
        })

        let regexString = `[${charString}]`;
        if (atLeast1) {
            regexString += '+';
        } else {
            regexString += '{0,}';
        }

        return { custom: regexString };
    }
    
    private static getTemplateRegexString(template: RegexBuilderTemplate): string {
        let regexString = '';

        switch (template) {
            case RegexBuilderTemplate.AnyLinearWhitespace:
                regexString = '[ \\t]{0,}';
                break;
            case RegexBuilderTemplate.OneOrMoreLinearWhitespace:
                regexString = '[ \\t]+';
                break;
            case RegexBuilderTemplate.AnyPrintableCharacter:
                regexString = `[${RegexBuilder.ALL_PRINTABLE_CHARACTERS}]{0,}`;
                break;
            case RegexBuilderTemplate.OneOrMorePrintableCharacters:
                regexString = `[${RegexBuilder.ALL_PRINTABLE_CHARACTERS}]+`;
                break;
            case RegexBuilderTemplate.AnyBase10Numbers:
                regexString = '[0-9]{0,}';
                break;
            case RegexBuilderTemplate.OneOrMoreBase10Numbers:
                regexString = '[0-9]+';
                break;
            case RegexBuilderTemplate.AnyHexNumbers:
                regexString = '([0x][0-9a-fA-F]+){0,}';
                break;
            case RegexBuilderTemplate.OneOrMoreHexNumbers:
                regexString = '([0x][0-9a-fA-F]+)';
                break;
            case RegexBuilderTemplate.LabelFormat:
                regexString = '\\.{0,1}[_a-zA-Z][_a-zA-Z0-9]{0,}';
                break;
            case RegexBuilderTemplate.OneOrMoreAlphaCharacters:
                regexString = '[a-zA-Z]+';
                break;
        }

        return regexString;
    }

    private static isRegexBuilderTemplate(o: any): o is RegexBuilderTemplate {
        return Number.isInteger(Number(o));
    }

    private static isCustomTemplate(o: any): o is { custom: string } {
        return !!o && Object.getOwnPropertyNames(o).includes('custom');
    }

    private static escapeLiteral(literal: string): string {
        let escapedLiteral = '';
        for (let i = 0; i < literal.length; i++) {
            const ch = literal.charAt(i);
            const requiredEscape = RegexBuilder._REQUIRED_ESCAPES.find(x => x.input === ch);
            if (!!requiredEscape) {
                escapedLiteral += requiredEscape.escapedValue;
            } else {
                escapedLiteral += ch;
            }
        }
        return escapedLiteral;
    }

    private static get ALL_PRINTABLE_CHARACTERS(): string {
        let charString = '';
        RegexBuilder._PRINTABLE_CHARACTERS.forEach(pc => {
            charString += RegexBuilder.escapeLiteral(pc);
        })
        return charString;
    }

    private static readonly _REQUIRED_ESCAPES = [
        {
            input: '[',
            escapedValue: '\\['
        },
        {
            input: ']',
            escapedValue: '\\]'
        },
        {
            input: '(',
            escapedValue: '\\('
        },
        {
            input: ')',
            escapedValue: '\\)'
        },
        {
            input: '{',
            escapedValue: '\\{'
        },
        {
            input: '}',
            escapedValue: '\\}'
        },
        {
            input: '+',
            escapedValue: '\\+'
        },
        {
            input: '.',
            escapedValue: '\\.'
        }
    ]

    private static readonly _PRINTABLE_CHARACTERS = [
        '-',
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
        'A',
        'B',
        'C',
        'D',
        'E',
        'F',
        'G',
        'H',
        'I',
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
        'S',
        'T',
        'U',
        'V',
        'W',
        'X',
        'Y',
        'Z',
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '~',
        '!',
        '@',
        '#',
        '$',
        '%',
        '^',
        '&',
        '*',
        '(',
        ')',
        '_',
        '+',
        '`',
        '=',
        '|',
        // '\\',
        ';',
        ':',
        '"',
        '\'',
        '/',
        '.',
        ',',
        '<',
        '>',
        '?',
        '{',
        '}',
        '[',
        ']',
        ' ',
        '\\t'
    ];
}