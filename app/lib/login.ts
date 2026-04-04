// app/lib/firebaseService.ts
import { auth, database, ref, set } from "../../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

export interface UserData {
  phone: string;
  email: string;
}

/**
 * Login or create a new user
 */
export const loginOrSignup = async (email: string, password: string, phone: string) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { success: true };
  } catch {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await set(ref(database, `users/${userCredential.user.uid}`), { contact: phone || email });
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
};

/**
 * Sign out the user
 */
export const logout = async () => {
  await signOut(auth);
};
