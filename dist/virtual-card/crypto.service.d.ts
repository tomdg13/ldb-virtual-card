export declare class CryptoService {
    private readonly ALGORITHM;
    private readonly KEY;
    constructor();
    encrypt(plaintext: string): {
        encrypted: string;
        iv: string;
    };
    decrypt(payload: string): string;
    getKeyVersion(): string;
}
