import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import database from "@react-native-firebase/database"; // npm install @react-native-firebase/app @react-native-firebase/database

// ================= CONFIG =================
const API_URL = "https://sms-fn0s.onrender.com";

// ================= API =================
const api = async (endpoint, method = "GET", body) => {
  try {
    const token = await AsyncStorage.getItem("accessToken");

    const res = await fetch(API_URL + endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }

    return data;
  } catch (e) {
    console.error("API Error:", e.message);
    throw e;
  }
};

// ================= APP =================
export default function App() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");

  const [uid, setUid] = useState("");
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  const messageListenerRef = useRef(null);
  const typingListenerRef = useRef(null);

  // ================= LOGIN =================
  const login = async () => {
    if (!username || !pin) {
      Alert.alert("Error", "Please enter username and PIN");
      return;
    }

    try {
      const res = await api("/login", "POST", { username, pin });

      await AsyncStorage.setItem("accessToken", res.token);
      await AsyncStorage.setItem("uid", res.user.uid);

      setUid(res.user.uid);
      setUsername("");
      setPin("");

      loadChats();
    } catch (e) {
      Alert.alert("Login Failed", e.message);
    }
  };

  // ================= LOAD CHATS =================
  const loadChats = async () => {
    try {
      const res = await api("/chats");
      setChats(res.chats || []);
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  // ================= OPEN CHAT (with realtime listeners) =================
  const openChat = async (chat) => {
    setCurrentChat(chat);
    setMessages([]);
    setOtherTyping(false);

    const chatId = chat.chatId;

    // Cleanup previous listeners
    if (messageListenerRef.current) {
      messageListenerRef.current.off();
    }
    if (typingListenerRef.current) {
      typingListenerRef.current.off();
    }

    // Messages listener
    const messagesRef = database().ref(`chats/${chatId}/messages`);
    messageListenerRef.current = messagesRef.on("value", (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.values(data);
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setMessages(list);
    });

    // Typing listener (for the other person)
    const typingRef = database().ref(`typing/${chatId}`);
    typingListenerRef.current = typingRef.on("value", (snapshot) => {
      const data = snapshot.val() || {};
      const otherUid = chat.with;

      if (data[otherUid] && data[otherUid].typing) {
        const isRecent = Date.now() - (data[otherUid].updatedAt || 0) < 5000;
        setOtherTyping(isRecent);
      } else {
        setOtherTyping(false);
      }
    });

    // Mark messages as seen
    try {
      await api(`/seen/${chatId}`, "POST");
    } catch (e) {
      console.log("Seen error:", e.message);
    }
  };

  // Cleanup listeners when component unmounts or chat changes
  useEffect(() => {
    return () => {
      if (messageListenerRef.current) messageListenerRef.current.off();
      if (typingListenerRef.current) typingListenerRef.current.off();
    };
  }, []);

  // ================= SEND MESSAGE =================
  const sendMessage = async () => {
    if (!text.trim() || !currentChat) return;

    try {
      await api("/send-message", "POST", {
        toUid: currentChat.with,
        text: text.trim(),
      });

      setText("");
      setIsTyping(false);
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  // ================= TYPING =================
  const handleTyping = async (value) => {
    setIsTyping(value);
    setText(value ? text : ""); // keep text if stopping

    if (!currentChat) return;

    try {
      await api("/typing", "POST", {
        toUid: currentChat.with,
        typing: value,
      });
    } catch (e) {
      // silent fail for typing
    }
  };

  // ================= PRESENCE =================
  useEffect(() => {
    if (!uid) return;

    const interval = setInterval(() => {
      api("/presence", "POST").catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, [uid]);

  // ================= LOGIN UI =================
  if (!uid) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>

        <TextInput
          placeholder="Username"
          placeholderTextColor="#94a3b8"
          onChangeText={setUsername}
          style={styles.input}
          autoCapitalize="none"
        />

        <TextInput
          placeholder="PIN"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          onChangeText={setPin}
          style={styles.input}
          keyboardType="numeric"
        />

        <TouchableOpacity onPress={login} style={styles.btn}>
          <Text style={styles.text}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ================= CHAT LIST =================
  if (!currentChat) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Chats</Text>

        <FlatList
          data={chats}
          keyExtractor={(item) => item.chatId}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chatItem}
              onPress={() => openChat(item)}
            >
              <Text style={styles.text}>{item.with}</Text>
              <Text style={styles.sub}>
                {item.lastMessage || "No messages yet"}
              </Text>
            </TouchableOpacity>
          )}
        />

        <TouchableOpacity
          onPress={loadChats}
          style={[styles.btn, { marginTop: 20 }]}
        >
          <Text style={styles.text}>Refresh Chats</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ================= CHAT SCREEN =================
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentChat(null)}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Chat with {currentChat.with}</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        renderItem={({ item }) => (
          <View
            style={[
              styles.msg,
              item.from === uid ? styles.me : styles.them,
            ]}
          >
            <Text style={styles.text}>{item.text}</Text>
            {item.seen && item.from === uid && (
              <Text style={styles.seen}>✔✔ Seen</Text>
            )}
          </View>
        )}
      />

      {otherTyping && <Text style={styles.typing}>Typing...</Text>}

      <View style={styles.row}>
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            handleTyping(!!t);
          }}
          placeholder="Type a message..."
          placeholderTextColor="#94a3b8"
          style={[styles.input, { flex: 1 }]}
          multiline
        />

        <TouchableOpacity onPress={sendMessage} style={styles.send}>
          <Text style={styles.text}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#0f172a" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  back: { color: "#3b82f6", fontSize: 18, marginRight: 10 },
  input: {
    backgroundColor: "#1e293b",
    padding: 12,
    marginTop: 10,
    color: "#fff",
    borderRadius: 8,
  },
  btn: {
    backgroundColor: "#3b82f6",
    padding: 14,
    marginTop: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  send: {
    backgroundColor: "#22c55e",
    padding: 14,
    marginLeft: 10,
    borderRadius: 8,
  },
  text: { color: "#fff" },
  title: { color: "#fff", fontSize: 20 },
  chatItem: {
    padding: 12,
    backgroundColor: "#1e293b",
    marginTop: 10,
    borderRadius: 8,
  },
  sub: { color: "#94a3b8", marginTop: 4 },
  msg: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 12,
    maxWidth: "80%",
  },
  me: { backgroundColor: "#3b82f6", alignSelf: "flex-end" },
  them: { backgroundColor: "#1e293b", alignSelf: "flex-start" },
  seen: { fontSize: 10, color: "#22c55e", alignSelf: "flex-end", marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  typing: { color: "#94a3b8", marginBottom: 8, fontStyle: "italic" },
});
