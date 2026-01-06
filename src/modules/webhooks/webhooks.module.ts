import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { BankOrdersModule } from '@modules/bank-orders/bank-orders.module';
import { BipModule } from '@modules/bip/bip.module';

@Module({
  imports: [BankOrdersModule, BipModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
