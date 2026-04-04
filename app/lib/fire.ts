// fire.ts
import { db, auth } from "./firebase";
import { doc, setDoc, getDoc, updateDoc, collection, query, orderBy, onSnapshot, addDoc, getDocs } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

/** ------------------ USER AUTH ------------------ */
export async function loginOrSignup(email: string, password: string, name: string, deviceId: string) {
  try {
    let userCred;
    try {
      userCred = await signInWithEmailAndPassword(auth, email, password);
    } catch {
      // If login fails, create account
      userCred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCred.user.uid), {
        email,
        name,
        wallet: 20,
        deviceId
      });
    }

    return { success: true, uid: userCred.user.uid };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getUserByDeviceId(deviceId: string) {
  try {
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      const data: any = docSnap.data();
      if (data.deviceId === deviceId) return { uid: docSnap.id, ...data };
    }
    return null;
  } catch (e) {
    console.log(e);
    return null;
  }
}

export async function saveDeviceIdForUser(uid: string, deviceId: string) {
  try {
    await updateDoc(doc(db, "users", uid), { deviceId });
  } catch (e) {
    console.log(e);
  }
}

export async function updateWallet(uid: string, wallet: number) {
  try {
    await updateDoc(doc(db, "users", uid), { wallet });
  } catch (e) {
    console.log(e);
  }
}

/** ------------------ MESSAGES ------------------ */
export async function sendMessage(senderId: string, receiverDeviceId: string, text: string) {
  try {
    await addDoc(collection(db, "messages"), {
      senderId,
      receiverDeviceId,
      text,
      status: "sent",
      createdAt: new Date()
    });
  } catch (e) {
    console.log(e);
  }
}

export function listenForMessages(deviceId: string, callback: (msgs: any[]) => void) {
  const q = query(collection(db, "messages"), orderBy("createdAt"));
  const unsub = onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((msg) => msg.receiverDeviceId === deviceId || msg.senderId === deviceId);
    callback(msgs);
  });
  return unsub;
}

export async function updateMessageStatus(messageId: string, status: "sent" | "delivered" | "seen") {
  try {
    await updateDoc(doc(db, "messages", messageId), { status });
  } catch (e) {
    console.log(e);
  }
}

/** ------------------ TYPING STATUS ------------------ */
export async function setTypingStatus(senderDeviceId: string, receiverDeviceId: string, isTyping: boolean) {
  try {
    const docRef = doc(db, "typing", `${senderDeviceId}_${receiverDeviceId}`);
    await setDoc(docRef, { isTyping, updatedAt: new Date() });
  } catch (e) {
    console.log(e);
  }
}

export function listenTypingStatus(receiverDeviceId: string, callback: (typing: string | null) => void) {
  const q = query(collection(db, "typing"));
  const unsub = onSnapshot(q, (snapshot) => {
    let typingUser: string | null = null;
    snapshot.docs.forEach((doc) => {
      const data: any = doc.data();
      const [senderId, receiverId] = doc.id.split("_");
      if (receiverId === receiverDeviceId && data.isTyping) typingUser = senderId;
    });
    callback(typingUser);
  });
  return unsub;
}
