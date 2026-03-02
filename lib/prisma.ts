import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Validate DATABASE_URL format (non-blocking warnings only)
const validateDatabaseUrl = () => {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('⚠️  ERROR: DATABASE_URL environment variable is not set')
    return
  }
  
  // Check for common misconfigurations
  if (dbUrl.includes('db.prisma.io')) {
    console.error('⚠️  WARNING: DATABASE_URL appears to be misconfigured (db.prisma.io is not a valid database host)')
    console.error('Please check your Vercel environment variables and ensure DATABASE_URL points to your actual database')
    return
  }
  
  // Basic URL format validation (warn only, don't throw)
  try {
    const url = new URL(dbUrl)
    if (!url.hostname || url.hostname === 'db.prisma.io') {
      console.error('⚠️  WARNING: DATABASE_URL has an invalid hostname:', url.hostname)
      console.error('Please verify your DATABASE_URL environment variable is correctly configured')
    }
  } catch (error) {
    console.error('⚠️  WARNING: DATABASE_URL format validation failed:', error instanceof Error ? error.message : error)
    console.error('Please verify your DATABASE_URL environment variable is correctly configured')
  }
}

// Validate on module load (only in production to catch config issues early)
// This is non-blocking - it only logs warnings and never throws
if (process.env.NODE_ENV === 'production') {
  try {
    validateDatabaseUrl()
  } catch (error) {
    // Silently catch any validation errors - we don't want validation to break the app
    console.error('⚠️  Database URL validation encountered an error (non-fatal):', error instanceof Error ? error.message : error)
  }
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

