// This script checks for existing users and creates a default event
// Run with: node scripts/check-users-and-create-event.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAdminUser() {
  console.log('Looking for existing users...');
  
  try {
    // Find all users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users in the database`);
    
    if (users.length === 0) {
      console.error('No users found in the database. Please create a user first.');
      return null;
    }
    
    // Try to find an admin user
    const adminUser = users.find(user => user.role === 'SUPERADMIN' || user.role === 'superadmin');
    
    if (adminUser) {
      console.log(`Found admin user: ${adminUser.username} (ID: ${adminUser.id})`);
      return adminUser;
    }
    
    // If no admin user, use the first user
    console.log(`No admin user found. Using first user: ${users[0].username} (ID: ${users[0].id})`);
    return users[0];
  } catch (error) {
    console.error('Error finding users:', error);
    return null;
  }
}

async function createDefaultEvent(owner) {
  console.log('Creating default event...');
  
  try {
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
        ownerId: owner.id
      }
    });
    
    console.log(`Created default event with ID: ${defaultEvent.id}`);
    return defaultEvent;
  } catch (error) {
    console.error('Error creating default event:', error);
    return null;
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
    const tablesCount = await prisma.table.count({
      where: { eventId: defaultEvent.id }
    });
    
    const registrationCodesCount = await prisma.registrationCode.count({
      where: { eventId: defaultEvent.id }
    });
    
    const batchesCount = await prisma.batch.count({
      where: { eventId: defaultEvent.id }
    });
    
    const hostsCount = await prisma.host.count({
      where: { eventId: defaultEvent.id }
    });
    
    const souvenirsCount = await prisma.souvenir.count({
      where: { eventId: defaultEvent.id }
    });
    
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
    const adminUser = await findAdminUser();
    if (adminUser) {
      const defaultEvent = await createDefaultEvent(adminUser);
      if (defaultEvent) {
        await linkRecordsToDefaultEvent(defaultEvent);
      }
    }
    console.log('Process completed!');
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
