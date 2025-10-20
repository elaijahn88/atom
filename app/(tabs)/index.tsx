// =======================
// Imports
// =======================
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Video from "react-native-video";
import { auth, db } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

// =======================
// Types/Interfaces
// =======================
interface IUserData {
  email: string;
  name: string;
  account: number;
  age: number;
  createdAt: Date;
  avatar?: string;
}

const { width, height } = Dimensions.get("window");

// =======================
// Main Component
// =======================
export default function App() {
  // ===== State =====
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

  // =======================
  // Firestore Video Fetch
  // =======================
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

  // =======================
  // Validation Helpers
  // =======================
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

  // =======================
  // Auth Handlers
  // =======================
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
      setIsLoggedIn(true);
      setMessage("✅ Account created successfully!");
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

  const handleLogout = async () => {
    await signOut(auth);
    setIsLoggedIn(false);
    setUser(null);
    setShowVideoFeed(false);
  };

  // =======================
  // Post-login video timer
  // =======================
  useEffect(() => {
    if (isLoggedIn && user) {
      const timer = setTimeout(() => setShowVideoFeed(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, user]);

  // =======================
  // Render Logged-in Screens
  // =======================
  if (isLoggedIn && user) {
    if (!showVideoFeed) {
      return (
        <View style={styles.darkContainer}>
          <StatusBar hidden />
          <Video
            source={{ uri: "https://xlijah.com/soso.mp4" }}
            style={styles.fullscreenVideo}
            resizeMode="cover"
            repeat
            paused={false}
            muted={false}
          />
        </View>
      );
    }

    return (
      <View style={styles.darkContainer}>
        <StatusBar hidden />
        {videos.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#00BFFF" />
            <Text style={{ color: "#ccc", marginTop: 10 }}>Loading video...</Text>
          </View>
        ) : (
          <FlatList
            data={videos}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View style={{ width, height, backgroundColor: "black" }}>
                <Video
                  ref={(ref) => (videoRefs.current[index] = ref)}
                  source={{ uri: item.uri }}
                  style={styles.video}
                  resizeMode="cover"
                  repeat
                  paused={currentIndex !== index}
                  onError={(e) => console.warn("Video error:", e)}
                  ignoreSilentSwitch="obey"
                  playInBackground={false}
                  playWhenInactive={false}
                  progressUpdateInterval={500.0}
                />
              </View>
            )}
            pagingEnabled
            decelerationRate="fast"
            snapToAlignment="center"
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged.current}
            viewabilityConfig={viewConfigRef.current}
            windowSize={3}
            removeClippedSubviews
          />
        )}
      </View>
    );
  }

  // =======================
  // Render Login/Signup Screen
  // =======================
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

          <TouchableOpacity style={[styles.darkButton, loading && { opacity: 0.6 }]} onPress={isLoginMode ? handleSignIn : handleSignUp} disabled={loading}>
            <Text style={styles.darkButtonText}>{isLoginMode ? "Sign In" : "Sign Up"}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)}>
            <Text style={styles.switchText}>{isLoginMode ? "Don’t have an account? Sign Up" : "Already have one? Sign In"}</Text>
          </TouchableOpacity>

          {message && (
            <Text style={[styles.msg, message.includes("✅") ? { color: "#4CAF50" } : { color: "#FF5252" }]}>
              {message}
            </Text>
          )}
        </View>

        {loading && <ActivityIndicator size="large" color="#00BFFF" />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// =======================
// Reusable Input Components
// =======================
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

// =======================
// Styles
// =======================
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
  fullscreenVideo: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  video: { width: "100%", height: "100%" },
});
