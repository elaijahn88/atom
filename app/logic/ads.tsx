import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

export interface IUserData {
  email: string;
  name: string;
  account: number;
  age: number;
  createdAt: Date;
  avatar?: string;
}

export function useAuthAndVideo() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [account, setAccount] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<IUserData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videos, setVideos] = useState<any[]>([]);
  const [showVideoFeed, setShowVideoFeed] = useState(false);

  const videoRefs = useRef<any[]>([]);
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index);
  });
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 80 });

  // 🔄 Fetch single video from Firestore document `videos/ads`
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "videos", "ads"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data?.soso) {
          setVideos([{ id: "ads", uri: data.soso }]);
        } else {
          console.warn("Field 'soso' missing in videos/ads document");
        }
      } else {
        console.warn("Document 'videos/ads' not found!");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (videos.length > 0) setCurrentIndex(0);
  }, [videos]);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const setMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(""), 5000); return false; };

  const validateForm = () => {
    if (!email.trim()) return setMsg("Email is required");
    if (!validateEmail(email)) return setMsg("Enter a valid email");
    if (!password.trim()) return setMsg("Password is required");
    if (!isLoginMode) {
      if (!name.trim()) return setMsg("Full name is required");
      if (password !== confirmPassword) return setMsg("Passwords do not match");
      if (isNaN(Number(age)) || Number(age) <= 0) return setMsg("Enter valid age");
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setMessage("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const u = userCredential.user;
      const userData: IUserData = {
        email: u.email || email,
        name,
        account: Number(account) || 0,
        age: Number(age) || 0,
        createdAt: new Date(),
        avatar: `https://i.pravatar.cc/150?u=${email}`,
      };
      await setDoc(doc(db, "users", u.uid), userData);
      setUser(userData);
      setIsLoggedIn(true);
      setMessage("✅ Account created successfully!");
    } catch (err: any) { setMsg("Error: " + err.message); }
    finally { setLoading(false); }
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setMessage("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const u = userCredential.user;
      const docSnap = await getDoc(doc(db, "users", u.uid));
      if (docSnap.exists()) setUser(docSnap.data() as IUserData);
      setIsLoggedIn(true);
      setMessage(`✅ Welcome back, ${docSnap.data()?.name || "User"}!`);
    } catch (err: any) { setMsg("Error: " + err.message); }
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsLoggedIn(false);
    setUser(null);
    setShowVideoFeed(false);
  };

  // 🎥 After login/signup show welcome video for 10 seconds
  useEffect(() => {
    if (isLoggedIn && user) {
      const timer = setTimeout(() => setShowVideoFeed(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, user]);

  return {
    email, setEmail, password, setPassword, confirmPassword, setConfirmPassword,
    name, setName, account, setAccount, age, setAge,
    loading, message, isLoginMode, setIsLoginMode,
    showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword,
    isLoggedIn, user, currentIndex, videos, showVideoFeed,
    videoRefs, onViewableItemsChanged, viewConfigRef,
    handleSignUp, handleSignIn, handleLogout
  };
};
