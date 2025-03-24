// This script migrates menu items from Event metadata to the new MenuItem model
// This script is designed to be run AFTER the MenuItem model has been added to the schema
// and the database has been migrated.
// 
// IMPORTANT: This script should NOT be run until:
// 1. The MenuItem model has been added to the Prisma schema
// 2. A successful migration has been run with `npx prisma migrate dev`
//
// Run with: node scripts/migrate-menu-items.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateMenuItems() {
  console.log('Starting menu items migration...');
  
  try {
    // Get all events that might have menu items in metadata
    const events = await prisma.$queryRaw`
      SELECT id, metadata 
      FROM "Event" 
      WHERE metadata->>'menuItems' IS NOT NULL
    `;
    
    console.log(`Found ${events.length} events with menu items in metadata`);
    
    let totalMigratedItems = 0;
    
    // Process each event
    for (const event of events) {
      try {
        const eventId = event.id;
        let menuItems = [];
        
        try {
          // Parse menu items from metadata
          if (event.metadata && event.metadata.menuItems) {
            menuItems = JSON.parse(event.metadata.menuItems);
          }
        } catch (parseError) {
          console.error(`Error parsing menu items for event ${eventId}:`, parseError);
          continue;
        }
        
        if (!Array.isArray(menuItems) || menuItems.length === 0) {
          console.log(`No valid menu items found for event ${eventId}`);
          continue;
        }
        
        console.log(`Migrating ${menuItems.length} menu items for event ${eventId}`);
        
        // Create MenuItem records for each item
        for (const item of menuItems) {
          // Check if this item already exists in the MenuItem table
          // (to avoid duplicates if the script is run multiple times)
          const existingItem = await prisma.menuItem.findFirst({
            where: {
              eventId,
              name: item.name,
              type: item.type
            }
          });
          
          if (!existingItem) {
            await prisma.menuItem.create({
              data: {
                id: item.id || undefined, // Use existing ID if available
                name: item.name,
                description: item.description || null,
                type: item.type,
                dietaryInfo: item.dietaryInfo || [],
                image: item.image || null,
                eventId
              }
            });
            
            totalMigratedItems++;
          } else {
            console.log(`Skipping existing menu item: ${item.name}`);
          }
        }
        
        console.log(`Successfully migrated menu items for event ${eventId}`);
        
        // Optionally, you can remove the menuItems from metadata after migration
        // Uncomment the following code to do so
        /*
        await prisma.$executeRaw`
          UPDATE "Event"
          SET metadata = metadata - 'menuItems'
          WHERE id = ${eventId}
        `;
        console.log(`Removed menuItems from metadata for event ${eventId}`);
        */
      } catch (eventError) {
        console.error(`Error processing event ${event.id}:`, eventError);
      }
    }
    
    console.log(`Migration completed. Total migrated items: ${totalMigratedItems}`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateMenuItems();
