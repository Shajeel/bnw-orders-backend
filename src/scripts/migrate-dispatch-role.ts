import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../modules/users/schemas/user.schema';

/**
 * Migration script to rename DISPATCH role to DISPATCHER
 * Run this script once after deploying the new role changes
 *
 * Usage: npm run migration:dispatch-role
 */
async function migrateDispatchRole() {
  console.log('Starting DISPATCH → DISPATCHER role migration...');

  // Bootstrap the NestJS application
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    // Get the User model
    const userModel = app.get<Model<User>>(getModelToken(User.name));

    // Find all users with DISPATCH role
    const dispatchUsers = await userModel.find({ role: 'dispatch' }).exec();

    console.log(`Found ${dispatchUsers.length} users with DISPATCH role`);

    if (dispatchUsers.length === 0) {
      console.log('No users to migrate. Migration complete.');
      await app.close();
      return;
    }

    // Update all DISPATCH users to DISPATCHER
    const result = await userModel.updateMany(
      { role: 'dispatch' },
      { $set: { role: 'dispatcher' } }
    ).exec();

    console.log(`Successfully migrated ${result.modifiedCount} users from DISPATCH to DISPATCHER`);
    console.log('Migration complete!');

    // List migrated users
    const migratedUsers = await userModel
      .find({ role: 'dispatcher' })
      .select('email firstName lastName role')
      .exec();

    console.log('\nMigrated users:');
    migratedUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} - ${user.firstName} ${user.lastName}`);
    });

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the migration
migrateDispatchRole()
  .then(() => {
    console.log('\nMigration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration script failed:', error);
    process.exit(1);
  });
