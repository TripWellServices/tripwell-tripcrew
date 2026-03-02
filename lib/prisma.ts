import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Get DATABASE_URL, with fallback to Vercel Prisma integration env vars
const getDatabaseUrl = (): string | undefined => {
  // Prisma schema expects DATABASE_URL
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }
  
  // Fallback to Vercel Prisma integration env vars
  // Prefer Prisma Accelerate URL if available (prisma+postgres://)
  const accelerateUrl = process.env.DATABASE_PRISMA_DATABASE_URL
  if (accelerateUrl && accelerateUrl.startsWith('prisma+postgres://')) {
    return accelerateUrl
  }
  
  // Fallback to direct postgres URL
  return process.env.DATABASE_PRISMA_DATABASE_URL || process.env.DATABASE_POSTGRES_URL
}

// Validate DATABASE_URL format (non-blocking warnings only)
const validateDatabaseUrl = () => {
  const dbUrl = getDatabaseUrl()
  
  // Check if DATABASE_URL is set
  if (!dbUrl) {
    console.error('⚠️  ERROR: DATABASE_URL environment variable is not set')
    console.error('Please set DATABASE_URL in your Vercel environment variables')
    console.error('Or ensure DATABASE_PRISMA_DATABASE_URL or DATABASE_POSTGRES_URL is set')
    return
  }
  
  // db.prisma.io is valid for Prisma Accelerate - don't flag it as an error
  // Check for obviously invalid patterns instead
  if (dbUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  WARNING: DATABASE_URL appears to use localhost in production')
  }
  
  // Basic URL format validation (warn only, don't throw)
  try {
    // Handle prisma+postgres:// URLs (Prisma Accelerate)
    const urlString = dbUrl.startsWith('prisma+') ? dbUrl.replace('prisma+', '') : dbUrl
    const url = new URL(urlString)
    if (!url.hostname) {
      console.error('⚠️  WARNING: DATABASE_URL has an invalid hostname')
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

