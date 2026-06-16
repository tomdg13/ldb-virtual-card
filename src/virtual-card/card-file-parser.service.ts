import { Injectable, BadRequestException } from '@nestjs/common';

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

@Injectable()
export class CardFileParserService {
  private readonly PRODUCT_CODE = '08 Virtual Card UPI';

  parseFile(fileContent: string): ParsedCard[] {
    // Split ທັງ \n ແລະ #END# — ຮອງຮັບທຸກ format
    const lines = fileContent
      .split(/\n|(?<=#END#)/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l.includes('#END#'));

    if (lines.length === 0) throw new BadRequestException('No valid card lines found');
    return lines.map((line, idx) => this.parseLine(line, idx));
  }

  private parseLine(line: string, idx: number): ParsedCard {
    const cmsRefMatch = line.match(/^(\d+)\$/);
    if (!cmsRefMatch) throw new BadRequestException(`Line ${idx + 1}: missing CMS ref`);
    const cmsRef = cmsRefMatch[1];

    const panMatch = line.match(/;(\d{16})=/);
    if (!panMatch) throw new BadRequestException(`Line ${idx + 1}: cannot parse PAN`);
    const pan = panMatch[1];

    const expireMatch = line.match(/(\d{2}\/\d{2})!/);
    if (!expireMatch) throw new BadRequestException(`Line ${idx + 1}: cannot parse expire`);
    const expire = expireMatch[1];

    const cvvMatch = line.match(/!(\d{3})\*/);
    if (!cvvMatch) throw new BadRequestException(`Line ${idx + 1}: cannot parse CVV`);
    const cvv = cvvMatch[1];

    const nameMatch = line.match(/\*([A-Z][A-Z ]+?)(?:"|%B|\^|\s{2,}|$)/);
    if (!nameMatch) throw new BadRequestException(`Line ${idx + 1}: cannot parse name`);
    const holderName = nameMatch[1].trim();

    const [mm, yy] = expire.split('/').map(Number);
    const expiryDate = new Date(2000 + yy, mm, 0);

    return {
      pan,
      panLast4:    pan.slice(-4),
      panBin:      pan.slice(0, 8),
      expire,
      cvv,
      holderName,
      cifNo:       `LDB-${cmsRef}`,
      productCode: this.PRODUCT_CODE,
      cmsRef,
      expiryDate,
    };
  }
}
