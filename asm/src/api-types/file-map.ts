export type FileMap = Array<{ readonly referenceName: string, readonly fileContent: string }>;

export function normalizeFileMap(fileMap: FileMap): FileMap {
    return fileMap.map(fm => {
        return {
            referenceName: fm.referenceName,
            fileContent: fm.fileContent.replace(/\r\n/g, '\n')
        }
    })
}