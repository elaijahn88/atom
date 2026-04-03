// lib/saveUserData.ts
import { db, database, ref, push } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

// Type for user bio info
export interface UserBio {
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  occupation: string;
}

/**
 * Save user bio info to Firestore
 */
export const saveToFirestore = async (user: UserBio) => {
  try {
    const docRef = await addDoc(collection(db, "users"), user);
    console.log("Document written with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error adding document to Firestore: ", error);
    throw error;
  }
};

/**
 * Save user bio info to Realtime Database
 */
export const saveToRealtimeDB = async (user: UserBio) => {
  try {
    const usersRef = ref(database, "users");
    const newUserRef = push(usersRef);
    await newUserRef.set(user);
    console.log("Data saved to Realtime Database at: ", newUserRef.key);
    return newUserRef.key;
  } catch (error) {
    console.error("Error saving to Realtime Database: ", error);
    throw error;
  }
};

/**
 * Save user info to both Firestore and Realtime DB
 */
export const saveUserData = async (user: UserBio) => {
  const firestoreId = await saveToFirestore(user);
  const realtimeKey = await saveToRealtimeDB(user);
  return { firestoreId, realtimeKey };
};
