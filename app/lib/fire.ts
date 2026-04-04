import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";

import { 
  ref, 
  set, 
  get, 
  child, 
  update 
} from "firebase/database";

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from "firebase/auth";

import { auth } from "../../firebase";
import { firestore } from "../../firebase";   // ← Make sure you export firestore too
import { database } from "../../firebase";

// ======================
// Interfaces
// ======================

export interface UserData {
  phone?: string;
  email?: string;
  wallet?: number;
  deviceId?: string;
  contact?: string;   // kept for backward compatibility with your Realtime DB
}

// ======================
// Firestore Functions (User Profile + Device)
// ======================

/**
 * Get user by deviceId from Firestore
 */
export const getUserByDeviceId = async (deviceId: string) => {
  const q = query(
    collection(firestore, "users"), 
    where("deviceId", "==", deviceId)
  );
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data() as UserData;
  }
  return null;
};

/**
 * Save/Update deviceId for a user in Firestore
 */
export const saveDeviceIdForUser = async (uid: string, deviceId: string) => {
  const userRef = doc(firestore, "users", uid);
  await setDoc(userRef, { deviceId }, { merge: true });
};

/**
 * Update user profile in Firestore (recommended for most user data)
 */
export const updateUserProfile = async (uid: string, data: Partial<UserData>) => {
  const userRef = doc(firestore, "users", uid);
  await setDoc(userRef, data, { merge: true });
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (uid: string): Promise<UserData | null> => {
  const userRef = doc(firestore, "users", uid);
  const docSnap = await getDoc(userRef);
  return docSnap.exists() ? (docSnap.data() as UserData) : null;
};

// ======================
// Realtime Database + Auth Functions
// ======================

/**
 * Login or Signup with Email + Password
 * - Tries to sign in first
 * - If fails, creates new user
 * - Initializes wallet and deviceId in Realtime Database
 */
export const loginOrSignup = async (
  email: string, 
  password: string, 
  phone: string, 
  deviceId: string
) => {
  try {
    // Try login first
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    const snapshot = await get(child(ref(database), `users/${uid}`));
    
    const existingData = snapshot.exists() ? snapshot.val() : {};
    const wallet = existingData.wallet ?? 20;

    return { 
      success: true, 
      uid, 
      email, 
      phone, 
      wallet 
    };

  } catch {
    // User doesn't exist → Create new account
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      if (uid) {
        await set(ref(database, `users/${uid}`), {
          contact: phone || email,
          wallet: 20,
          deviceId,
          email,
          phone: phone || null,
        });
      }

      return { 
        success: true, 
        uid, 
        email, 
        phone, 
        wallet: 20 
      };

    } catch (err: any) {
      return { 
        success: false, 
        error: err.message 
      };
    }
  }
};

/**
 * Update wallet balance in Realtime Database
 */
export const updateWallet = async (uid: string, newBalance: number) => {
  await update(ref(database, `users/${uid}`), { 
    wallet: newBalance 
  });
};

/**
 * Sign out
 */
export const logout = async () => {
  await signOut(auth);
};
