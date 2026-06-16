export interface ParsedCard {
    pan: string;
    panLast4: string;
    panBin: string;
    expire: string;
    cvv: string;
    holderName: string;
    cifNo: string;
    productCode: string;
    cmsRef: string;
    expiryDate: Date;
}
export declare class CardFileParserService {
    private readonly PRODUCT_CODE;
    parseFile(fileContent: string): ParsedCard[];
    private parseLine;
}
