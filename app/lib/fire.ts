import { db, database } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import { ref, push } from "firebase/database";

// Type for user bio
export type UserBio = {
  uid: string;
  email?: string;
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

// Generate random ID (instead of Firebase Auth UID)
const generateUID = () => {
  return "user_" + Math.random().toString(36).substring(2, 12);
};

// Save user data
export const saveUserData = async (
  formData: Omit<UserBio, "uid">
) => {
  // ✅ Generate UID manually
  const uid = generateUID();

  const userData: UserBio = {
    ...formData,
    uid,
  };

  try {
    // ✅ Firestore
    await setDoc(doc(db, "users", uid), userData);

    // ✅ Realtime DB
    const rRef = ref(database, "users");
    const newRKey = push(rRef, userData).key;

    return {
      success: true,
      firestoreId: uid,
      realtimeKey: newRKey,
    };
  } catch (error) {
    console.error("Save error:", error);
    throw error;
  }
};
