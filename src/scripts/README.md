# Database Migration Scripts

## Backfill Status History

This script backfills `statusHistory` for existing orders that don't have it yet.

### What it does:
- Finds all bank orders and BIP orders without statusHistory
- Creates a statusHistory entry with the current status
- Uses the order's `createdAt` timestamp (or current time if not available)
- Only updates orders where statusHistory is missing or empty

### How to run:

```bash
# From the project root directory
npx ts-node src/scripts/backfill-status-history.ts
```

### Expected output:

```
Starting status history backfill migration...

=== Processing Bank Orders ===
Found 150 bank orders to update
✓ Updated bank order REF-2024-001 (507f...)
✓ Updated bank order REF-2024-002 (507f...)
...

=== Processing BIP Orders ===
Found 75 BIP orders to update
✓ Updated BIP order EFORM-2024-001 (507f...)
...

=== Migration Summary ===
Total bank orders found: 150
Total BIP orders found: 75
Total orders updated: 225
========================

Status history backfill migration completed!
Migration script finished successfully
```

### What gets added:

For each order, a single statusHistory entry is created:

```javascript
{
  statusHistory: [
    {
      status: "pending",  // or whatever the current status is
      timestamp: "2024-01-15T10:00:00.000Z"  // order's createdAt date
    }
  ]
}
```

### Safety:
- Only updates orders without statusHistory
- Does not modify deleted orders (`isDeleted: false`)
- Uses transaction-safe MongoDB updateOne
- Safe to run multiple times (idempotent)
- Does not overwrite existing statusHistory

### Notes:
- Existing orders will only have ONE entry in statusHistory (their current status)
- New orders going forward will have complete history as status changes
- This is a one-time migration to initialize the field for existing data
