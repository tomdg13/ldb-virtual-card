import { Module } from '@nestjs/common';
import { VirtualCardController } from './virtual-card.controller';
import { VirtualCardService }    from './virtual-card.service';
import { CryptoService }         from './crypto.service';
import { CardFileParserService } from './card-file-parser.service';
import { SftpService }           from './sftp.service';

@Module({
  controllers: [VirtualCardController],
  providers: [
    VirtualCardService,
    CryptoService,
    CardFileParserService,
    SftpService,
  ],
  exports: [VirtualCardService],
})
export class VirtualCardModule {}
