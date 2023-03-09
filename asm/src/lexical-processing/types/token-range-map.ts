import { Token } from '../../parsing/stages/stage-1/token';
import { WorkingLexeme } from './working-lexeme';

export interface TokenRangeMap {
    (tokenIndices: Array<number>): Array<string>;
}

export class TokenRangeMap implements TokenRangeMap {
    public static build(allTokens: Array<Token>, workingLexemes: Array<WorkingLexeme>): TokenRangeMap {
        return (tokenIndices) => {
            const dfs= tokenIndices.map(ti => {
                const token = allTokens.filter(t => t.index === ti).max((v) => v.startPosition);
                if (!!token) {
                    return {
                        start: token.startPosition,
                        end: token.endPosition
                    }
                } else {
                    return null;
                }
            })
            .filter(x => !!x)
            .map(x => workingLexemes
                .filter(lx => lx.startPosition >= x.start && lx.endPosition <= x.end)
                .map(lx => lx.id))
            .reduce((x, y) => x.concat(y), [])
            .distinct()
            return dfs.filter(s => !!s);
        };
    }

    private constructor() {
    }
}

// const x: TokenRangeMap = {} as any;
// x()