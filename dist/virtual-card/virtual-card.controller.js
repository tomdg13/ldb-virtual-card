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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualCardController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const virtual_card_service_1 = require("./virtual-card.service");
const sftp_service_1 = require("./sftp.service");
const issue_card_dto_1 = require("./dto/issue-card.dto");
const card_file_parser_service_1 = require("./card-file-parser.service");
let VirtualCardController = class VirtualCardController {
    constructor(vcService, sftpService, parserService) {
        this.vcService = vcService;
        this.sftpService = sftpService;
        this.parserService = parserService;
    }
    async issueFromFile(file, dto, req) {
        const actor = req.user?.username ?? 'API_USER';
        const ipAddress = req.ip ?? 'unknown';
        const content = file.buffer.toString('utf8');
        const results = await this.vcService.issueFromFile(content, dto, actor, ipAddress);
        return { success: true, total: results.length, cards: results };
    }
    async issueRaw(body, req) {
        const actor = req.user?.username ?? 'API_USER';
        const ipAddress = req.ip ?? 'unknown';
        const { fileContent, ...dto } = body;
        const results = await this.vcService.issueFromFile(fileContent, dto, actor, ipAddress);
        return { success: true, total: results.length, cards: results };
    }
    async listCards(customerId) {
        const cid = customerId ? parseInt(customerId) : undefined;
        return this.vcService.listCards(cid);
    }
    async searchByPan(pan, req) {
        const actor = req.user?.username ?? 'API_USER';
        const ipAddress = req.ip ?? 'unknown';
        return this.vcService.searchAndDecryptByPan(pan, actor, ipAddress);
    }
    async decryptByPan(pan, req) {
        const actor = req.user?.username ?? 'API_USER';
        const ipAddress = req.ip ?? 'unknown';
        if (pan.length === 16) {
            return this.vcService.searchAndDecryptByPan(pan, actor, ipAddress);
        }
        return this.vcService.getDecryptedCard(parseInt(pan), actor, ipAddress);
    }
    async activateCard(cardId, req) {
        const actor = req.user?.username ?? 'API_USER';
        const ipAddress = req.ip ?? 'unknown';
        await this.vcService.activateCard(cardId, actor, ipAddress);
        return { success: true, message: `Card ${cardId} activated` };
    }
    async sftpTest(body) {
        const folders = await this.sftpService.listFolders(body);
        return { success: true, connected: true, folders: folders.slice(0, 5) };
    }
    async sftpFolders(body) {
        const folders = await this.sftpService.listFolders(body);
        return { success: true, folders };
    }
    async sftpFiles(body) {
        const { dateFolder, ...config } = body;
        const files = await this.sftpService.listFiles(config, dateFolder);
        return { success: true, files };
    }
    async sftpImport(body, req) {
        const { dateFolder, fileName, ...config } = body;
        const actor = req.user?.username ?? 'API_USER';
        const ipAddress = req.ip ?? 'unknown';
        const content = await this.sftpService.downloadFile(config, dateFolder, fileName);
        const dto = { cifNo: 'SFTP-AUTO', fullName: 'AUTO', productCode: '08 Virtual Card UPI' };
        const results = await this.vcService.issueFromFile(content, dto, actor, ipAddress);
        return { success: true, total: results.length, cards: results, fileName };
    }
    async sftpPreview(body) {
        const { dateFolder, fileName, ...config } = body;
        const content = await this.sftpService.downloadFile(config, dateFolder, fileName);
        const cards = this.parserService.parseFile(content).map((c) => ({
            cmsRef: c.cmsRef,
            cifNo: c.cifNo,
            pan: c.pan,
            panMasked: c.pan.slice(0, 6) + 'x'.repeat(c.pan.length - 10) + c.pan.slice(-4),
            expire: c.expire,
            cvv: c.cvv,
            holderName: c.holderName,
            productCode: c.productCode,
        }));
        return { success: true, total: cards.length, cards };
    }
};
exports.VirtualCardController = VirtualCardController;
__decorate([
    (0, common_1.Post)('issue-file'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, issue_card_dto_1.IssueCardDto, Object]),
    __metadata("design:returntype", Promise)
], VirtualCardController.prototype, "issueFromFile", null);
__decorate([
    (0, common_1.Post)('issue-raw'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], VirtualCardController.prototype, "issueRaw", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('customerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VirtualCardController.prototype, "listCards", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('pan')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VirtualCardController.prototype, "searchByPan", null);
__decorate([
    (0, common_1.Get)(':pan/decrypt'),
    __param(0, (0, common_1.Param)('pan')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VirtualCardController.prototype, "decryptByPan", null);
__decorate([
    (0, common_1.Patch)(':id/activate'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], VirtualCardController.prototype, "activateCard", null);
__decorate([
    (0, common_1.Post)('sftp/test'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VirtualCardController.prototype, "sftpTest", null);
__decorate([
    (0, common_1.Post)('sftp/folders'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VirtualCardController.prototype, "sftpFolders", null);
__decorate([
    (0, common_1.Post)('sftp/files'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VirtualCardController.prototype, "sftpFiles", null);
__decorate([
    (0, common_1.Post)('sftp/import'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], VirtualCardController.prototype, "sftpImport", null);
__decorate([
    (0, common_1.Post)('sftp/preview'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VirtualCardController.prototype, "sftpPreview", null);
exports.VirtualCardController = VirtualCardController = __decorate([
    (0, common_1.Controller)('virtual-cards'),
    __metadata("design:paramtypes", [virtual_card_service_1.VirtualCardService,
        sftp_service_1.SftpService,
        card_file_parser_service_1.CardFileParserService])
], VirtualCardController);
//# sourceMappingURL=virtual-card.controller.js.map