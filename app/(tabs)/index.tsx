import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  FlatList,
  Dimensions,
  StatusBar,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
} from "firebase/firestore";
import Video from "react-native-video";

interface IUserData {
  email: string;
  name: string;
  account: number;
  age: number;
  createdAt: Date;
  avatar?: string;
}

const { width, height } = Dimensions.get("window");

export default function App() {
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

  const videoRefs = useRef([]);
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index);
  });
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 80 });

  // 🔄 Fetch videos from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "videos"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setVideos(data);
    });
    return () => unsubscribe();
  }, []);

  const validateEmail = (email: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const setMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 5000);
    return false;
  };

  const validateForm = (): boolean => {
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
      const user = userCredential.user;

      const userData: IUserData = {
        email: user.email || email,
        name,
        account: Number(account) || 0,
        age: Number(age) || 0,
        createdAt: new Date(),
        avatar: `https://i.pravatar.cc/150?u=${email}`,
      };

      await setDoc(doc(db, "users", user.uid), userData);
      setUser(userData);
      setMessage("✅ Account created successfully!");
      setIsLoggedIn(true);
    } catch (err: any) {
      setMsg("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setMessage("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as IUserData;
        setUser(data);
        setMessage(`✅ Welcome back, ${data.name || "User"}!`);
      }
      setIsLoggedIn(true);
    } catch (err: any) {
      setMsg("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (videoId: string, currentLikes: number) => {
    const videoRef = doc(db, "videos", videoId);
    await updateDoc(videoRef, { likes: currentLikes + 1 });
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsLoggedIn(false);
    setUser(null);
    setShowVideoFeed(false);
  };

  // 🎥 After login/signup show soso video first
  useEffect(() => {
    if (isLoggedIn && user) {
      const timer = setTimeout(() => {
        setShowVideoFeed(true);
      }, 10000); // ⏱️ 10 seconds
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, user]);

  if (isLoggedIn && user) {
    if (!showVideoFeed) {
      return (
        <View style={styles.darkContainer}>
          <StatusBar hidden />

          {/* 🔝 Avatar + Logout */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={26} color="#fff" />
            </TouchableOpacity>
            <View style={styles.userSection}>
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
              <Text style={styles.userName}>{user.name}</Text>
            </View>
          </View>

          {/* 🎥 Full-screen welcome video */}
          <Video
            source={{ uri: "https://xlijah.com/soso.mp4" }}
            style={styles.fullscreenVideo}
            resizeMode="cover"
            repeat
            paused={false}
            muted={false}
            onError={(err) => console.error("Video error:", err)}
          />

          <View style={styles.centerOverlay}>
            <Text style={styles.overlayText}>Welcome, {user.name}!</Text>
          </View>
        </View>
      );
    }

    // 🎬 Video Feed: AI + Physics + Firestore videos
    const feed = [
      {
        id: "ai1",
        title: "AI Development",
        uri: "https://xlijah.com/pics/ai_dev.mp4",
        likes: 54,
        comments: 10,
      },
      {
        id: "ph1",
        title: "Physics Inventions",
        uri: "https://xlijah.com/pics/physics_invention.mp4",
        likes: 39,
        comments: 5,
      },
      ...videos,
    ];

    return (
      <View style={styles.darkContainer}>
        <StatusBar hidden />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.userSection}>
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
            <Text style={styles.userName}>{user.name}</Text>
          </View>
        </View>

        <FlatList
          data={feed}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View style={{ width, height }}>
              <Video
                ref={(ref) => (videoRefs.current[index] = ref)}
                source={{ uri: item.uri }}
                style={styles.video}
                resizeMode="cover"
                repeat
                paused={currentIndex !== index}
              />
              <View style={styles.overlay}>
                <Text style={styles.feedTitle}>{item.title}</Text>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleLike(item.id, item.likes)}
                >
                  <Ionicons name="heart-outline" size={36} color="#fff" />
                  <Text style={styles.iconText}>{item.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                  <Ionicons name="chatbubble-outline" size={36} color="#fff" />
                  <Text style={styles.iconText}>{item.comments}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewConfigRef.current}
        />
      </View>
    );
  }

  // 🔐 Login/Signup Screen
  return (
    <KeyboardAvoidingView
      style={styles.darkContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Ionicons name="lock-closed-outline" size={52} color="#00BFFF" />
          <Text style={styles.darkTitle}>
            {isLoginMode ? "Welcome Back" : "Join the Community"}
          </Text>
          <Text style={styles.darkSubtitle}>
            {isLoginMode ? "Sign in to continue" : "Create your account below"}
          </Text>
        </View>

        <View style={styles.darkForm}>
          <DarkField label="Email" value={email} placeholder="you@example.com" onChangeText={setEmail} />
          <DarkPasswordField label="Password" value={password} onChangeText={setPassword} show={showPassword} toggle={() => setShowPassword(!showPassword)} />
          {!isLoginMode && (
            <DarkPasswordField label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} show={showConfirmPassword} toggle={() => setShowConfirmPassword(!showConfirmPassword)} />
          )}
          {!isLoginMode && (
            <>
              <DarkField label="Full Name" value={name} onChangeText={setName} />
              <DarkField label="Account" value={account} onChangeText={setAccount} keyboardType="numeric" />
              <DarkField label="Age" value={age} onChangeText={setAge} keyboardType="numeric" />
            </>
          )}
          <TouchableOpacity
            style={[styles.darkButton, loading && { opacity: 0.6 }]}
            onPress={isLoginMode ? handleSignIn : handleSignUp}
            disabled={loading}
          >
            <Text style={styles.darkButtonText}>
              {isLoginMode ? "Sign In" : "Sign Up"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)}>
            <Text style={styles.switchText}>
              {isLoginMode ? "Don’t have an account? Sign Up" : "Already have one? Sign In"}
            </Text>
          </TouchableOpacity>

          {message ? (
            <Text style={[styles.msg, message.includes("✅") ? { color: "#4CAF50" } : { color: "#FF5252" }]}>
              {message}
            </Text>
          ) : null}
        </View>

        {loading && <ActivityIndicator size="large" color="#00BFFF" />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* 🔹 Reusable Input Fields */
const DarkField = ({ label, value, onChangeText, keyboardType = "default", placeholder }: any) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={styles.darkLabel}>{label}</Text>
    <TextInput
      style={styles.darkInput}
      placeholder={placeholder}
      placeholderTextColor="#666"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
    />
  </View>
);

const DarkPasswordField = ({ label, value, onChangeText, show, toggle }: any) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={styles.darkLabel}>{label}</Text>
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <TextInput
        style={[styles.darkInput, { flex: 1 }]}
        placeholder="••••••"
        placeholderTextColor="#666"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
      />
      <TouchableOpacity onPress={toggle} style={{ padding: 4 }}>
        <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
      </TouchableOpacity>
    </View>
  </View>
);

