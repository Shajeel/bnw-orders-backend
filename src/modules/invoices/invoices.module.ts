import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { BankOrder, BankOrderSchema } from '@modules/bank-orders/schemas/bank-order.schema';
import { Bip, BipSchema } from '@modules/bip/schemas/bip.schema';
import { PurchaseOrder, PurchaseOrderSchema } from '@modules/purchase-orders/schemas/purchase-order.schema';
import { Bank, BankSchema } from '@modules/banks/schemas/bank.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BankOrder.name, schema: BankOrderSchema },
      { name: Bip.name, schema: BipSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Bank.name, schema: BankSchema },
    ]),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
