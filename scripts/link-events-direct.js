// This script directly links models to events using SQL queries
const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('Starting direct event linking process...');
  
  try {
    // Connect to the database
    const prisma = new PrismaClient();
    
    // Step 1: Check if default event exists
    const defaultEvent = await prisma.event.findFirst({
      where: { title: 'Jesse George Church Dedication' }
    });
    
    if (!defaultEvent) {
      console.error('Default event not found. Please create it first.');
      process.exit(1);
    }
    
    console.log(`Found default event with ID: ${defaultEvent.id}`);
    
    // Step 2: Add eventId columns to tables if they don't exist
    console.log('Adding eventId columns to tables...');
    
    try {
      await prisma.$executeRaw`ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "eventId" TEXT REFERENCES "Event"("id")`;
      console.log('Added eventId column to Table');
    } catch (error) {
      console.log('Table eventId column already exists or error:', error.message);
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE "RegistrationCode" ADD COLUMN IF NOT EXISTS "eventId" TEXT REFERENCES "Event"("id")`;
      console.log('Added eventId column to RegistrationCode');
    } catch (error) {
      console.log('RegistrationCode eventId column already exists or error:', error.message);
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE "Batch" ADD COLUMN IF NOT EXISTS "eventId" TEXT REFERENCES "Event"("id")`;
      console.log('Added eventId column to Batch');
    } catch (error) {
      console.log('Batch eventId column already exists or error:', error.message);
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE "Host" ADD COLUMN IF NOT EXISTS "eventId" TEXT REFERENCES "Event"("id")`;
      console.log('Added eventId column to Host');
    } catch (error) {
      console.log('Host eventId column already exists or error:', error.message);
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE "Souvenir" ADD COLUMN IF NOT EXISTS "eventId" TEXT REFERENCES "Event"("id")`;
      console.log('Added eventId column to Souvenir');
    } catch (error) {
      console.log('Souvenir eventId column already exists or error:', error.message);
    }
    
    // Step 3: Update the data to link to the default event
    console.log('Linking existing data to the default event...');
    
    // Update all tables
    const tablesResult = await prisma.$executeRaw`UPDATE "Table" SET "eventId" = ${defaultEvent.id} WHERE "eventId" IS NULL`;
    console.log(`Updated ${tablesResult} tables`);
    
    // Update all registration codes
    const regCodesResult = await prisma.$executeRaw`UPDATE "RegistrationCode" SET "eventId" = ${defaultEvent.id} WHERE "eventId" IS NULL`;
    console.log(`Updated ${regCodesResult} registration codes`);
    
    // Update all batches
    const batchesResult = await prisma.$executeRaw`UPDATE "Batch" SET "eventId" = ${defaultEvent.id} WHERE "eventId" IS NULL`;
    console.log(`Updated ${batchesResult} batches`);
    
    // Update all hosts
    const hostsResult = await prisma.$executeRaw`UPDATE "Host" SET "eventId" = ${defaultEvent.id} WHERE "eventId" IS NULL`;
    console.log(`Updated ${hostsResult} hosts`);
    
    // Update all souvenirs
    const souvenirsResult = await prisma.$executeRaw`UPDATE "Souvenir" SET "eventId" = ${defaultEvent.id} WHERE "eventId" IS NULL`;
    console.log(`Updated ${souvenirsResult} souvenirs`);
    
    // Step 4: Verify the migration was successful
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
    
    console.log('Migration completed successfully!');
    console.log('IMPORTANT: You now need to run "npx prisma generate" to update the Prisma client');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
