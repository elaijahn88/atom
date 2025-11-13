import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { auth, db } from "../../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

export default function App() {
  const [user, setUser] = useState(null);
  const [activeScreen, setActiveScreen] = useState("sms"); // default start
  const [inbox, setInbox] = useState([]);
  const [receiverEmail, setReceiverEmail] = useState("");
  const [receiverProfile, setReceiverProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [activeGroup, setActiveGroup] = useState(null);
  const flatListRef = useRef(null);

  // 🔁 Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const ref = doc(db, "acc", "elijah", currentUser.email);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setUser(data);
          setInbox(data.inbox || []);
        } else {
          setUser({ email: currentUser.email });
          setInbox([]);
        }
      } else {
        setUser(null);
        setInbox([]);
      }
    });
    return () => unsub();
  }, []);

  // 🔹 Fetch receiver profile
  useEffect(() => {
    if (!receiverEmail) return;
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, "acc", "elijah", receiverEmail));
      if (snap.exists()) setReceiverProfile(snap.data());
      else setReceiverProfile({ email: receiverEmail });
    };
    fetchProfile();
  }, [receiverEmail]);

  // 🔹 Messages listener
  useEffect(() => {
    if (!user?.email) return;

    let chatRef;
    if (activeGroup) {
      chatRef = collection(db, "acc", "elijah", "groups", activeGroup.id, "messages");
    } else if (receiverEmail) {
      chatRef = collection(db, "acc", "elijah", user.email, "chats", receiverEmail, "messages");
    }

    if (!chatRef) return;

    const q = query(chatRef, orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(arr);
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    return () => unsub();
  }, [receiverEmail, activeGroup, user]);

  // 🔹 Send message
  const handleSend = async () => {
    if (!text.trim() || !user?.email) return;
    const timestamp = new Date();

    const message = {
      text,
      senderEmail: user.email,
      senderName: user.name || user.email.split("@")[0],
      senderAvatar: user.avatar || `https://i.pravatar.cc/150?u=${user.email}`,
      timestamp,
    };

    try {
      if (activeGroup) {
        // Group message
        const groupRef = collection(db, "acc", "elijah", "groups", activeGroup.id, "messages");
        await addDoc(groupRef, message);
      } else if (receiverEmail) {
        // Private chat
        const senderRef = collection(db, "acc", "elijah", user.email, "chats", receiverEmail, "messages");
        const receiverRef = collection(db, "acc", "elijah", receiverEmail, "chats", user.email, "messages");

        await Promise.all([addDoc(senderRef, message), addDoc(receiverRef, message)]);

        // Update inbox for sender
        const senderDoc = doc(db, "acc", "elijah", user.email);
        await updateDoc(senderDoc, {
          inbox: arrayUnion({ peer: receiverEmail, text, timestamp, unreadCount: 0 }),
        });

        // Update inbox for receiver
        const receiverDoc = doc(db, "acc", "elijah", receiverEmail);
        const snap = await getDoc(receiverDoc);
        if (snap.exists()) {
          const data = snap.data();
          const updatedInbox = (data.inbox || []).filter((i) => i.peer !== user.email);
          const existing = data.inbox?.find((i) => i.peer === user.email);
          const newUnread = existing ? (existing.unreadCount || 0) + 1 : 1;
          updatedInbox.push({ peer: user.email, text, timestamp, unreadCount: newUnread });
          await updateDoc(receiverDoc, { inbox: updatedInbox });
        }
      }
    } catch (err) {
      console.error("Send message error:", err);
    }

    setText("");
  };

  // 🔹 Navigation bar
  const NavBar = () => (
    <View style={styles.navBar}>
      <TouchableOpacity onPress={() => setActiveScreen("sms")} style={styles.navBtn}>
        <Ionicons name="chatbubbles-outline" size={24} color={activeScreen === "sms" ? "#4e8ef7" : "#999"} />
        <Text style={styles.navText}>SMS</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setActiveScreen("groups")} style={styles.navBtn}>
        <Ionicons name="people-outline" size={24} color={activeScreen === "groups" ? "#4e8ef7" : "#999"} />
        <Text style={styles.navText}>Groups</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setActiveScreen("profile")} style={styles.navBtn}>
        <Ionicons name="person-outline" size={24} color={activeScreen === "profile" ? "#4e8ef7" : "#999"} />
        <Text style={styles.navText}>Profile</Text>
      </TouchableOpacity>
    </View>
  );

  // 🔐 Auth screen
  if (activeScreen === "auth") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔐 Login / Signup</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setActiveScreen("sms")}>
          <Text style={styles.btnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 💬 SMS screen
  if (activeScreen === "sms") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>💬 SMS</Text>
        {inbox.length === 0 ? (
          <Text style={styles.text}>No conversations yet.</Text>
        ) : (
          <FlatList
            data={inbox}
            keyExtractor={(item) => item.peer}
            style={{ width: "100%" }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.inboxItem}
                onPress={() => {
                  setReceiverEmail(item.peer);
                  setActiveGroup(null);
                  setActiveScreen("chat");
                }}
              >
                <Text style={styles.peerText}>{item.peer}</Text>
                <Text style={styles.lastMessage}>{item.text}</Text>
                {item.unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        )}
        {user && (
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "red", marginTop: 10 }]} onPress={() => signOut(auth)}>
            <Text style={styles.btnText}>Logout</Text>
          </TouchableOpacity>
        )}
        <NavBar />
      </View>
    );
  }

  // 💬 Chat screen (private or group)
  if (activeScreen === "chat") {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.chatHeader}>
          <Text style={styles.title}>{activeGroup ? activeGroup.name : receiverProfile?.name || receiverEmail}</Text>
          <TouchableOpacity
            onPress={() => {
              setActiveGroup(null);
              setReceiverEmail("");
              setActiveScreen(activeGroup ? "groups" : "sms");
            }}
          >
            <Ionicons name="arrow-back-outline" size={28} color="#000" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={{ width: "100%" }}
          renderItem={({ item }) => (
            <View style={[styles.messageRow, item.senderEmail === user.email ? { flexDirection: "row-reverse" } : {}]}>
              <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />
              <View style={[styles.messageBubble, item.senderEmail === user.email ? styles.myBubble : styles.theirBubble]}>
                <Text style={styles.senderName}>{item.senderName}</Text>
                <Text style={styles.messageText}>{item.text}</Text>
                <Text style={styles.timestamp}>{new Date(item.timestamp.seconds ? item.timestamp.seconds * 1000 : item.timestamp).toLocaleTimeString()}</Text>
              </View>
            </View>
          )}
          contentContainerStyle={{ padding: 10 }}
        />

        <View style={styles.inputBar}>
          <TextInput style={styles.textBox} placeholder="Type a message..." value={text} onChangeText={setText} />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <NavBar />
      </KeyboardAvoidingView>
    );
  }

  // 👥 Groups screen
  if (activeScreen === "groups") {
    const sampleGroups = [
      { id: "g1", name: "React Devs", lastMessage: "Meeting at 5 PM", unreadCount: 2 },
      { id: "g2", name: "Football Fans", lastMessage: "Match highlights uploaded", unreadCount: 0 },
      { id: "g3", name: "Music Lovers", lastMessage: "Check new playlist", unreadCount: 1 },
    ];

    return (
      <View style={styles.container}>
        <Text style={styles.title}>👥 Groups</Text>
        <FlatList
          data={sampleGroups}
          keyExtractor={(item) => item.id}
          style={{ width: "100%" }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.inboxItem}
              onPress={() => {
                setActiveGroup(item);
                setReceiverEmail("");
                setActiveScreen("chat");
              }}
            >
              <Text style={styles.peerText}>{item.name}</Text>
              <Text style={styles.lastMessage}>{item.lastMessage}</Text>
              {item.unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
        <NavBar />
      </View>
    );
  }

  // 👤 Profile screen
  if (activeScreen === "profile") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>👤 Profile</Text>
        {user ? (
          <>
            <Text style={styles.text}>Name: {user.name || "N/A"}</Text>
            <Text style={styles.text}>Email: {user.email}</Text>
            <Text style={styles.text}>
              Joined: {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : "N/A"}
            </Text>
          </>
        ) : (
          <Text style={styles.text}>You are not logged in</Text>
        )}
        <NavBar />
      </View>
    );
  }

  return null;
}

