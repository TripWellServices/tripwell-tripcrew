import * as admin from 'firebase-admin'

let adminAuthInstance: admin.auth.Auth | null = null

export function getAdminAuth(): admin.auth.Auth {
  if (adminAuthInstance) {
    return adminAuthInstance
  }

    if (!admin.apps.length) {
      const projectId = process.env.FIREBASE_PROJECT_ID
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
      const privateKey = process.env.FIREBASE_PRIVATE_KEY

      if (!projectId || !clientEmail || !privateKey) {
        const missing: string[] = []
        if (!projectId) missing.push('FIREBASE_PROJECT_ID')
        if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL')
        if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY')
        throw new Error(`Firebase Admin env vars missing: ${missing.join(', ')}`)
      }

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
