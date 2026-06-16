"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardFileParserService = void 0;
const common_1 = require("@nestjs/common");
let CardFileParserService = class CardFileParserService {
    constructor() {
        this.PRODUCT_CODE = '08 Virtual Card UPI';
    }
    parseFile(fileContent) {
        const lines = fileContent
            .split(/\n|(?<=#END#)/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0 && l.includes('#END#'));
        if (lines.length === 0)
            throw new common_1.BadRequestException('No valid card lines found');
        return lines.map((line, idx) => this.parseLine(line, idx));
    }
    parseLine(line, idx) {
        const cmsRefMatch = line.match(/^(\d+)\$/);
        if (!cmsRefMatch)
            throw new common_1.BadRequestException(`Line ${idx + 1}: missing CMS ref`);
        const cmsRef = cmsRefMatch[1];
        const panMatch = line.match(/;(\d{16})=/);
        if (!panMatch)
            throw new common_1.BadRequestException(`Line ${idx + 1}: cannot parse PAN`);
        const pan = panMatch[1];
        const expireMatch = line.match(/(\d{2}\/\d{2})!/);
        if (!expireMatch)
            throw new common_1.BadRequestException(`Line ${idx + 1}: cannot parse expire`);
        const expire = expireMatch[1];
        const cvvMatch = line.match(/!(\d{3})\*/);
        if (!cvvMatch)
            throw new common_1.BadRequestException(`Line ${idx + 1}: cannot parse CVV`);
        const cvv = cvvMatch[1];
        const nameMatch = line.match(/\*([A-Z][A-Z ]+?)(?:"|%B|\^|\s{2,}|$)/);
        if (!nameMatch)
            throw new common_1.BadRequestException(`Line ${idx + 1}: cannot parse name`);
        const holderName = nameMatch[1].trim();
        const [mm, yy] = expire.split('/').map(Number);
        const expiryDate = new Date(2000 + yy, mm, 0);
        return {
            pan,
            panLast4: pan.slice(-4),
            panBin: pan.slice(0, 8),
            expire,
            cvv,
            holderName,
            cifNo: `LDB-${cmsRef}`,
            productCode: this.PRODUCT_CODE,
            cmsRef,
            expiryDate,
        };
    }
};
exports.CardFileParserService = CardFileParserService;
exports.CardFileParserService = CardFileParserService = __decorate([
    (0, common_1.Injectable)()
], CardFileParserService);
//# sourceMappingURL=card-file-parser.service.js.map