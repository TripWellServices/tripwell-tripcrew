import * as admin from 'firebase-admin'
import { getDefaultFirebaseProjectId } from '@/config/firebaseProjectDefaults'

let adminAuthInstance: admin.auth.Auth | null = null

type AdminCredentials = {
  projectId: string
  clientEmail: string
  privateKey: string
}

function parseServiceAccountJson(raw: string): AdminCredentials {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON')
  }
  const projectId = parsed.project_id
  const clientEmail = parsed.client_email
  const privateKey = parsed.private_key
  if (
    typeof projectId !== 'string' ||
    typeof clientEmail !== 'string' ||
    typeof privateKey !== 'string' ||
    !projectId ||
    !clientEmail ||
    !privateKey
  ) {
    throw new Error(
      'Service account JSON must include project_id, client_email, and private_key'
    )
  }
  return { projectId, clientEmail, privateKey }
}

/** Explicit service account (production / Vercel). */
function tryLoadCertCredentials(): AdminCredentials | null {
  const rawJson =
    process.env.FIREBASE_SERVICE_ACCOUNT?.trim() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (rawJson) {
    return parseServiceAccountJson(rawJson)
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim()
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim()
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim()
  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }
  }
  return null
}

function configureMissingAdminHelp(): string {
  const pid = getDefaultFirebaseProjectId()
  return (
    `Firebase Admin not configured. Production: set FIREBASE_SERVICE_ACCOUNT (full JSON). ` +
    `Local dev alternative: run "gcloud auth application-default login" with access to project "${pid}", ` +
    `or set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.`
  )
}

/** Vercel serverless has no Application Default Credentials; require JSON secret. */
function requiresExplicitServiceAccount(): boolean {
  return process.env.VERCEL === '1'
}

function initializeFirebaseAdminApp(): void {
  const certCreds = tryLoadCertCredentials()
  if (certCreds) {
    const cleanPrivateKey = certCreds.privateKey.replace(/\\n/g, '\n')
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: certCreds.projectId,
        clientEmail: certCreds.clientEmail,
        privateKey: cleanPrivateKey,
      }),
    })
    return
  }

  if (requiresExplicitServiceAccount()) {
    throw new Error(configureMissingAdminHelp())
  }

  // Local dev: optional `gcloud auth application-default login` (project matches client defaults).
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: getDefaultFirebaseProjectId(),
    })
  } catch (err: unknown) {
    const hint = err instanceof Error ? err.message : String(err)
    throw new Error(`${configureMissingAdminHelp()} (${hint})`)
  }
}

export function getAdminAuth(): admin.auth.Auth {
  if (adminAuthInstance) {
    return adminAuthInstance
  }

  if (!admin.apps.length) {
    try {
      initializeFirebaseAdminApp()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Firebase Admin not configured')) {
        throw err
      }
      throw new Error(`Firebase Admin initialization failed: ${msg}`)
    }
  }

  adminAuthInstance = admin.auth()
  return adminAuthInstance
}

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_target, prop) {
    return getAdminAuth()[prop as keyof admin.auth.Auth]
  },
})
