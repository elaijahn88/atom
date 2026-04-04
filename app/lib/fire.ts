import { auth } from "../../firebase";
import { database } from "../../firebase";
import { ref, set, get, child, update } from "firebase/database";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

export interface UserData {
  phone: string;
  email: string;
  wallet?: number;
}

// Login or create a new user
export const loginOrSignup = async (email: string, password: string, phone: string, deviceId: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    const snapshot = await get(child(ref(database), `users/${uid}`));
    const wallet = snapshot.exists() && snapshot.val().wallet ? snapshot.val().wallet : 20;
    return { success: true, uid, email, phone, wallet };
  } catch {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      if (uid) {
        await set(ref(database, `users/${uid}`), {
          contact: phone || email,
          wallet: 20,
          deviceId,
        });
      }
      return { success: true, uid, email, phone, wallet: 20 };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
};

// Update wallet
export const updateWallet = async (uid: string, newBalance: number) => {
  await update(ref(database, `users/${uid}`), { wallet: newBalance });
};

// Sign out
export const logout = async () => {
  await signOut(auth);
};
