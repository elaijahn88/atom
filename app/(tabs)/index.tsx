import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Image,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/* 🔥 Firebase (YOUR firebase.js) */
import {
  auth,
  database,
  ref,
  push,
  onValue,
} from "../../firebase";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

/* =====================
   MOCK USERS (PEOPLE TAB)
===================== */
const USERS = Array.from({ length: 10 }).map((_, i) => {
  const email = `user${i + 1}@gmail.com`;
  const key = email.replace(/\./g, ",");
  return { email, key, name: `User ${i + 1}`, balance: 50000 + i * 1000 };
});

/* =====================
   APP
===================== */
export default function GreenApp() {
  /* ---------- AUTH ---------- */
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, []);

  /* ---------- AUTH GATE ---------- */
  if (!user) {
    const submit = async () => {
      try {
        if (isLogin) {
          await signInWithEmailAndPassword(auth, email, password);
        } else {
          await createUserWithEmailAndPassword(auth, email, password);
        }
      } catch (e: any) {
        Alert.alert("Auth error", e.message);
      }
    };

    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.authTitle}>
          {isLogin ? "Login" : "Create Account"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.authBtn} onPress={submit}>
          <Text style={styles.authBtnText}>
            {isLogin ? "Login" : "Register"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.authSwitch}>
            {isLogin ? "Create account" : "Already have an account?"}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  /* ---------- USER INFO ---------- */
  const MY_EMAIL = user.email;
  const MY_KEY = MY_EMAIL.replace(/\./g, ",");
  const MY_NAME = MY_EMAIL.split("@")[0];

  /* ---------- UI STATE ---------- */
  const [tab, setTab] =
    useState<"Chats" | "People" | "Status" | "Calls">("Chats");
  const [screen, setScreen] =
    useState<"inbox" | "chat">("inbox");
  const [activeChat, setActiveChat] = useState<any>(null);

  const [inbox, setInbox] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);

  /* ---------- PRESENCE ---------- */
  useEffect(() => {
    const p = ref(database, `presence/${MY_KEY}`);
    set(p, { online: true, lastSeen: Date.now() });

    set(ref(database, `users/${MY_KEY}`), {
      email: MY_EMAIL,
      name: MY_NAME,
      balance: 1000000,
    });

    USERS.forEach((u) => {
      set(ref(database, `users/${u.key}`), u);
    });

    return () => {
      set(p, { online: false, lastSeen: Date.now() });
    };
  }, []);

  /* ---------- LOAD INBOX ---------- */
  useEffect(() => {
    const chatsRef = ref(database, "chats");
    onValue(chatsRef, (snap) => {
      if (!snap.exists()) return setInbox([]);
      const rows: any[] = [];

      Object.entries(snap.val()).forEach(([cid, chat]: any) => {
        if (!cid.includes(MY_KEY)) return;
        const msgs = chat.messages || {};
        const last = Object.values(msgs).pop() as any;

        rows.push({
          id: cid,
          name: cid.replace(`${MY_KEY}_`, "").replace(`_${MY_KEY}`, ""),
          lastText: last?.text || "",
          time: last?.timestamp || 0,
        });
      });

      rows.sort((a, b) => b.time - a.time);
      setInbox(rows);
    });
  }, []);

  /* ---------- PEOPLE ---------- */
  useEffect(() => {
    setPeople(USERS.filter((u) => u.key !== MY_KEY));
  }, []);

  /* ---------- STATUS ---------- */
  useEffect(() => {
    onValue(ref(database, "statuses"), (snap) => {
      if (!snap.exists()) return setStatuses([]);
      setStatuses(
        Object.entries(snap.val()).map(([k, v]: any) => ({
          userKey: k,
          ...v,
        }))
      );
    });
  }, []);

  /* ---------- CALLS ---------- */
  useEffect(() => {
    onValue(ref(database, `calls/${MY_KEY}`), (snap) => {
      if (!snap.exists()) return setCalls([]);
      setCalls(
        Object.entries(snap.val()).map(([k, v]: any) => ({
          id: k,
          ...v,
        }))
      );
    });
  }, []);

  /* ---------- ACTIONS ---------- */
  const postStatus = () => {
    set(ref(database, `statuses/${MY_KEY}`), {
      name: MY_NAME,
      image: `https://i.pravatar.cc/300?u=${MY_KEY}`,
      timestamp: Date.now(),
    });
  };

  const makeCall = (toKey: string, type: "audio" | "video") => {
    const data = { with: toKey, type, timestamp: Date.now() };
    push(ref(database, `calls/${MY_KEY}`), data);
    push(ref(database, `calls/${toKey}`), data);
    Alert.alert("Call", `${type} call started`);
  };

  /* ---------- RENDER ---------- */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Green</Text>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {["Chats", "People", "Status", "Calls"].map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t as any)}>
            <Text style={[styles.tab, tab === t && styles.activeTab]}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "Chats" && screen === "inbox" && (
        <FlatList
          data={inbox}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                setActiveChat(item);
                setScreen("chat");
              }}
            >
              <View style={styles.chatRow}>
                <Image
                  source={{ uri: `https://i.pravatar.cc/150?u=${item.id}` }}
                  style={styles.avatar}
                />
                <View>
                  <Text style={styles.chatName}>{item.name}</Text>
                  <Text style={styles.lastMsg}>{item.lastText}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {tab === "Chats" && screen === "chat" && activeChat && (
        <ChatScreen
          chat={activeChat}
          myKey={MY_KEY}
          onBack={() => setScreen("inbox")}
        />
      )}
    </SafeAreaView>
  );
}

