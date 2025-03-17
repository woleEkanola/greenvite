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
      username: 'superadmin'
    }
  })

  if (existingSuperAdmin) {
    console.log('Superadmin already exists, skipping creation')
  } else {
    // Create a superadmin user
    console.log('Creating superadmin user...')
    const hashedPassword = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        username: 'superadmin',
        password: hashedPassword,
        role: 'superadmin',
        email: 'admin@example.com',
        name: 'Super Admin'
      }
    })
    console.log('Superadmin created successfully')
  }

  // Create some registration codes if none exist
  const codeCount = await prisma.registrationCode.count()
  if (codeCount === 0) {
    console.log('Creating sample registration codes...')
    
    for (let i = 1; i <= 10; i++) {
      const code = `TEST${i.toString().padStart(3, '0')}`
      await prisma.registrationCode.create({
        data: {
          code,
          used: false,
          status: 'available'
        }
      })
    }
    
    console.log('Created 10 sample registration codes')
  } else {
    console.log(`${codeCount} registration codes already exist, skipping creation`)
  }

  console.log('Seed completed successfully')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Error during seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
