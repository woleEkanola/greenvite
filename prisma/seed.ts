const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed process...');

  // First, run a migration to ensure the schema is up to date
  console.log('Ensuring schema is up to date...');

  // Check if superadmin already exists
  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      role: 'superadmin'
    }
  })

  if (existingSuperAdmin) {
    console.log('Superadmin already exists, skipping creation')
  } else {
    // Create default superadmin
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    const superAdmin = await prisma.user.create({
      data: {
        username: 'superadmin',
        password: hashedPassword,
        role: 'superadmin',
        email: 'admin@greenvites.online',
        name: 'Super Administrator'
      }
    })
    
    console.log(`Created superadmin with ID: ${superAdmin.id}`)
  }
  
  // Create some default registration codes if none exist
  const existingCodes = await prisma.registrationCode.count()
  
  if (existingCodes === 0) {
    console.log('Creating default registration codes...')
    
    const codes = ['ABC123', 'DEF456', 'GHI789', 'JKL012', 'MNO345']
    
    for (const code of codes) {
      await prisma.registrationCode.create({
        data: {
          code,
          used: false,
          status: 'available'
        }
      })
    }
    
    console.log(`Created ${codes.length} registration codes`)
  } else {
    console.log(`${existingCodes} registration codes already exist, skipping creation`)
  }
  
  console.log('Seed process completed successfully')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Error during seed process:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
