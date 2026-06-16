"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualCardModule = void 0;
const common_1 = require("@nestjs/common");
const virtual_card_controller_1 = require("./virtual-card.controller");
const virtual_card_service_1 = require("./virtual-card.service");
const crypto_service_1 = require("./crypto.service");
const card_file_parser_service_1 = require("./card-file-parser.service");
const sftp_service_1 = require("./sftp.service");
let VirtualCardModule = class VirtualCardModule {
};
exports.VirtualCardModule = VirtualCardModule;
exports.VirtualCardModule = VirtualCardModule = __decorate([
    (0, common_1.Module)({
        controllers: [virtual_card_controller_1.VirtualCardController],
        providers: [
            virtual_card_service_1.VirtualCardService,
            crypto_service_1.CryptoService,
            card_file_parser_service_1.CardFileParserService,
            sftp_service_1.SftpService,
        ],
        exports: [virtual_card_service_1.VirtualCardService],
    })
], VirtualCardModule);
//# sourceMappingURL=virtual-card.module.js.map