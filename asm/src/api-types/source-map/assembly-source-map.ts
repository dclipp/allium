import { QuadByte } from '@allium/types';
import { SourceLine } from './source-line';
import { SourceEntity } from './source-entity';
import { ExtendedAsmMessage } from '../../messages/extended-asm-message';

export interface AssemblySourceMap {
    readonly LINES: ReadonlyArray<SourceLine>;
    readonly HAS_ERRORS: boolean;
    readonly MESSAGES: ReadonlyArray<ExtendedAsmMessage>;

    getLineByAddress(address: QuadByte): SourceLine;

    findReferencesToEntity(id: string): Array<SourceEntity>;
    findEntitiesReferencedBy(id: string): Array<SourceEntity>;

    getGroupMembers(groupId: string): Array<SourceEntity>;

    // getScopeProvider(id: string): SourceEntity | 'global';

    getAddressForLine(objectName: string, lineIndex: number): QuadByte | 'not-an-instruction';

    findEntityById(id: string): SourceEntity | 'not-found';

    toFileContent(): string;
}