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
  Image,
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

export default function ChatWaveWithInbox() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [receiverProfile, setReceiverProfile] = useState<any>(null);
  const [inbox, setInbox] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // 🔹 Listen to current auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const docSnap = await getDoc(doc(db, "users", currentUser.email!));
        if (docSnap.exists()) setUser(docSnap.data());
        else setUser({ id: currentUser.uid, email: currentUser.email });
      } else setUser(null);
    });
    return () => unsub();
  }, []);

  // 🔹 Listen to inbox in real-time
  useEffect(() => {
    if (!user?.email) return;
    const userRef = doc(db, "users", user.email);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setInbox(snap.data().inbox || []);
      }
    });
    return () => unsub();
  }, [user]);

  // 🔹 Listen to messages with current receiver
  useEffect(() => {
    if (!user?.email || !receiverEmail) return;
    const chatRef = collection(db, "users", user.email, "chats", receiverEmail, "messages");
    const q = query(chatRef, orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(arr);
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    // Mark unread messages as read
    const markRead = async () => {
      const userRef = doc(db, "users", user.email);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;
      const updatedInbox = (snap.data().inbox || []).map((i: any) =>
        i.peer === receiverEmail ? { ...i, unreadCount: 0 } : i
      );
      await updateDoc(userRef, { inbox: updatedInbox });
    };
    markRead();

    return () => unsub();
  }, [user, receiverEmail]);

  // 🔹 Fetch receiver profile
  useEffect(() => {
    const fetchReceiver = async () => {
      if (!receiverEmail) return setReceiverProfile(null);
      const snap = await getDoc(doc(db, "users", receiverEmail));
      if (snap.exists()) setReceiverProfile(snap.data());
      else setReceiverProfile(null);
    };
    fetchReceiver();
  }, [receiverEmail]);

  // 🔹 Sign In
  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 🔹 Sign Up
  const handleSignUp = async () => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const u = { id: cred.user.uid, email, name, avatar: `https://i.pravatar.cc/150?u=${email}`, inbox: [] };
      await setDoc(doc(db, "users", email), u);
      setUser(u);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 🔹 Send Message
  const handleSend = async () => {
    if (!text.trim() || !receiverEmail || !user?.email) return;
    const timestamp = new Date();
    const message = {
      text,
      senderEmail: user.email,
      senderName: user.name || user.email.split("@")[0],
      senderAvatar: user.avatar,
      receiverEmail,
      timestamp,
    };

    try {
      // Add message to sender and receiver collections
      const senderRef = collection(db, "users", user.email, "chats", receiverEmail, "messages");
      const receiverRef = collection(db, "users", receiverEmail, "chats", user.email, "messages");

      await Promise.all([addDoc(senderRef, message), addDoc(receiverRef, message)]);

      // Update inbox for sender
      const senderDoc = doc(db, "users", user.email);
      await updateDoc(senderDoc, {
        inbox: arrayUnion({ peer: receiverEmail, text, timestamp, unreadCount: 0 }),
      });

      // Update inbox for receiver
      const receiverDoc = doc(db, "users", receiverEmail);
      const snap = await getDoc(receiverDoc);
      let updatedInbox = [];
      if (snap.exists()) {
        const data = snap.data();
        updatedInbox = (data.inbox || []).filter((i: any) => i.peer !== user.email);
        const existing = data.inbox?.find((i: any) => i.peer === user.email);
        const newUnread = existing ? (existing.unreadCount || 0) + 1 : 1;
        updatedInbox.push({ peer: user.email, text, timestamp, unreadCount: newUnread });
      }
      await updateDoc(receiverDoc, { inbox: updatedInbox });
    } catch (err) {
      console.error("Send message error:", err);
    }

    setText("");
  };

  if (!user) {
    return (
      <KeyboardAvoidingView style={styles.authContainer} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Text style={styles.logo}>oxygen</Text>

        {!isLogin && (
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} placeholder="Enter your name" placeholderTextColor="#aaa" value={name} onChangeText={setName} />
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor="#aaa" value={email} onChangeText={setEmail} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
        </View>

        <TouchableOpacity style={styles.btn} onPress={isLogin ? handleSignIn : handleSignUp}>
          <Text style={styles.btnText}>{isLogin ? "Login" : "Sign Up"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.toggle}>{isLogin ? "No account? Sign up" : "Already have an account? Log in"}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1B2430" barStyle="light-content" />
      {/* Inbox List */}
      <FlatList
        style={{ maxHeight: 200 }}
        data={inbox}
        keyExtractor={(item, idx) => idx.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.inboxItem} onPress={() => setReceiverEmail(item.peer)}>
            <Ionicons name="person-circle-outline" size={40} color="#007AFF" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.nameText}>{item.peer}</Text>
              <Text numberOfLines={1} style={styles.lastMessage}>{item.text}</Text>
            </View>
            {item.unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Chat Messages */}
      {receiverEmail ? (
        <>
          <View style={styles.header}>
            <Text style={styles.headerText}>{receiverProfile?.name || receiverEmail}</Text>
            <TouchableOpacity onPress={() => signOut(auth)}>
              <Ionicons name="log-out-outline" color="#fff" size={24} />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.messageRow, item.senderEmail === user.email ? { flexDirection: "row-reverse" } : {}]}>
                <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />
                <View style={[styles.messageBubble, item.senderEmail === user.email ? styles.myBubble : styles.theirBubble]}>
                  <Text style={styles.senderName}>{item.senderName}</Text>
                  <Text style={styles.messageText}>{item.text}</Text>
                </View>
              </View>
            )}
            contentContainerStyle={{ padding: 10 }}
          />

          <View style={styles.inputBar}>
            <TextInput
              style={styles.textBox}
              placeholder="Type a message..."
              placeholderTextColor="#ccc"
              value={text}
              onChangeText={setText}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Text style={{ textAlign: "center", marginTop: 20 }}>Select a chat to start messaging</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E9EEF6" },
  authContainer: { flex: 1, backgroundColor: "#1B2430", justifyContent: "center", alignItems: "center", padding: 20 },
  logo: { color: "#25D366", fontSize: 32, fontWeight: "bold", marginBottom: 25 },
  field: { width: "100%", marginBottom: 10 },
  label: { color: "#fff", marginBottom: 4, fontSize: 14 },
  input: { backgroundColor: "#fff", width: "100%", borderRadius: 8, padding: 12, fontSize: 16, color: "#000" },
  btn: { backgroundColor: "#25D366", paddingVertical: 12, paddingHorizontal: 40, borderRadius: 8, marginTop: 10 },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  toggle: { color: "#ccc", marginTop: 15, fontSize: 14 },

  header: { height: 60, backgroundColor: "#1B2430", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 15 },
  headerText: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  inboxItem: { flexDirection: "row", alignItems: "center", padding: 10, borderBottomWidth: 1, borderColor: "#ddd" },
  nameText: { fontSize: 16, fontWeight: "600" },
  lastMessage: { fontSize: 14, color: "#555" },
  badge: { backgroundColor: "#FF3B30", borderRadius: 12, minWidth: 24, height: 24, justifyContent: "center", alignItems: "center" },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600", textAlign: "center" },

  messageRow: { flexDirection: "row", alignItems: "flex-end", marginVertical: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 6 },
  messageBubble: { maxWidth: "75%", padding: 10, borderRadius: 10 },
  myBubble: { backgroundColor: "#B9FBC0", alignSelf: "flex-end" },
  theirBubble: { backgroundColor: "#fff", alignSelf: "flex-start" },
  senderName: { fontSize: 12, fontWeight: "600", marginBottom: 2, color: "#333" },
  messageText: { fontSize: 16, color: "#000" },

  inputBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 8, borderTopWidth: 1, borderColor: "#ddd" },
  textBox: { flex: 1, backgroundColor: "#f1f1f1", borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, fontSize: 16, color: "#000" },
  sendBtn: { marginLeft: 8, backgroundColor: "#25D366", borderRadius: 20, padding: 10 },
});
