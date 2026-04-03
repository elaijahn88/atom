// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import { getRemoteConfig } from "firebase/remote-config";

// 🔑 Firebase configuration (from google-services.json)
const firebaseConfig = {
  apiKey: "AIzaSyD5jl0y21celoXtnFpyIjM-0_y1k8yCEsk",
  authDomain: "elijah-89c76.firebaseapp.com",
  projectId: "elijah-89c76",
  storageBucket: "elijah-89c76.firebasestorage.app",
  messagingSenderId: "786398756349",
  appId: "1:786398756349:android:125ee41780ab86c9ff6d94", 
  // 👆 You can swap this with the second appId if targeting com.xlijah.Atom
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Export Firebase services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const database = getDatabase(app);

// 🧠 Initialize Remote Config
const remoteConfig = getRemoteConfig(app);
remoteConfig.settings = {
  minimumFetchIntervalMillis: 3600000, // fetch every 1 hour
};

export { db, auth, storage, database, remoteConfig };
