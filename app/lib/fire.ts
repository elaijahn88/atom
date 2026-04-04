// lib/fire.ts
import { auth, db, database } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import { ref, push } from "firebase/database";

// Type for user bio
export type UserBio = {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  gender?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  occupation?: string;
};

// Save user data
export const saveUserData = async (
  formData: Omit<UserBio, "uid" | "email"> & { email?: string }
) => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Please log in first");
  }

  const userData: UserBio = {
    ...formData,
    uid: currentUser.uid,
    email: currentUser.email || formData.email || "",
  };

  try {
    // ✅ Firestore
    await setDoc(doc(db, "users", userData.uid), userData);

    // ✅ Realtime DB
    const rRef = ref(database, "users");
    const newRKey = push(rRef, userData).key;

    return {
      success: true,
      firestoreId: userData.uid,
      realtimeKey: newRKey,
    };
  } catch (error) {
    console.error("Save error:", error);
    throw error;
  }
};
