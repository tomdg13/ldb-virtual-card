import { Request } from 'express';
import { VirtualCardService } from './virtual-card.service';
import { SftpService } from './sftp.service';
import { IssueCardDto } from './dto/issue-card.dto';
import { CardFileParserService } from './card-file-parser.service';
export declare class VirtualCardController {
    private readonly vcService;
    private readonly sftpService;
    private readonly parserService;
    constructor(vcService: VirtualCardService, sftpService: SftpService, parserService: CardFileParserService);
    issueFromFile(file: Express.Multer.File, dto: IssueCardDto, req: Request): Promise<{
        success: boolean;
        total: number;
        cards: import("./virtual-card.service").IssueCardResult[];
    }>;
    issueRaw(body: {
        fileContent: string;
    } & IssueCardDto, req: Request): Promise<{
        success: boolean;
        total: number;
        cards: import("./virtual-card.service").IssueCardResult[];
    }>;
    listCards(customerId?: string): Promise<any>;
    searchByPan(pan: string, req: Request): Promise<any[]>;
    decryptByPan(pan: string, req: Request): Promise<any[] | {
        cardId: any;
        pan: string;
        panMasked: string;
        expire: string;
        cvv: string;
        cardStatus: any;
        productCode: any;
        cardScheme: any;
    }>;
    activateCard(cardId: number, req: Request): Promise<{
        success: boolean;
        message: string;
    }>;
    sftpTest(body: {
        host: string;
        port: number;
        username: string;
        password: string;
        basePath: string;
    }): Promise<{
        success: boolean;
        connected: boolean;
        folders: string[];
    }>;
    sftpFolders(body: {
        host: string;
        port: number;
        username: string;
        password: string;
        basePath: string;
    }): Promise<{
        success: boolean;
        folders: string[];
    }>;
    sftpFiles(body: {
        host: string;
        port: number;
        username: string;
        password: string;
        basePath: string;
        dateFolder: string;
    }): Promise<{
        success: boolean;
        files: string[];
    }>;
    sftpImport(body: {
        host: string;
        port: number;
        username: string;
        password: string;
        basePath: string;
        dateFolder: string;
        fileName: string;
    }, req: Request): Promise<{
        success: boolean;
        total: number;
        cards: import("./virtual-card.service").IssueCardResult[];
        fileName: string;
    }>;
    sftpPreview(body: {
        host: string;
        port: number;
        username: string;
        password: string;
        basePath: string;
        dateFolder: string;
        fileName: string;
    }): Promise<{
        success: boolean;
        total: number;
        cards: {
            cmsRef: string;
            cifNo: string;
            pan: string;
            panMasked: string;
            expire: string;
            cvv: string;
            holderName: string;
            productCode: string;
        }[];
    }>;
}
