import {
  Controller, Post, Get, Patch, Delete,
  Param, Body, UploadedFile,
  UseInterceptors, Req, ParseIntPipe, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { VirtualCardService } from './virtual-card.service';
import { SftpService } from './sftp.service';
import { IssueCardDto } from './dto/issue-card.dto';
import { CardFileParserService } from './card-file-parser.service';

@Controller('virtual-cards')
export class VirtualCardController {
  constructor(
    private readonly vcService: VirtualCardService,
    private readonly sftpService: SftpService,
    private readonly parserService: CardFileParserService,
  ) {}

  @Post('issue-file')
  @UseInterceptors(FileInterceptor('file'))
  async issueFromFile(@UploadedFile() file: Express.Multer.File, @Body() dto: IssueCardDto, @Req() req: Request) {
    const actor = (req as any).user?.username ?? 'API_USER';
    const ipAddress = req.ip ?? 'unknown';
    const content = file.buffer.toString('utf8');
    const results = await this.vcService.issueFromFile(content, dto, actor, ipAddress);
    return { success: true, total: results.length, cards: results };
  }

  @Post('issue-raw')
  async issueRaw(@Body() body: { fileContent: string } & IssueCardDto, @Req() req: Request) {
    const actor = (req as any).user?.username ?? 'API_USER';
    const ipAddress = req.ip ?? 'unknown';
    const { fileContent, ...dto } = body;
    const results = await this.vcService.issueFromFile(fileContent, dto as IssueCardDto, actor, ipAddress);
    return { success: true, total: results.length, cards: results };
  }

  @Get()
  async listCards(@Query('customerId') customerId?: string) {
    const cid = customerId ? parseInt(customerId) : undefined;
    return this.vcService.listCards(cid);
  }

  @Get('search')
  async searchByPan(@Query('pan') pan: string, @Req() req: Request) {
    const actor = (req as any).user?.username ?? 'API_USER';
    const ipAddress = req.ip ?? 'unknown';
    return this.vcService.searchAndDecryptByPan(pan, actor, ipAddress);
  }

  @Get(':pan/decrypt')
  async decryptByPan(@Param('pan') pan: string, @Req() req: Request) {
    const actor = (req as any).user?.username ?? 'API_USER';
    const ipAddress = req.ip ?? 'unknown';
    if (pan.length === 16) {
      return this.vcService.searchAndDecryptByPan(pan, actor, ipAddress);
    }
    return this.vcService.getDecryptedCard(parseInt(pan), actor, ipAddress);
  }

  @Patch(':id/activate')
  async activateCard(@Param('id', ParseIntPipe) cardId: number, @Req() req: Request) {
    const actor = (req as any).user?.username ?? 'API_USER';
    const ipAddress = req.ip ?? 'unknown';
    await this.vcService.activateCard(cardId, actor, ipAddress);
    return { success: true, message: `Card ${cardId} activated` };
  }

  // ── SFTP Endpoints ────────────────────────────

  @Post('sftp/test')
  async sftpTest(@Body() body: { host: string; port: number; username: string; password: string; basePath: string }) {
    const folders = await this.sftpService.listFolders(body);
    return { success: true, connected: true, folders: folders.slice(0, 5) };
  }

  @Post('sftp/folders')
  async sftpFolders(@Body() body: { host: string; port: number; username: string; password: string; basePath: string }) {
    const folders = await this.sftpService.listFolders(body);
    return { success: true, folders };
  }

  @Post('sftp/files')
  async sftpFiles(@Body() body: { host: string; port: number; username: string; password: string; basePath: string; dateFolder: string }) {
    const { dateFolder, ...config } = body;
    const files = await this.sftpService.listFiles(config, dateFolder);
    return { success: true, files };
  }

  @Post('sftp/import')
  async sftpImport(
    @Body() body: { host: string; port: number; username: string; password: string; basePath: string; dateFolder: string; fileName: string },
    @Req() req: Request,
  ) {
    const { dateFolder, fileName, ...config } = body;
    const actor     = (req as any).user?.username ?? 'API_USER';
    const ipAddress = req.ip ?? 'unknown';
    const content   = await this.sftpService.downloadFile(config, dateFolder, fileName);
    const dto       = { cifNo: 'SFTP-AUTO', fullName: 'AUTO', productCode: '08 Virtual Card UPI' } as any;
    const results   = await this.vcService.issueFromFile(content, dto, actor, ipAddress);
    return { success: true, total: results.length, cards: results, fileName };
  }

  // POST /virtual-cards/sftp/preview
  // Download + parse only (no encrypt, no insert)
  @Post('sftp/preview')
  async sftpPreview(
    @Body() body: { host: string; port: number; username: string; password: string; basePath: string; dateFolder: string; fileName: string },
  ) {
    const { dateFolder, fileName, ...config } = body;
    const content = await this.sftpService.downloadFile(config, dateFolder, fileName);
    // Parse only — no encrypt
    const cards = this.parserService.parseFile(content).map((c) => ({
      cmsRef:      c.cmsRef,
      cifNo:       c.cifNo,
      pan:         c.pan,
      panMasked:   c.pan.slice(0,6) + 'x'.repeat(c.pan.length-10) + c.pan.slice(-4),
      expire:      c.expire,
      cvv:         c.cvv,
      holderName:  c.holderName,
      productCode: c.productCode,
    }));
    return { success: true, total: cards.length, cards };
  }
}
