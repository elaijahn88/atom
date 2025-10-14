import React, { useState, useRef } from "react";
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
import { auth, db } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import Video from "react-native-video";

interface IUserData {
  email: string;
  name: string;
  account: number;
  age: number;
  createdAt: Date;
}

const { width, height } = Dimensions.get("window");

export default function App() {
  // 🧩 Auth State
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

  // 🧩 Video Feed State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRefs = useRef([]);

  // Sample video URLs
  const videos = [
    {
      id: "1",
      uri: "https://xlijah.com/soso.mp4",
      likes: 2100,
      comments: 120,
    },
    {
      id: "2",
      uri: "https://xlijah.com/soso.mp4",
      likes: 980,
      comments: 45,
    },
    {
      id: "3",
      uri: "https://xlijah/soso.mp4",
      likes: 5400,
      comments: 322,
    },
  ];

  // Validation
  const validateEmail = (email: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateForm = (): boolean => {
    if (!email.trim()) return setMsg("Email is required");
    if (!validateEmail(email)) return setMsg("Enter a valid email");
    if (!password.trim()) return setMsg("Password is required");
    if (!isLoginMode) {
      if (!name.trim()) return setMsg("Full name is required");
      if (password !== confirmPassword) return setMsg("Passwords do not match");
      if (isNaN(Number(age)) || Number(age) <= 0) return setMsg("Enter a valid age");
    }
    return true;
  };

  const setMsg = (msg: string) => {
    setMessage(msg);
    return false;
  };

  // Sign Up
  const handleSignUp = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setMessage("");

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const userData: IUserData = {
        email: user.email || email,
        name,
        account: Number(account) || 0,
        age: Number(age) || 0,
        createdAt: new Date(),
      };

      await setDoc(doc(db, "users", user.uid), userData);

      setMessage("✅ Account created successfully!");
      setIsLoginMode(true);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setName("");
      setAccount("");
      setAge("");
      setIsLoggedIn(true); // Navigate to video feed
    } catch (err: any) {
      console.error(err);
      setMessage("Error creating account: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sign In
  const handleSignIn = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setMessage("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as IUserData;
        setMessage(`✅ Welcome back, ${data.name || "User"}!`);
      } else {
        setMessage("✅ Signed in, but no profile data found.");
      }
      setIsLoggedIn(true); // Navigate to video feed
    } catch (err: any) {
      console.error(err);
      setMessage("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Video Feed Helpers
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  });

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 80 });

  // ✅ Render
  if (isLoggedIn) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <FlatList
          data={videos}
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
                onError={(e) => console.log("Video error:", e)}
              />
              <View style={styles.overlay}>
                <TouchableOpacity style={styles.iconButton}>
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

  // 🔐 Login/Register Screen
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed" size={48} color="#007AFF" />
          </View>
          <Text style={styles.welcomeTitle}>
            {isLoginMode ? "Welcome Back" : "Create Account"}
          </Text>
          <Text style={styles.welcomeSubtitle}>
            {isLoginMode
              ? "Sign in to continue"
              : "Fill in your details to register"}
          </Text>
        </View>

        <View style={styles.formContainer}>
          <Field
            label="Email Address"
            value={email}
            placeholder="you@example.com"
            keyboardType="email-address"
            onChangeText={(t) => {
              setEmail(t);
              setMessage("");
            }}
          />

          <PasswordField
            label="Password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setMessage("");
            }}
            show={showPassword}
            toggle={() => setShowPassword(!showPassword)}
          />

          {!isLoginMode && (
            <PasswordField
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                setMessage("");
              }}
              show={showConfirmPassword}
              toggle={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          )}

          {!isLoginMode && (
            <Field
              label="Full Name"
              value={name}
              placeholder="John Doe"
              onChangeText={(t) => {
                setName(t);
                setMessage("");
              }}
            />
          )}

          {!isLoginMode && (
            <>
              <Field
                label="Account Number"
                value={account}
                placeholder="123456"
                keyboardType="numeric"
                onChangeText={(t) => setAccount(t)}
              />
              <Field
                label="Age"
                value={age}
                placeholder="25"
                keyboardType="numeric"
                onChangeText={(t) => setAge(t)}
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={isLoginMode ? handleSignIn : handleSignUp}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {isLoginMode ? "Sign In" : "Create Account"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchModeButton}
            onPress={() => {
              setIsLoginMode(!isLoginMode);
              setMessage("");
            }}
          >
            <Text style={styles.switchModeText}>
              {isLoginMode
                ? "Don't have an account? Sign Up"
                : "Already have an account? Sign In"}
            </Text>
          </TouchableOpacity>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          )}

          {message ? (
            <View
              style={[
                styles.messageContainer,
                message.includes("✅") ? styles.successMessage : styles.errorMessage,
              ]}
            >
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* Reusable Input Fields */
const Field = ({ label, value, placeholder, onChangeText, keyboardType = "default" }: any) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#999"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
    />
  </View>
);

const PasswordField = ({ label, value, onChangeText, show, toggle }: any) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <TextInput
        style={[styles.input, { flex: 1 }]}
        placeholder="Enter your password"
        placeholderTextColor="#999"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
      />
      <TouchableOpacity style={styles.passwordToggle} onPress={toggle}>
        <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
      </TouchableOpacity>
    </View>
  </View>
);

/* Styles */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 20 },
  header: { alignItems: "center", marginBottom: 30 },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  welcomeTitle: { fontSize: 28, fontWeight: "700", color: "#1a1a1a", textAlign: "center", marginBottom: 8 },
  welcomeSubtitle: { fontSize: 16, color: "#6b7280", textAlign: "center", marginBottom: 20 },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  inputWrapper: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 4 },
  input: { flex: 1, fontSize: 16, color: "#1a1a1a", borderBottomWidth: 1, borderColor: "#ddd", paddingVertical: 6 },
  passwordToggle: { padding: 4 },
  submitButton: { backgroundColor: "#007AFF", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  switchModeButton: { paddingVertical: 12, alignItems: "center" },
  switchModeText: { color: "#007AFF", fontSize: 14, fontWeight: "500" },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.8)", justifyContent: "center", alignItems: "center" },
  messageContainer: { padding: 12, borderRadius: 8, marginTop: 16 },
  successMessage: { backgroundColor: "#d1fae5", borderColor: "#a7f3d0" },
  errorMessage: { backgroundColor: "#fee2e2", borderColor: "#fecaca" },
  messageText: { fontSize: 14, textAlign: "center" },
  video: { width: "100%", height: "100%" },
  overlay: { position: "absolute", right: 20, bottom: 120, alignItems: "center" },
  iconButton: { marginBottom: 25, alignItems: "center" },
  iconText: { color: "#fff", fontSize: 14, marginTop: 4 },
});
