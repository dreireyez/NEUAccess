/**
 * Authentication Recovery Utilities
 * Helps recover from stuck login states and incomplete sessions
 */

import { Auth, signOut } from 'firebase/auth';

/**
 * Detects if the user might be stuck in a login state
 * by checking localStorage and session state mismatches
 */
export function detectStuckLoginState(): boolean {
  try {
    // Check if Firebase auth token exists in localStorage
    const authTokens = localStorage.getItem('firebase:authUser:studio-2118012515-dc75e:');
    const firebaseAuthState = localStorage.getItem('firebase:authUser:studio-2118012515-dc75e:');
    
    // If auth token exists but we're on login page, something might be wrong
    return !!authTokens && !!firebaseAuthState;
  } catch (e) {
    console.error('Error detecting stuck login state:', e);
    return false;
  }
}

/**
 * Clears stuck authentication state from browser storage
 * Useful when users are stuck in redirect loops
 */
export async function clearStuckAuthState(auth: Auth): Promise<void> {
  try {
    // Sign out from Firebase
    await signOut(auth);
    
    // Clear Firebase auth tokens from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('firebase:')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear session storage as well
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('firebase:')) {
        sessionStorage.removeItem(key);
      }
    }
    
    console.log('Cleared stuck auth state');
  } catch (e) {
    console.error('Error clearing stuck auth state:', e);
  }
}

/**
 * Recovers from a stuck login state by:
 * 1. Clearing local authentication state
 * 2. Reloading the page to allow fresh auth initialization
 */
export async function recoverFromStuckLogin(auth: Auth): Promise<void> {
  console.log('Attempting to recover from stuck login state');
  
  try {
    await clearStuckAuthState(auth);
    
    // Add a small delay to ensure state is cleared
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Reload the page to restart authentication
    window.location.href = '/';
  } catch (e) {
    console.error('Error recovering from stuck login:', e);
    // As a last resort, just reload
    window.location.href = '/';
  }
}

/**
 * Checks if user has been in an authentication loading state
 * for too long (indicating a stuck state)
 */
export function hasLoadingTimedOut(startTime: number, timeoutMs: number = 15000): boolean {
  return Date.now() - startTime > timeoutMs;
}

/**
 * Validates that the Firebase persistence is properly configured
 * Returns true if persistence is working correctly
 */
export async function validatePersistence(auth: Auth): Promise<boolean> {
  try {
    // Check if auth persistence settings are available
    const currentUser = auth.currentUser;
    
    // If we have a current user, persistence is working
    if (currentUser) {
      return true;
    }
    
    // Check localStorage for auth data
    const hasAuthData = localStorage.getItem('firebase:authUser:studio-2118012515-dc75e:') !== null;
    return hasAuthData;
  } catch (e) {
    console.error('Error validating persistence:', e);
    return false;
  }
}
