"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoService = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
let CryptoService = class CryptoService {
    constructor() {
        this.ALGORITHM = 'aes-256-cbc';
        const keyHex = process.env.AES_KEY;
        if (!keyHex || keyHex.length !== 64) {
            throw new Error('AES_KEY must be 64 hex chars (32 bytes) in .env');
        }
        this.KEY = Buffer.from(keyHex, 'hex');
    }
    encrypt(plaintext) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.ALGORITHM, this.KEY, iv);
        const encrypted = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final(),
        ]);
        const ivHex = iv.toString('hex');
        return {
            iv: ivHex,
            encrypted: ivHex + ':' + encrypted.toString('hex'),
        };
    }
    decrypt(payload) {
        const [ivHex, cipherHex] = payload.split(':');
        if (!ivHex || !cipherHex)
            throw new Error('Invalid encrypted payload');
        const decipher = crypto.createDecipheriv(this.ALGORITHM, this.KEY, Buffer.from(ivHex, 'hex'));
        return Buffer.concat([
            decipher.update(Buffer.from(cipherHex, 'hex')),
            decipher.final(),
        ]).toString('utf8');
    }
    getKeyVersion() {
        return process.env.AES_KEY_VERSION ?? 'v1';
    }
};
exports.CryptoService = CryptoService;
exports.CryptoService = CryptoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CryptoService);
//# sourceMappingURL=crypto.service.js.map