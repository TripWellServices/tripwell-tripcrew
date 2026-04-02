import { getFirebaseAuth } from '@/lib/firebase'
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth'

const REDIRECT_KEY = 'tw_google_auth_redirect'

/**
 * Prefer popup; if the browser blocks it, fall back to full-page redirect (same pattern many prod apps use).
 */
export async function signInWithGooglePreferred(
  postAuthPath: string
): Promise<'popup_ok' | 'redirect_started'> {
  const auth = getFirebaseAuth()
  const provider = new GoogleAuthProvider()
  try {
    await signInWithPopup(auth, provider)
    return 'popup_ok'
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code: string }).code)
        : ''
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/cancelled-popup-request'
    ) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(REDIRECT_KEY, postAuthPath)
      }
      await signInWithRedirect(auth, provider)
      return 'redirect_started'
    }
    throw err
  }
}

/** Call on sign-in / sign-up mount after redirect return; returns post-auth path or null. */
export async function consumeGoogleRedirectResult(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const auth = getFirebaseAuth()
  let result = null
  try {
    result = await getRedirectResult(auth)
  } catch {
    return null
  }
  if (!result?.user) return null
  const path = sessionStorage.getItem(REDIRECT_KEY) ?? '/welcome'
  sessionStorage.removeItem(REDIRECT_KEY)
  return path
}
