// This script creates an admin user if one doesn't exist
// Run with: node scripts/create-admin-user.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createAdminUser() {
  console.log('Checking for existing admin user...');
  
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    });
    
    if (existingAdmin) {
      console.log(`Admin user already exists: ${existingAdmin.username}`);
      return existingAdmin;
    }
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: 'ADMIN',
        email: 'admin@example.com',
        name: 'System Admin',
        verified: true
      }
    });
    
    console.log(`Created admin user with ID: ${adminUser.id}`);
    return adminUser;
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
