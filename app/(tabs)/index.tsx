// App.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Video from "react-native-video";
import {
  auth,
  db
} from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";

const { width, height } = Dimensions.get("window");

interface IUserData {
  email: string;
  name: string;
  account: number;
  age: number;
  createdAt: Date;
  avatar?: string;
}

interface IMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
}

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

  // Video feed
  const [videos, setVideos] = useState<any[]>([]);
  const [showVideoFeed, setShowVideoFeed] = useState(false);
  const videoRefs = useRef<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Chat
  const [chatGroups, setChatGroups] = useState<{ id: string; name: string }[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<IMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const chatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index);
  });
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 80 });

  // 🔹 Persistent login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUser(docSnap.data() as IUserData);
          setIsLoggedIn(true);
        }
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 🔄 Fetch video ads
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "videos", "ads"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data?.soso) setVideos([{ id: "ads", uri: data.soso }]);
      }
    });
    return () => unsubscribe();
  }, []);

  // 🔹 Video auto-play
  useEffect(() => {
    if (videos.length > 0) setCurrentIndex(0);
  }, [videos]);

  // 🔹 Show welcome video for 10s
  useEffect(() => {
    if (isLoggedIn && user) {
      const timer = setTimeout(() => setShowVideoFeed(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, user]);

  // 🔹 Fetch chat groups the user belongs to
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "chats"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groups = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(chat => chat.members?.includes(auth.currentUser?.uid));
      setChatGroups(groups as any);
      if (!activeChat && groups.length > 0) setActiveChat(groups[0].id);
    });
    return () => unsubscribe();
  }, [user]);

  // 🔹 Listen to messages in active chat
  useEffect(() => {
    if (!activeChat) return;
    const messagesRef = collection(db, "chats", activeChat, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IMessage));
      setChatMessages(msgs);
      chatListRef.current?.scrollToEnd({ animated: true });
    });
    return () => unsubscribe();
  }, [activeChat]);

  // 🔹 Auth helpers
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const setMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(""), 5000); return false; };
  const validateForm = (): boolean => {
    if (!email.trim()) return setMsg("Email required");
    if (!validateEmail(email)) return setMsg("Invalid email");
    if (!password.trim()) return setMsg("Password required");
    if (!isLoginMode) {
      if (!name.trim()) return setMsg("Full name required");
      if (password !== confirmPassword) return setMsg("Passwords do not match");
      if (isNaN(Number(age)) || Number(age) <= 0) return setMsg("Enter valid age");
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    setLoading(true); setMessage("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userObj = userCredential.user;
      const userData: IUserData = {
        email: userObj.email || email,
        name,
        account: Number(account) || 0,
        age: Number(age) || 0,
        createdAt: new Date(),
        avatar: `https://i.pravatar.cc/150?u=${email}`,
      };
      await setDoc(doc(db, "users", userObj.uid), userData);
      setUser(userData); setIsLoggedIn(true); setMessage("✅ Account created!");
    } catch (err: any) { setMsg("Error: " + err.message); } finally { setLoading(false); }
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;
    setLoading(true); setMessage("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userObj = userCredential.user;
      const docRef = doc(db, "users", userObj.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) { setUser(docSnap.data() as IUserData); }
      setIsLoggedIn(true);
    } catch (err: any) { setMsg("Error: " + err.message); } finally { setLoading(false); }
  };

  const handleLogout = async () => { await signOut(auth); setIsLoggedIn(false); setUser(null); setShowVideoFeed(false); };

  const sendChatMessage = async () => {
    if (!chatText.trim() || !activeChat) return;
    await addDoc(collection(db, "chats", activeChat, "messages"), {
      text: chatText,
      senderId: auth.currentUser?.uid,
      timestamp: new Date(),
    });
    setChatText("");
  };

  // 🔹 Logged-in screens
  if (isLoggedIn && user) {
    // Welcome video
    if (!showVideoFeed) {
      return (
        <View style={styles.darkContainer}>
          <StatusBar hidden />
          <Video source={{ uri: "https://xlijah.com/soso.mp4" }} style={styles.fullscreenVideo} resizeMode="cover" repeat paused={false} muted={false} />
        </View>
      );
    }

    // Video feed + Chat
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
            keyExtractor={item => item.id}
            renderItem={({ item, index }) => (
              <View style={{ width, height, backgroundColor: "black" }}>
                <Video ref={ref => (videoRefs.current[index] = ref)} source={{ uri: item.uri }} style={styles.video} resizeMode="cover" repeat paused={currentIndex !== index} ignoreSilentSwitch="obey" />
              </View>
            )}
            pagingEnabled
            decelerationRate="fast"
            snapToAlignment="center"
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged.current}
            viewabilityConfig={viewConfigRef.current}
          />
        )}

        {/* Chat Overlay */}
        <View style={styles.chatContainer}>
          {/* Group Switch */}
          <FlatList horizontal data={chatGroups} keyExtractor={item => item.id} renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setActiveChat(item.id)} style={[styles.groupBtn, activeChat === item.id && { backgroundColor: "#00BFFF" }]}>
              <Text style={{ color: "#fff" }}>{item.name}</Text>
            </TouchableOpacity>
          )} />

          {/* Messages */}
          <FlatList ref={chatListRef} style={{ flex: 1, marginTop: 8 }} data={chatMessages} keyExtractor={item => item.id} renderItem={({ item }) => (
            <View style={[styles.messageContainer, item.senderId === auth.currentUser?.uid && styles.myMessage]}>
              <Text style={styles.messageText}>{item.text}</Text>
            </View>
          )} />

          {/* Input */}
          <View style={styles.inputRow}>
            <TextInput style={styles.input} value={chatText} onChangeText={setChatText} placeholder="Type a message..." placeholderTextColor="#888" />
            <TouchableOpacity style={styles.sendBtn} onPress={sendChatMessage}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // 🔐 Login/Signup screen
  return (
    <KeyboardAvoidingView style={styles.darkContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }}>
        <View style={{ alignItems: "center", marginBottom: 30 }}>
          <Ionicons name="lock-closed-outline" size={52} color="#00BFFF" />
          <Text style={{ fontSize: 26, fontWeight: "700", color: "#fff", marginTop: 10 }}>{isLoginMode ? "Welcome Back" : "Join the Community"}</Text>
          <Text style={{ color: "#999", fontSize: 15, marginTop: 4 }}>{isLoginMode ? "Sign in to continue" : "Create your account below"}</Text>
        </View>

        <View style={{ backgroundColor: "#1a1a1a", padding: 24, borderRadius: 20 }}>
          <DarkField label="Email" value={email} placeholder="you@example.com" onChangeText={setEmail} />
          <DarkPasswordField label="Password" value={password} onChangeText={setPassword} show={showPassword} toggle={() => setShowPassword(!showPassword)} />
          {!isLoginMode && <DarkPasswordField label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} show={showConfirmPassword} toggle={() => setShowConfirmPassword(!showConfirmPassword)} />}
          {!isLoginMode && <>
            <DarkField label="Full Name" value={name} onChangeText={setName} />
            <DarkField label="Account" value={account} onChangeText={setAccount} keyboardType="numeric" />
            <DarkField label="Age" value={age} onChangeText={setAge} keyboardType="numeric" />
          </>}
          <TouchableOpacity style={[{ backgroundColor: "#00BFFF", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 10 }, loading && { opacity: 0.6 }]} onPress={isLoginMode ? handleSignIn : handleSignUp} disabled={loading}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{isLoginMode ? "Sign In" : "Sign Up"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)}>
            <Text style={{ color: "#00BFFF", textAlign: "center", marginTop: 16 }}>{isLoginMode ? "Don’t have an account? Sign Up" : "Already have one? Sign In"}</Text>
          </TouchableOpacity>
          {message ? <Text style={{ textAlign: "center", marginTop: 12, fontSize: 14, color: message.includes("✅") ? "#4CAF50" : "#FF5252" }}>{message}</Text> : null}
        </View>

        {loading && <ActivityIndicator size="large" color="#00BFFF" />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// 🔹 Reusable Input Fields
const DarkField = ({ label, value, onChangeText, keyboardType = "default", placeholder }: any) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={{ color: "#ccc", fontSize: 14, marginBottom: 4 }}>{label}</Text>
    <TextInput style={{ backgroundColor: "#111", color: "#fff", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 16 }} placeholder={placeholder} placeholderTextColor="#666" value={value} onChangeText={onChangeText} keyboardType={keyboardType} />
  </View>
);

