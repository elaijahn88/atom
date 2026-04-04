// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import { getRemoteConfig } from "firebase/remote-config";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD5jl0y21celoXtnFpyIjM-0_y1k8yCEsk",
  authDomain: "elijah-89c76.firebaseapp.com",
  projectId: "elijah-89c76",
  storageBucket: "elijah-89c76.firebasestorage.app",
  messagingSenderId: "786398756349",
  appId: "1:786398756349:android:125ee41780ab86c9ff6d94",
  databaseURL: "https://elijah-89c76-default-rtdb.firebaseio.com",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const database = getDatabase(app);

// Remote Config
export const remoteConfig = getRemoteConfig(app);
remoteConfig.settings = {
  minimumFetchIntervalMillis: 3600000,
};
