// This script creates a default event and links all unassociated records to it
// Run with: node scripts/create-default-event.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDefaultEvent() {
  console.log('Creating default event...');
  
  try {
    // Check if there's at least one user to be the owner
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'superadmin'
      }
    });
    
    if (!adminUser) {
      console.error('No admin user found. Please create an admin user first.');
      return;
    }
    
    // Check if default event already exists
    const existingEvent = await prisma.event.findFirst({
      where: {
        title: 'Default Event'
      }
    });
    
    if (existingEvent) {
      console.log(`Default event already exists with ID: ${existingEvent.id}`);
      return existingEvent;
    }
    
    // Create default event
    const defaultEvent = await prisma.event.create({
      data: {
        title: 'Default Event',
        description: 'Default event for migration purposes',
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 7)), // One week from now
        status: 'draft',
        ownerId: adminUser.id,
        metadata: {
          menuItems: JSON.stringify([]) // Initialize empty menu items array
        }
      }
    });
    
    console.log(`Created default event with ID: ${defaultEvent.id}`);
    return defaultEvent;
  } catch (error) {
    console.error('Error creating default event:', error);
  }
}

async function linkRecordsToDefaultEvent(defaultEvent) {
  if (!defaultEvent) {
    console.error('Default event not provided. Cannot link records.');
    return;
  }
  
  console.log(`Linking unassociated records to default event (ID: ${defaultEvent.id})...`);
  
  try {
    // Update all tables
    const tablesResult = await prisma.$executeRaw`UPDATE "Table" SET "eventId" = ${defaultEvent.id} WHERE "eventId" IS NULL`;
    console.log(`Updated ${tablesResult} tables`);
    
    // Update all registration codes
    const registrationCodesResult = await prisma.$executeRaw`UPDATE "RegistrationCode" SET "eventId" = ${defaultEvent.id} WHERE "eventId" IS NULL`;
    console.log(`Updated ${registrationCodesResult} registration codes`);
    
    // Update all batches
    const batchesResult = await prisma.$executeRaw`UPDATE "Batch" SET "eventId" = ${defaultEvent.id} WHERE "eventId" IS NULL`;
    console.log(`Updated ${batchesResult} batches`);
    
    // Update all hosts
    const hostsResult = await prisma.$executeRaw`UPDATE "Host" SET "eventId" = ${defaultEvent.id} WHERE "eventId" IS NULL`;
    console.log(`Updated ${hostsResult} hosts`);
    
    // Update all souvenirs
    const souvenirsResult = await prisma.$executeRaw`UPDATE "Souvenir" SET "eventId" = ${defaultEvent.id} WHERE "eventId" IS NULL`;
    console.log(`Updated ${souvenirsResult} souvenirs`);
    
    // Verify the migration was successful
    console.log('Verifying migration...');
    
    // Check if tables have been linked to the default event
    const tablesCount = await prisma.$executeRaw`SELECT COUNT(*) FROM "Table" WHERE "eventId" = ${defaultEvent.id}`;
    const registrationCodesCount = await prisma.$executeRaw`SELECT COUNT(*) FROM "RegistrationCode" WHERE "eventId" = ${defaultEvent.id}`;
    const batchesCount = await prisma.$executeRaw`SELECT COUNT(*) FROM "Batch" WHERE "eventId" = ${defaultEvent.id}`;
    const hostsCount = await prisma.$executeRaw`SELECT COUNT(*) FROM "Host" WHERE "eventId" = ${defaultEvent.id}`;
    const souvenirsCount = await prisma.$executeRaw`SELECT COUNT(*) FROM "Souvenir" WHERE "eventId" = ${defaultEvent.id}`;
    
    console.log('Migration verification results:');
    console.log(`- Tables linked to default event: ${tablesCount}`);
    console.log(`- Registration codes linked to default event: ${registrationCodesCount}`);
    console.log(`- Batches linked to default event: ${batchesCount}`);
    console.log(`- Hosts linked to default event: ${hostsCount}`);
    console.log(`- Souvenirs linked to default event: ${souvenirsCount}`);
  } catch (error) {
    console.error('Error linking records to default event:', error);
  }
}

async function main() {
  try {
    const defaultEvent = await createDefaultEvent();
    if (defaultEvent) {
      await linkRecordsToDefaultEvent(defaultEvent);
    }
    console.log('Process completed!');
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