// 🎨 Styles
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80, width: "100%" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  text: { fontSize: 16, color: "#444", marginBottom: 5, paddingHorizontal: 15 },
  primaryBtn: { backgroundColor: "#4e8ef7", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginTop: 10 },
  btnText: { color: "#fff", fontWeight: "600" },
  navBar: { position: "absolute", bottom: 0, flexDirection: "row", width: "100%", justifyContent: "space-around", paddingVertical: 10, borderTopWidth: 1, borderColor: "#ddd", backgroundColor: "#f8f8f8" },
  navBtn: { alignItems: "center" },
  navText: { fontSize: 12, color: "#666", marginTop: 3 },
  inboxItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#ddd", backgroundColor: "#fff" },
  peerText: { fontWeight: "600", fontSize: 16 },
  lastMessage: { fontSize: 14, color: "#555", flex: 1, marginLeft: 10 },
  badge: { backgroundColor: "#FF3B30", borderRadius: 12, minWidth: 24, height: 24, justifyContent: "center", alignItems: "center", paddingHorizontal: 5, marginLeft: 10 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  messageRow: { flexDirection: "row", alignItems: "flex-end", marginVertical: 5, paddingHorizontal: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 6 },
  messageBubble: { maxWidth: "70%", padding: 10, borderRadius: 10 },
  myBubble: { backgroundColor: "#B9FBC0", alignSelf: "flex-end" },
  theirBubble: { backgroundColor: "#fff", alignSelf: "flex-start" },
  senderName: { fontSize: 12, fontWeight: "600", marginBottom: 2, color: "#333" },
  messageText: { fontSize: 16, color: "#000" },
  timestamp: { fontSize: 10, color: "#888", alignSelf: "flex-end", marginTop: 2 },
  chatHeader: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderColor: "#ddd" },
  inputBar: { flexDirection: "row", alignItems: "center", padding: 8, width: "100%", borderTopWidth: 1, borderColor: "#ddd" },
  textBox: { flex: 1, backgroundColor: "#f1f1f1", borderRadius: 25, paddingHorizontal: 15, paddingVertical: 8, fontSize: 16 },
  sendBtn: { marginLeft: 8, backgroundColor: "#25D366", borderRadius: 25, padding: 12 },
});
