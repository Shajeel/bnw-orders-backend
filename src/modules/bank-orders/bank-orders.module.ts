import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BankOrdersService } from './bank-orders.service';
import { BankOrdersController } from './bank-orders.controller';
import { BankOrder, BankOrderSchema } from './schemas/bank-order.schema';
import { ProductsModule } from '@modules/products/products.module';
import { BanksModule } from '@modules/banks/banks.module';
import { PurchaseOrder, PurchaseOrderSchema } from '@modules/purchase-orders/schemas/purchase-order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BankOrder.name, schema: BankOrderSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
    ]),
    ProductsModule,
    BanksModule,
  ],
  controllers: [BankOrdersController],
  providers: [BankOrdersService],
  exports: [BankOrdersService],
})
export class BankOrdersModule {}
