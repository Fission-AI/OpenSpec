export declare class FileSystemUtils {
    private static isWindowsBasePath;
    private static normalizeSegments;
    static joinPath(basePath: string, ...segments: string[]): string;
    static createDirectory(dirPath: string): Promise<void>;
    static fileExists(filePath: string): Promise<boolean>;
    static canWriteFile(filePath: string): Promise<boolean>;
    static directoryExists(dirPath: string): Promise<boolean>;
    static writeFile(filePath: string, content: string): Promise<void>;
    static readFile(filePath: string): Promise<string>;
    static updateFileWithMarkers(filePath: string, content: string, startMarker: string, endMarker: string): Promise<void>;
    static ensureWritePermissions(dirPath: string): Promise<boolean>;
}
//# sourceMappingURL=file-system.d.ts.map