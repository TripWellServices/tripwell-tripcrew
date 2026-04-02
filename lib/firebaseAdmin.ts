import * as admin from 'firebase-admin'

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

function loadAdminCredentials(): AdminCredentials {
  const rawJson =
    process.env.FIREBASE_SERVICE_ACCOUNT?.trim() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (rawJson) {
    return parseServiceAccountJson(rawJson)
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    const missing: string[] = []
    if (!projectId) missing.push('FIREBASE_PROJECT_ID')
    if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL')
    if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY')
    throw new Error(
      `Firebase Admin not configured: set FIREBASE_SERVICE_ACCOUNT (full JSON, recommended) or all of: ${missing.join(', ')}`
    )
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  }
}

export function getAdminAuth(): admin.auth.Auth {
  if (adminAuthInstance) {
    return adminAuthInstance
  }

  if (!admin.apps.length) {
    const { projectId, clientEmail, privateKey } = loadAdminCredentials()
    const cleanPrivateKey = privateKey.replace(/\\n/g, '\n')

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: cleanPrivateKey,
        }),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
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
