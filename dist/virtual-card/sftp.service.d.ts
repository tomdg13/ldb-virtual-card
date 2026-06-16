export interface SftpConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    basePath: string;
}
export declare class SftpService {
    private readonly logger;
    listFolders(config: SftpConfig): Promise<string[]>;
    listFiles(config: SftpConfig, dateFolder: string): Promise<string[]>;
    downloadFile(config: SftpConfig, dateFolder: string, fileName: string): Promise<string>;
    testConnection(config: SftpConfig): Promise<string[]>;
    private withSftp;
}
