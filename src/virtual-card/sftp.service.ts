import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as ssh2 from 'ssh2';

export interface SftpConfig {
  host:     string;
  port:     number;
  username: string;
  password: string;
  basePath: string; // e.g. /cardzone/.../20260615/emboss
}

@Injectable()
export class SftpService {
  private readonly logger = new Logger(SftpService.name);

  // ── List date folders (ໃຊ້ຕອນ basePath ບໍ່ມີ date) ──
  async listFolders(config: SftpConfig): Promise<string[]> {
    return this.withSftp(config, (sftp) => new Promise((resolve, reject) => {
      sftp.readdir(config.basePath, (err, list) => {
        if (err) return reject(err);
        const folders = list
          .filter((f) => f.attrs.isDirectory() && /^\d{8}$/.test(f.filename))
          .map((f) => f.filename)
          .sort()
          .reverse();
        resolve(folders);
      });
    }));
  }

  // ── List files — ໃຊ້ path ກົງໆ ຈາກ basePath ──────
  async listFiles(config: SftpConfig, dateFolder: string): Promise<string[]> {
    // ຖ້າ basePath ມີ YYYYMMDD ແລ້ວ → ໃຊ້ path + /emboss
    // ຖ້າ basePath ບໍ່ມີ → append dateFolder/emboss
    let path: string;
    if (config.basePath.match(/\d{8}/)) {
      // basePath = /cardzone/.../20260615/ → append emboss
      path = config.basePath.replace(/\/$/, '') + '/emboss';
    } else {
      path = `${config.basePath}/${dateFolder}/emboss`;
    }
    this.logger.log(`Listing files: ${path}`);
    return this.withSftp(config, (sftp) => new Promise((resolve, reject) => {
      sftp.readdir(path, (err, list) => {
        if (err) return reject(err);
        const files = list
          .filter((f) => !f.attrs.isDirectory() && !f.filename.endsWith('.pdf') && !f.filename.endsWith('.csv'))
          .map((f) => f.filename)
          .sort()
          .reverse();
        resolve(files);
      });
    }));
  }

  // ── Download file ─────────────────────────────────
  async downloadFile(config: SftpConfig, dateFolder: string, fileName: string): Promise<string> {
    let filePath: string;
    if (config.basePath.match(/\d{8}/)) {
      filePath = config.basePath.replace(/\/$/, '') + `/emboss/${fileName}`;
    } else {
      filePath = `${config.basePath}/${dateFolder}/emboss/${fileName}`;
    }
    this.logger.log(`Downloading: ${filePath}`);
    return this.withSftp(config, (sftp) => new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = sftp.createReadStream(filePath);
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      stream.on('error', reject);
    }));
  }

  // ── Test connection + list ────────────────────────
  async testConnection(config: SftpConfig): Promise<string[]> {
    return this.withSftp(config, (sftp) => new Promise((resolve, reject) => {
      // ຖ້າ path ມີ date → list emboss
      // ຖ້າ path ບໍ່ມີ date → list date folders
      const path = config.basePath.replace(/\/$/, '');
      sftp.readdir(path, (err, list) => {
        if (err) return reject(err);
        resolve(list.map((f) => f.filename).slice(0, 5));
      });
    }));
  }

  private withSftp<T>(config: SftpConfig, fn: (sftp: ssh2.SFTPWrapper) => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const conn = new ssh2.Client();
      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) { conn.end(); return reject(err); }
          fn(sftp)
            .then((result) => { conn.end(); resolve(result); })
            .catch((e) => { conn.end(); reject(e); });
        });
      });
      conn.on('error', (err) => {
        this.logger.error('SFTP error: ' + err.message);
        reject(new InternalServerErrorException('SFTP: ' + err.message));
      });
      conn.connect({
        host:         config.host,
        port:         config.port || 22,
        username:     config.username,
        password:     config.password,
        readyTimeout: 10000,
        algorithms:   { serverHostKey: ['ssh-rsa', 'ecdsa-sha2-nistp256', 'ssh-ed25519'] },
      });
    });
  }
}
