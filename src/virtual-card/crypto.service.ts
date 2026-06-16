import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly ALGORITHM = 'aes-256-cbc';
  private readonly KEY: Buffer;

  constructor() {
    const keyHex = process.env.AES_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('AES_KEY must be 64 hex chars (32 bytes) in .env');
    }
    this.KEY = Buffer.from(keyHex, 'hex');
  }

  encrypt(plaintext: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.KEY, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const ivHex = iv.toString('hex');
    return {
      iv:        ivHex,
      encrypted: ivHex + ':' + encrypted.toString('hex'),
    };
  }

  decrypt(payload: string): string {
    const [ivHex, cipherHex] = payload.split(':');
    if (!ivHex || !cipherHex) throw new Error('Invalid encrypted payload');
    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      this.KEY,
      Buffer.from(ivHex, 'hex'),
    );
    return Buffer.concat([
      decipher.update(Buffer.from(cipherHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }

  getKeyVersion(): string {
    return process.env.AES_KEY_VERSION ?? 'v1';
  }
}
