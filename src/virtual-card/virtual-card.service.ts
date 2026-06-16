import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
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

@Injectable()
export class VirtualCardService {
  private readonly logger = new Logger(VirtualCardService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly crypto: CryptoService,
    private readonly parser: CardFileParserService,
  ) {}

  async issueFromFile(fileContent: string, dto: IssueCardDto, actor: string, ipAddress: string): Promise<IssueCardResult[]> {
    const cards   = this.parser.parseFile(fileContent);
    const cmsRefs = cards.map((c) => c.cmsRef);
    const existing = await this.findExistingCmsRefs(cmsRefs);
    if (existing.length > 0) {
      await this.deleteByCmsRefs(existing);
      this.logger.log(`Deleted ${existing.length} existing cards before re-import`);
    }
    const results: IssueCardResult[] = [];
    for (const card of cards) {
      const result = await this.issueOneCard(card, dto, actor, ipAddress);
      results.push(result);
    }
    return results;
  }

  private async findExistingCmsRefs(cmsRefs: string[]): Promise<string[]> {
    if (cmsRefs.length === 0) return [];
    const placeholders = cmsRefs.map((_, i) => `:${i + 1}`).join(',');
    const rows = await this.dataSource.query(
      `SELECT CMS_CARD_REF FROM VC_CARD WHERE CMS_CARD_REF IN (${placeholders})`,
      cmsRefs,
    );
    return rows.map((r: any) => r.CMS_CARD_REF);
  }

  private async deleteByCmsRefs(cmsRefs: string[]): Promise<void> {
    const placeholders = cmsRefs.map((_, i) => `:${i + 1}`).join(',');
    await this.dataSource.query(
      `DELETE FROM VC_AUDIT_LOG WHERE CARD_ID IN (SELECT CARD_ID FROM VC_CARD WHERE CMS_CARD_REF IN (${placeholders}))`,
      cmsRefs,
    );
    await this.dataSource.query(
      `DELETE FROM VC_CARD WHERE CMS_CARD_REF IN (${placeholders})`,
      cmsRefs,
    );
  }

  async issueOneCard(card: ParsedCard, dto: IssueCardDto, actor: string, ipAddress: string): Promise<IssueCardResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const panEnc     = this.crypto.encrypt(card.pan);
      const expireEnc  = this.crypto.encrypt(card.expire);
      const cvvEnc     = this.crypto.encrypt(card.cvv);
      const keyVersion = this.crypto.getKeyVersion();
      this.logger.log(`Encrypting **** ${card.panLast4} [${keyVersion}]`);

      let customerId = await this.findCustomerByCif(card.cifNo, queryRunner);
      if (!customerId) {
        customerId = await this.insertCustomer(
          { cifNo: card.cifNo, fullName: card.holderName, productCode: card.productCode },
          queryRunner,
        );
      }

      const cardId = await this.insertCard({
        customerId,
        panEncrypted:    panEnc.encrypted,
        expireEncrypted: expireEnc.encrypted,
        cvvEncrypted:    cvvEnc.encrypted,
        aesIv:           panEnc.iv,
        keyVersion,
        panLast4:        card.panLast4,
        panBin:          card.panBin,
        cardScheme:      dto.cardScheme ?? 'UNIONPAY',
        productCode:     card.productCode,
        cmsCardRef:      card.cmsRef,
        expiryDate:      card.expiryDate,
      }, queryRunner);

      await this.insertAuditLog({ cardId, customerId, action: 'ENCRYPT_ISSUE', actor, ipAddress, status: 'SUCCESS' }, queryRunner);
      await queryRunner.commitTransaction();
      this.logger.log(`Card issued ID=${cardId} **** ${card.panLast4}`);

