import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

const { width } = Dimensions.get("window");

export default function WhatsAppLikeApp() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const flatListRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists()) setUser(docSnap.data());
        else setUser({ id: currentUser.uid, email: currentUser.email });
      } else setUser(null);
    });
    return () => unsub();
  }, []);

  // Real-time listener for current chat (based on user & receiver)
  useEffect(() => {
    if (!user || !receiverEmail) return;
    const chatId = [user.email, receiverEmail].sort().join("_");
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(arr);
      flatListRef.current?.scrollToEnd({ animated: true });
    });
    return () => unsub();
  }, [user, receiverEmail]);

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSignUp = async () => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const u = { id: cred.user.uid, email, name, avatar: `https://i.pravatar.cc/150?u=${email}` };
      await setDoc(doc(db, "users", cred.user.uid), u);
      setUser(u);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !receiverEmail) return;
    const chatId = [user.email, receiverEmail].sort().join("_");
    const message = {
      text,
      senderId: user.id,
      senderEmail: user.email,
      receiverEmail,
      timestamp: new Date(),
    };

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), message);
      // Add message reference to both sender and receiver message boxes
      const senderRef = doc(db, "users", user.id);
      const receiverRef = doc(db, "users", receiverEmail);
      await Promise.all([
        updateDoc(senderRef, { inbox: arrayUnion({ ...message }) }),
        updateDoc(receiverRef, { inbox: arrayUnion({ ...message }) }),
      ]);
    } catch (err) {
      console.error("Send message error:", err);
    }
    setText("");
  };

  if (!user) {
    return (
      <KeyboardAvoidingView style={styles.authContainer} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Text style={styles.logo}>WhatsApp Clone</Text>
        {!isLogin && (
          <TextInput placeholder="Full Name" style={styles.input} value={name} onChangeText={setName} />
        )}
        <TextInput placeholder="Email" style={styles.input} value={email} onChangeText={setEmail} />
        <TextInput placeholder="Password" secureTextEntry style={styles.input} value={password} onChangeText={setPassword} />
        <TouchableOpacity style={styles.btn} onPress={isLogin ? handleSignIn : handleSignUp}>
          <Text style={styles.btnText}>{isLogin ? "Login" : "Sign Up"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.toggle}>{isLogin ? "No account? Sign up" : "Have an account? Login"}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerText}>Chat</Text>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <Ionicons name="log-out-outline" color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.receiverBar}>
        <TextInput
          placeholder="Enter receiver email"
          placeholderTextColor="#ccc"
          style={styles.receiverInput}
          value={receiverEmail}
          onChangeText={setReceiverEmail}
        />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageBubble,
              item.senderEmail === user.email ? styles.myBubble : styles.theirBubble,
            ]}
          >
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 10 }}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textBox}
          placeholder="Type a message"
          placeholderTextColor="#ccc"
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ECE5DD" },
  header: {
    height: 60,
    backgroundColor: "#075E54",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
  },
  headerText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  receiverBar: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  receiverInput: {
    flex: 1,
    backgroundColor: "#f1f1f1",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
    color: "#000",
  },
  authContainer: {
    flex: 1,
    backgroundColor: "#128C7E",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  logo: { color: "#fff", fontSize: 26, fontWeight: "bold", marginBottom: 20 },
  input: {
    backgroundColor: "#fff",
    width: "100%",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  btn: {
    backgroundColor: "#25D366",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 5,
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  toggle: { color: "#fff", marginTop: 15 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 8,
  },
  textBox: {
    flex: 1,
    backgroundColor: "#f1f1f1",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
    color: "#000",
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: "#25D366",
    borderRadius: 20,
    padding: 10,
  },
  messageBubble: {
    maxWidth: "75%",
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
  },
  myBubble: {
    backgroundColor: "#DCF8C6",
    alignSelf: "flex-end",
  },
  theirBubble: {
    backgroundColor: "#fff",
    alignSelf: "flex-start",
  },
  messageText: { fontSize: 16, color: "#000" },
});