const DarkPasswordField = ({ label, value, onChangeText, show, toggle }: any) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={{ color: "#ccc", fontSize: 14, marginBottom: 4 }}>{label}</Text>
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <TextInput style={{ flex: 1, backgroundColor: "#111", color: "#fff", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 16 }} placeholder="••••••" placeholderTextColor="#666" value={value} onChangeText={onChangeText} secureTextEntry={!show} />
      <TouchableOpacity onPress={toggle} style={{ padding: 4 }}>
        <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  darkContainer: { flex: 1, backgroundColor: "#0a0a0a" },
  fullscreenVideo: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  video: { width: "100%", height: "100%" },
  chatContainer: { position: "absolute", bottom: 0, left: 0, right: 0, height: 300, backgroundColor: "#111", borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 8 },
  chatHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderBottomWidth: 1, borderColor: "#333" },
  inputRow: { flexDirection: "row", padding: 8, borderTopWidth: 1, borderColor: "#333", backgroundColor: "#111" },
  input: { flex: 1, backgroundColor: "#222", borderRadius: 20, paddingHorizontal: 14, color: "#fff", fontSize: 16 },
  sendBtn: { marginLeft: 8, backgroundColor: "#00BFFF", borderRadius: 20, padding: 12, alignItems: "center", justifyContent: "center" },
  messageContainer: { maxWidth: "70%", padding: 10, borderRadius: 12, marginVertical: 4, backgroundColor: "#333" },
  myMessage: { backgroundColor: "#00BFFF", alignSelf: "flex-end" },
  messageText: { color: "#fff", fontSize: 16 },
  groupBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#222", borderRadius: 20, marginRight: 8 },
});
