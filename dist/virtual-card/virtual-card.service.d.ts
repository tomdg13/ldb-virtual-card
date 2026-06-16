import { DataSource } from 'typeorm';
import { CryptoService } from './crypto.service';
import { CardFileParserService, ParsedCard } from './card-file-parser.service';
import { IssueCardDto } from './dto/issue-card.dto';
export interface IssueCardResult {
    cardId: number;
    panMasked: string;
    expire: string;
    productCode: string;
    cardStatus: string;
    cmsRef: string;
}
export declare class VirtualCardService {
    private readonly dataSource;
    private readonly crypto;
    private readonly parser;
    private readonly logger;
    constructor(dataSource: DataSource, crypto: CryptoService, parser: CardFileParserService);
    issueFromFile(fileContent: string, dto: IssueCardDto, actor: string, ipAddress: string): Promise<IssueCardResult[]>;
    private findExistingCmsRefs;
    private deleteByCmsRefs;
    issueOneCard(card: ParsedCard, dto: IssueCardDto, actor: string, ipAddress: string): Promise<IssueCardResult>;
    activateCard(cardId: number, actor: string, ipAddress: string): Promise<void>;
    getDecryptedCard(cardId: number, actor: string, ipAddress: string): Promise<{
        cardId: any;
        pan: string;
        panMasked: string;
        expire: string;
        cvv: string;
        cardStatus: any;
        productCode: any;
        cardScheme: any;
    }>;
    searchAndDecryptByPan(pan: string, actor: string, ipAddress: string): Promise<any[]>;
    listCards(customerId?: number): Promise<any>;
    private findCustomerByCif;
    private insertCustomer;
    private insertCard;
    private insertAuditLog;
    private insertAuditLogDirect;
}