      return {
        cardId,
        panMasked:   `**** **** **** ${card.panLast4}`,
        expire:      card.expire,
        productCode: card.productCode,
        cardStatus:  'INACTIVE',
        cmsRef:      card.cmsRef,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;
      await queryRunner.rollbackTransaction();
      await this.insertAuditLogDirect({ cardId: null, customerId: null, action: 'ENCRYPT_ISSUE', actor, ipAddress, status: 'FAILED', errorMsg: errorMessage.slice(0, 500) });
      this.logger.error(`Card issue failed: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException(`Card issue failed: ${errorMessage}`);
    } finally {
      await queryRunner.release();
    }
  }

  async activateCard(cardId: number, actor: string, ipAddress: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `UPDATE VC_CARD SET CARD_STATUS='ACTIVE', ACTIVATED_DATE=SYSDATE WHERE CARD_ID=:1 AND CARD_STATUS='INACTIVE'`,
        [cardId],
      );
      await this.insertAuditLog({ cardId, customerId: null, action: 'ACTIVATE', actor, ipAddress, status: 'SUCCESS' }, queryRunner);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getDecryptedCard(cardId: number, actor: string, ipAddress: string) {
    const rows = await this.dataSource.query(
      `SELECT CARD_ID, PAN_ENCRYPTED, EXPIRE_ENCRYPTED, CVV_ENCRYPTED,
              PAN_LAST4, CARD_STATUS, PRODUCT_CODE, CARD_SCHEME
       FROM VC_CARD WHERE CARD_ID=:1`,
      [cardId],
    );
    if (!rows?.length) throw new NotFoundException(`Card ${cardId} not found`);
    const row    = rows[0];
    const pan    = this.crypto.decrypt(row.PAN_ENCRYPTED);
    const expire = this.crypto.decrypt(row.EXPIRE_ENCRYPTED);
    const cvv    = this.crypto.decrypt(row.CVV_ENCRYPTED);
    await this.insertAuditLogDirect({ cardId, customerId: null, action: 'DECRYPT_VIEW', actor, ipAddress, status: 'SUCCESS' });
    return {
      cardId:      row.CARD_ID,
      pan,
      panMasked:   pan.slice(0,6) + 'x'.repeat(pan.length-10) + pan.slice(-4),
      expire,
      cvv,
      cardStatus:  row.CARD_STATUS,
      productCode: row.PRODUCT_CODE,
      cardScheme:  row.CARD_SCHEME,
    };
  }

  async searchAndDecryptByPan(pan: string, actor: string, ipAddress: string) {
    if (!pan || pan.length < 4) throw new BadRequestException('pan ຕ້ອງມີຢ່າງໜ້ອຍ 4 ຕົວ');
    const last4 = pan.slice(-4);
    const rows  = await this.dataSource.query(
      `SELECT CARD_ID, PAN_ENCRYPTED, EXPIRE_ENCRYPTED, CVV_ENCRYPTED,
              PAN_LAST4, CARD_STATUS, PRODUCT_CODE, CARD_SCHEME, CMS_CARD_REF
       FROM VC_CARD WHERE PAN_LAST4=:1`,
      [last4],
    );
    if (!rows?.length) throw new NotFoundException(`ບໍ່ພົບ card`);

    const results = [];
    for (const row of rows) {
      const decryptedPan = this.crypto.decrypt(row.PAN_ENCRYPTED);
      if (pan.length === 16 && decryptedPan !== pan) continue;
      const expire = this.crypto.decrypt(row.EXPIRE_ENCRYPTED);
      const cvv    = this.crypto.decrypt(row.CVV_ENCRYPTED);
      await this.insertAuditLogDirect({ cardId: row.CARD_ID, customerId: null, action: 'DECRYPT_VIEW', actor, ipAddress, status: 'SUCCESS' });
      results.push({
        cardId:      row.CARD_ID,
        pan:         decryptedPan,
        panMasked:   decryptedPan.slice(0,6) + 'x'.repeat(decryptedPan.length-10) + decryptedPan.slice(-4),
        expire,
        cvv,
        cardStatus:  row.CARD_STATUS,
        productCode: row.PRODUCT_CODE,
        cardScheme:  row.CARD_SCHEME,
        cmsRef:      row.CMS_CARD_REF,
      });
    }
    if (!results.length) throw new NotFoundException(`ບໍ່ພົບ card PAN: ${pan}`);
    return results;
  }

  async listCards(customerId?: number) {
    const where = customerId ? `WHERE CUSTOMER_ID=${customerId}` : '';
    return this.dataSource.query(
      `SELECT CARD_ID, FULL_NAME, CIF_NO, PAN_MASKED, PAN_LAST4,
              CARD_SCHEME, PRODUCT_CODE, CARD_STATUS, ISSUED_DATE, EXPIRY_DATE
       FROM VC_CARD_SAFE ${where} ORDER BY CREATED_AT DESC`,
    );
  }

  private async findCustomerByCif(cifNo: string, qr: any) {
    const rows = await qr.query(`SELECT CUSTOMER_ID FROM VC_CUSTOMER WHERE CIF_NO=:1`, [cifNo]);
    return rows?.[0]?.CUSTOMER_ID ?? null;
  }

  private async insertCustomer(dto: any, qr: any) {
    await qr.query(
      `INSERT INTO VC_CUSTOMER (CIF_NO, FULL_NAME, PHONE_NO, KYC_STATUS) VALUES (:1,:2,:3,'VERIFIED')`,
      [dto.cifNo, dto.fullName, dto.phoneNo ?? null],
    );
    const rows = await qr.query(`SELECT CUSTOMER_ID FROM VC_CUSTOMER WHERE CIF_NO=:1`, [dto.cifNo]);
    return rows[0].CUSTOMER_ID;
  }

  private async insertCard(p: any, qr: any) {
    await qr.query(
      `INSERT INTO VC_CARD (CUSTOMER_ID,PAN_ENCRYPTED,EXPIRE_ENCRYPTED,CVV_ENCRYPTED,AES_IV,KEY_VERSION,PAN_LAST4,PAN_BIN,CARD_SCHEME,PRODUCT_CODE,CARD_STATUS,CMS_CARD_REF,ISSUED_DATE,EXPIRY_DATE)
       VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,'INACTIVE',:11,SYSDATE,:12)`,
      [p.customerId,p.panEncrypted,p.expireEncrypted,p.cvvEncrypted,p.aesIv,p.keyVersion,p.panLast4,p.panBin,p.cardScheme,p.productCode,p.cmsCardRef,p.expiryDate],
    );
    const rows = await qr.query(`SELECT CARD_ID FROM VC_CARD WHERE CMS_CARD_REF=:1`, [p.cmsCardRef]);
    return rows[0].CARD_ID;
  }

  private async insertAuditLog(p: any, qr: any) {
    await qr.query(
      `INSERT INTO VC_AUDIT_LOG (CARD_ID,CUSTOMER_ID,ACTION,ACTOR,IP_ADDRESS,STATUS,ERROR_MSG) VALUES (:1,:2,:3,:4,:5,:6,:7)`,
      [p.cardId??null,p.customerId??null,p.action,p.actor,p.ipAddress,p.status,p.errorMsg??null],
    );
  }

  private async insertAuditLogDirect(p: any) {
    await this.dataSource.query(
      `INSERT INTO VC_AUDIT_LOG (CARD_ID,CUSTOMER_ID,ACTION,ACTOR,IP_ADDRESS,STATUS,ERROR_MSG) VALUES (:1,:2,:3,:4,:5,:6,:7)`,
      [p.cardId??null,p.customerId??null,p.action,p.actor,p.ipAddress,p.status,p.errorMsg??null],
    );
  }
}
