const { PrismaClient } = require('@prisma/client')
const { hash } = require('bcryptjs')

const prisma = new PrismaClient()

async function setupAdmin() {
  try {
    const username = process.argv[2]
    const password = process.argv[3]

    if (!username || !password) {
      console.error('Please provide username and password')
      console.error('Usage: npm run setup-admin username password')
      process.exit(1)
    }

    const hashedPassword = await hash(password, 12)
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    })

    console.log('Admin user created successfully:', user.username)
    await prisma.$disconnect()
    process.exit(0)
  } catch (error) {
    console.error('Error creating admin user:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

setupAdmin()
