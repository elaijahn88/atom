// fire.ts
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

import { auth, db, database } from "../../firebase"; // ← updated imports

// ======================
// Interfaces
// ======================
export interface UserData {
  uid?: string;
  email?: string;
  phone?: string;
  wallet?: number;
  deviceId?: string;
  username?: string;
  location?: string;
  foodLikes?: string;
  drinkLikes?: string;
}

// ======================
// Firestore Functions (User Profile + Device)
// ======================

/**
 * Get user by deviceId from Firestore
 */
export const getUserByDeviceId = async (deviceId: string) => {
  const q = query(
    collection(db, "users"), 
    where("deviceId", "==", deviceId)
  );
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    const docSnap = querySnapshot.docs[0];
    return { uid: docSnap.id, ...docSnap.data() } as UserData;
  }
  return null;
};

/**
 * Save/Update deviceId for a user in Firestore
 */
export const saveDeviceIdForUser = async (uid: string, deviceId: string) => {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, { deviceId }, { merge: true });
};

/**
 * Update user profile in Firestore
 */
export const updateUserProfile = async (uid: string, data: Partial<UserData>) => {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, data, { merge: true });
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (uid: string): Promise<UserData | null> => {
  const userRef = doc(db, "users", uid);
  const docSnap = await getDoc(userRef);
  return docSnap.exists() ? ({ uid: docSnap.id, ...docSnap.data() } as UserData) : null;
};

// ======================
// Realtime Database + Auth Functions
// ======================

/**
 * Login or Signup with Email + Password
 * Tries to sign in first; if fails, creates new user
 * Initializes wallet and deviceId in Realtime Database
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
      wallet,
      ...existingData
    };

  } catch {
    // User doesn't exist → create new account
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
  await update(ref(database, `users/${uid}`), { wallet: newBalance });
};

/**
 * Sign out
 */
export const logout = async () => {
  await signOut(auth);
};
