import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Validate DATABASE_URL format
const validateDatabaseUrl = () => {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  
  // Check for common misconfigurations
  if (dbUrl.includes('db.prisma.io')) {
    console.error('⚠️  WARNING: DATABASE_URL appears to be misconfigured (db.prisma.io is not a valid database host)')
    console.error('Please check your Vercel environment variables and ensure DATABASE_URL points to your actual database')
  }
  
  // Basic URL format validation
  try {
    const url = new URL(dbUrl)
    if (!url.hostname || url.hostname === 'db.prisma.io') {
      throw new Error('Invalid DATABASE_URL hostname')
    }
  } catch (error) {
    console.error('⚠️  DATABASE_URL format validation failed:', error)
  }
}

// Validate on module load (only in production to catch config issues early)
if (process.env.NODE_ENV === 'production') {
  validateDatabaseUrl()
}

// Prisma Client configuration for serverless environments
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

