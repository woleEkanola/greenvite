// This script runs the migration to link models to events
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('Starting event migration process...');
  
  try {
    // Step 1: Check if default event exists
    const prisma = new PrismaClient();
    const defaultEvent = await prisma.event.findFirst({
      where: { title: 'Jesse George Church Dedication' }
    });
    
    if (!defaultEvent) {
      console.error('Default event not found. Please create it first.');
      process.exit(1);
    }
    
    console.log(`Found default event with ID: ${defaultEvent.id}`);
    
    // Step 2: Apply the schema migration
    console.log('Applying schema migration...');
    execSync('npx prisma migrate dev --name link_models_to_events --skip-generate', { stdio: 'inherit' });
    
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
    
    // Step 4: Generate Prisma client
    console.log('Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Step 5: Verify the migration was successful
    console.log('Verifying migration...');
    
    // Reconnect with the updated client
    await prisma.$disconnect();
    const newPrisma = new PrismaClient();
    
    // Check if tables have been linked to the default event
    const tablesCount = await newPrisma.table.count({
      where: { eventId: defaultEvent.id }
    });
    
    const registrationCodesCount = await newPrisma.registrationCode.count({
      where: { eventId: defaultEvent.id }
    });
    
    const batchesCount = await newPrisma.batch.count({
      where: { eventId: defaultEvent.id }
    });
    
    const hostsCount = await newPrisma.host.count({
      where: { eventId: defaultEvent.id }
    });
    
    const souvenirsCount = await newPrisma.souvenir.count({
      where: { eventId: defaultEvent.id }
    });
    
    console.log('Migration verification results:');
    console.log(`- Tables linked to default event: ${tablesCount}`);
    console.log(`- Registration codes linked to default event: ${registrationCodesCount}`);
    console.log(`- Batches linked to default event: ${batchesCount}`);
    console.log(`- Hosts linked to default event: ${hostsCount}`);
    console.log(`- Souvenirs linked to default event: ${souvenirsCount}`);
    
    console.log('Migration completed successfully!');
    
    await newPrisma.$disconnect();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