/* =====================
   CHAT SCREEN
===================== */
function ChatScreen({ chat, myKey, onBack }: any) {
  const PATH = `chats/${chat.id}/messages`;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    onValue(ref(database, PATH), (snap) => {
      if (!snap.exists()) return setMessages([]);
      const list = Object.entries(snap.val()).map(([id, v]: any) => ({
        id,
        ...v,
      }));
      list.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(list);

      list.forEach((m) => {
        if (m.sender !== myKey && m.status !== "seen") {
          set(ref(database, `${PATH}/${m.id}/status`), "seen");
        }
      });
    });
  }, []);

  const send = () => {
    if (!text.trim()) return;
    push(ref(database, PATH), {
      sender: myKey,
      text,
      timestamp: Date.now(),
      status: "sent",
    });
    setText("");
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity onPress={onBack}>
        <Text style={{ color: "#25D366", padding: 8 }}>← Back</Text>
      </TouchableOpacity>

      <FlatList
        data={messages}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View
            style={{
              alignSelf: item.sender === myKey ? "flex-end" : "flex-start",
              backgroundColor:
                item.sender === myKey ? "#25D366" : "#1E2C33",
              margin: 6,
              padding: 10,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "#fff" }}>{item.text}</Text>
            <Ionicons
              name={
                item.status === "seen"
                  ? "checkmark-done"
                  : "checkmark"
              }
              size={14}
              color="#fff"
            />
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.msgInput}
          value={text}
          onChangeText={setText}
          placeholder="Message"
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity onPress={send}>
          <Ionicons name="send" size={26} color="#25D366" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* =====================
   STYLES
===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121B22" },
  header: {
    backgroundColor: "#075E54",
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerTitle: { color: "#25D366", fontSize: 20, fontWeight: "bold" },

  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#075E54",
  },
  tab: { color: "#cfd8dc", padding: 10 },
  activeTab: { color: "#fff", borderBottomWidth: 2, borderColor: "#25D366" },

  chatRow: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 0.5,
    borderColor: "#2A3942",
    alignItems: "center",
  },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  chatName: { color: "#fff", fontSize: 16 },
  lastMsg: { color: "#bbb", fontSize: 13 },

  authTitle: {
    color: "#25D366",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#2A3942",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  authBtn: {
    backgroundColor: "#25D366",
    padding: 12,
    borderRadius: 8,
  },
  authBtnText: { color: "#000", textAlign: "center", fontWeight: "bold" },
  authSwitch: { color: "#25D366", textAlign: "center", marginTop: 10 },

  inputRow: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "#1E2C33",
  },
  msgInput: {
    flex: 1,
    backgroundColor: "#2A3942",
    color: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    marginRight: 8,
  },
});
