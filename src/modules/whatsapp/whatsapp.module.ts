import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [WhatsAppController],
})
export class WhatsAppModule {}
