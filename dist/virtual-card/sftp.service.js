"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SftpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SftpService = void 0;
const common_1 = require("@nestjs/common");
const ssh2 = require("ssh2");
let SftpService = SftpService_1 = class SftpService {
    constructor() {
        this.logger = new common_1.Logger(SftpService_1.name);
    }
    async listFolders(config) {
        return this.withSftp(config, (sftp) => new Promise((resolve, reject) => {
            sftp.readdir(config.basePath, (err, list) => {
                if (err)
                    return reject(err);
                const folders = list
                    .filter((f) => f.attrs.isDirectory() && /^\d{8}$/.test(f.filename))
                    .map((f) => f.filename)
                    .sort()
                    .reverse();
                resolve(folders);
            });
        }));
    }
    async listFiles(config, dateFolder) {
        let path;
        if (config.basePath.match(/\d{8}/)) {
            path = config.basePath.replace(/\/$/, '') + '/emboss';
        }
        else {
            path = `${config.basePath}/${dateFolder}/emboss`;
        }
        this.logger.log(`Listing files: ${path}`);
        return this.withSftp(config, (sftp) => new Promise((resolve, reject) => {
            sftp.readdir(path, (err, list) => {
                if (err)
                    return reject(err);
                const files = list
                    .filter((f) => !f.attrs.isDirectory() && !f.filename.endsWith('.pdf') && !f.filename.endsWith('.csv'))
                    .map((f) => f.filename)
                    .sort()
                    .reverse();
                resolve(files);
            });
        }));
    }
    async downloadFile(config, dateFolder, fileName) {
        let filePath;
        if (config.basePath.match(/\d{8}/)) {
            filePath = config.basePath.replace(/\/$/, '') + `/emboss/${fileName}`;
        }
        else {
            filePath = `${config.basePath}/${dateFolder}/emboss/${fileName}`;
        }
        this.logger.log(`Downloading: ${filePath}`);
        return this.withSftp(config, (sftp) => new Promise((resolve, reject) => {
            const chunks = [];
            const stream = sftp.createReadStream(filePath);
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            stream.on('error', reject);
        }));
    }
    async testConnection(config) {
        return this.withSftp(config, (sftp) => new Promise((resolve, reject) => {
            const path = config.basePath.replace(/\/$/, '');
            sftp.readdir(path, (err, list) => {
                if (err)
                    return reject(err);
                resolve(list.map((f) => f.filename).slice(0, 5));
            });
        }));
    }
    withSftp(config, fn) {
        return new Promise((resolve, reject) => {
            const conn = new ssh2.Client();
            conn.on('ready', () => {
                conn.sftp((err, sftp) => {
                    if (err) {
                        conn.end();
                        return reject(err);
                    }
                    fn(sftp)
                        .then((result) => { conn.end(); resolve(result); })
                        .catch((e) => { conn.end(); reject(e); });
                });
            });
            conn.on('error', (err) => {
                this.logger.error('SFTP error: ' + err.message);
                reject(new common_1.InternalServerErrorException('SFTP: ' + err.message));
            });
            conn.connect({
                host: config.host,
                port: config.port || 22,
                username: config.username,
                password: config.password,
                readyTimeout: 10000,
                algorithms: { serverHostKey: ['ssh-rsa', 'ecdsa-sha2-nistp256', 'ssh-ed25519'] },
            });
        });
    }
};
exports.SftpService = SftpService;
exports.SftpService = SftpService = SftpService_1 = __decorate([
    (0, common_1.Injectable)()
], SftpService);
//# sourceMappingURL=sftp.service.js.map