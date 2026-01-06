import { Global, Module } from '@nestjs/common';
import { S3Service } from './services/s3.service';
import { WhatsAppService } from './services/whatsapp.service';

@Global()
@Module({
  providers: [S3Service, WhatsAppService],
  exports: [S3Service, WhatsAppService],
})
export class CommonModule {}
