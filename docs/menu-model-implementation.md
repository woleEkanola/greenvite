# Menu Model Implementation Plan

## Current Implementation

Currently, menu items for events are stored as JSON data in the Event model's metadata field. This approach was chosen for backward compatibility and to avoid database migration issues.

### API Endpoints

The following API endpoints are available for managing menu items:

- `GET /api/admin/events/[id]/menu` - Fetch menu items for a specific event
- `POST /api/admin/events/[id]/menu` - Add a new menu item
- `PUT /api/admin/events/[id]/menu` - Update an existing menu item
- `DELETE /api/admin/events/[id]/menu` - Delete a menu item

All these endpoints work with the JSON metadata approach, storing menu items as an array in the Event model's metadata field.

### Menu Item Structure

Each menu item has the following structure:

```typescript
interface MenuItem {
  id: string
  name: string
  description?: string
  type: string // 'appetizer' | 'main' | 'dessert' | 'drink' | 'other'
  dietaryInfo?: string[]
  image?: string
}
```

## Future Migration Path

In the future, we plan to migrate to a proper database model for menu items. This will provide better data integrity, querying capabilities, and performance.

### Planned MenuItem Model

```prisma
model MenuItem {
  id           String   @id @default(cuid())
  name         String
  description  String?  @db.Text
  type         String   // appetizer, main, dessert, drink, other
  dietaryInfo  String[] // vegetarian, vegan, gluten-free, etc.
  image        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  eventId      String?
  event        Event?   @relation(fields: [eventId], references: [id])
}
```

### Migration Process

1. Add the MenuItem model to the Prisma schema
2. Run a database migration with `npx prisma migrate dev`
3. Run the migration script at `scripts/migrate-menu-items.js` to transfer existing menu items from Event metadata to the new MenuItem model
4. Update the API endpoints to use the new MenuItem model
5. Optionally, remove the menu items from Event metadata after successful migration

### Migration Script

A migration script has been prepared at `scripts/migrate-menu-items.js`. This script:

1. Fetches all events with menu items in their metadata
2. Parses the menu items
3. Creates new MenuItem records for each item
4. Optionally removes the menu items from the Event metadata

**Important**: The migration script should only be run after the MenuItem model has been added to the schema and the database has been migrated.

## Multi-tenant Considerations

Since the application uses a multi-tenant architecture, the MenuItem model includes an `eventId` field to associate menu items with specific events. This ensures that menu items are properly scoped to their respective events and organizations.

## Security

Access control is implemented at the API level to ensure that only authorized users (event owners and admins) can manage menu items for their events. This security model will remain the same after migration to the proper database model.

## Next Steps

1. Monitor the performance and usage of the current JSON-based approach
2. Plan for a database migration when it's feasible
3. Execute the migration plan with minimal disruption to users
4. Update documentation and notify users of any changes in behavior
