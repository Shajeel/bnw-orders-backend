import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { BankOrder } from '@modules/bank-orders/schemas/bank-order.schema';
import { Bip } from '@modules/bip/schemas/bip.schema';

/**
 * Migration script to backfill statusHistory for existing orders
 *
 * This script adds a statusHistory entry with the current status and creation timestamp
 * for orders that don't have statusHistory yet.
 *
 * Usage: npx ts-node src/scripts/backfill-status-history.ts
 */
async function backfillStatusHistory() {
  console.log('Starting status history backfill migration...');

  const app = await NestFactory.createApplicationContext(AppModule);

  const bankOrderModel = app.get<Model<BankOrder>>(
    getModelToken(BankOrder.name),
  );
  const bipModel = app.get<Model<Bip>>(getModelToken('Bip'));

  try {
    let totalUpdated = 0;

    // Process Bank Orders
    console.log('\n=== Processing Bank Orders ===');
    const bankOrders = await bankOrderModel
      .find({
        $or: [
          { statusHistory: { $exists: false } },
          { statusHistory: { $size: 0 } },
        ],
        isDeleted: false,
      })
      .exec();

    console.log(`Found ${bankOrders.length} bank orders to update`);

    for (const order of bankOrders) {
      try {
        // Use createdAt timestamp if available, otherwise use current time
        const timestamp = order.createdAt || new Date();

        await bankOrderModel.updateOne(
          { _id: order._id },
          {
            $set: {
              statusHistory: [
                {
                  status: order.status,
                  timestamp,
                },
              ],
            },
          }
        );

        console.log(`✓ Updated bank order ${order.refNo} (${order._id})`);
        totalUpdated++;
      } catch (error) {
        console.error(`✗ Error updating bank order ${order._id}:`, error.message);
      }
    }

    // Process BIP Orders
    console.log('\n=== Processing BIP Orders ===');
    const bipOrders = await bipModel
      .find({
        $or: [
          { statusHistory: { $exists: false } },
          { statusHistory: { $size: 0 } },
        ],
        isDeleted: false,
      })
      .exec();

    console.log(`Found ${bipOrders.length} BIP orders to update`);

    for (const order of bipOrders) {
      try {
        // Use createdAt timestamp if available, otherwise use current time
        const timestamp = order.createdAt || new Date();

        await bipModel.updateOne(
          { _id: order._id },
          {
            $set: {
              statusHistory: [
                {
                  status: order.status,
                  timestamp,
                },
              ],
            },
          }
        );

        console.log(`✓ Updated BIP order ${order.eforms} (${order._id})`);
        totalUpdated++;
      } catch (error) {
        console.error(`✗ Error updating BIP order ${order._id}:`, error.message);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total bank orders found: ${bankOrders.length}`);
    console.log(`Total BIP orders found: ${bipOrders.length}`);
    console.log(`Total orders updated: ${totalUpdated}`);
    console.log('========================\n');

    console.log('Status history backfill migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the migration
backfillStatusHistory()
  .then(() => {
    console.log('Migration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