/* 🎨 Styles */
const styles = StyleSheet.create({
  darkContainer: { flex: 1, backgroundColor: "#0a0a0a" },
  scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 20 },
  header: { alignItems: "center", marginBottom: 30 },
  darkTitle: { fontSize: 26, fontWeight: "700", color: "#fff", marginTop: 10 },
  darkSubtitle: { color: "#999", fontSize: 15, marginTop: 4 },
  darkForm: { backgroundColor: "#1a1a1a", padding: 24, borderRadius: 20 },
  darkLabel: { color: "#ccc", fontSize: 14, marginBottom: 4 },
  darkInput: { backgroundColor: "#111", color: "#fff", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 16 },
  darkButton: { backgroundColor: "#00BFFF", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
  darkButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  switchText: { color: "#00BFFF", textAlign: "center", marginTop: 16 },
  msg: { textAlign: "center", marginTop: 12, fontSize: 14 },
  topBar: { position: "absolute", top: 40, left: 0, right: 0, zIndex: 3, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, alignItems: "center" },
  userSection: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, marginLeft: 10 },
  userName: { color: "#fff", fontWeight: "600", marginLeft: 8 },
  fullscreenVideo: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1 },
  centerOverlay: { position: "absolute", top: "45%", left: 0, right: 0, alignItems: "center", zIndex: 2 },
  overlayText: { color: "#fff", fontSize: 26, fontWeight: "700", textShadowColor: "rgba(0,0,0,0.7)", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8 },
  video: { width: "100%", height: "100%" },
  overlay: { position: "absolute", right: 20, bottom: 120, alignItems: "center" },
  iconButton: { marginBottom: 25, alignItems: "center" },
  iconText: { color: "#fff", fontSize: 14, marginTop: 4 },
  feedTitle: { color: "#fff", fontSize: 18, fontWeight: "700", position: "absolute", bottom: 200, left: 20 },
});
