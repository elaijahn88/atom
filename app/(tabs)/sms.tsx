import React, { useState, useEffect } from "react";
import {
View,
Text,
TextInput,
TouchableOpacity,
StyleSheet,
FlatList,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

// ================= CONFIG =================
const API_URL = "https://api-1-lbzf.onrender.com";

// 🔥 PUT YOUR REAL FIREBASE CONFIG
const firebaseConfig = {
apiKey: "YOUR_KEY",
authDomain: "YOUR_PROJECT.firebaseapp.com",
databaseURL: "https://YOUR_PROJECT.firebaseio.com",
projectId: "YOUR_PROJECT",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ================= API =================
const api = async (endpoint, method = "GET", body) => {
const token = await AsyncStorage.getItem("accessToken");

const res = await fetch(API_URL + endpoint, {
method,
headers: {
"Content-Type": "application/json",
Authorization: token ? "Bearer ${token}" : "",
},
body: body ? JSON.stringify(body) : undefined,
});

const data = await res.json();
if (!res.ok) throw new Error(data.error);
return data;
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
const [typing, setTyping] = useState(false);

// ================= LOGIN =================
const login = async () => {
const res = await api("/login", "POST", { username, pin });

await AsyncStorage.setItem("accessToken", res.token);
await AsyncStorage.setItem("uid", res.user.uid);

setUid(res.user.uid);

loadChats();

};

// ================= LOAD CHATS =================
const loadChats = async () => {
const res = await api("/chats");
setChats(res.chats);
};

// ================= OPEN CHAT =================
const openChat = async (chat) => {
setCurrentChat(chat);

const chatRef = ref(db, "chats/" + chat.chatId + "/messages");

onValue(chatRef, (snap) => {
  const data = snap.val() || {};
  const list = Object.values(data);
  list.sort((a, b) => a.createdAt - b.createdAt);
  setMessages(list);
});

// mark seen
await api("/seen/" + chat.chatId, "POST");

};

// ================= SEND =================
const sendMessage = async () => {
if (!text) return;

await api("/send-message", "POST", {
  toUid: currentChat.with,
  text,
});

setText("");
setTyping(false);

};

// ================= TYPING =================
const sendTyping = async (value) => {
setTyping(value);

await api("/typing", "POST", {
  toUid: currentChat.with,
  typing: value,
});

};

// ================= PRESENCE =================
useEffect(() => {
if (!uid) return;

const interval = setInterval(() => {
  api("/presence", "POST");
}, 10000);

return () => clearInterval(interval);

}, [uid]);

// ================= LOGIN UI =================
if (!uid) {
return (
<View style={styles.container}>
<TextInput
placeholder="Username"
onChangeText={setUsername}
style={styles.input}
/>
<TextInput
placeholder="PIN"
secureTextEntry
onChangeText={setPin}
style={styles.input}
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
          <Text style={styles.sub}>{item.lastMessage}</Text>
        </TouchableOpacity>
      )}
    />
  </View>
);

}

// ================= CHAT SCREEN =================
return (
<View style={styles.container}>
<Text style={styles.title}>Chat</Text>

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
          <Text style={styles.seen}>✔✔</Text>
        )}
      </View>
    )}
  />

  {typing && <Text style={styles.typing}>Typing...</Text>}

  <View style={styles.row}>
    <TextInput
      value={text}
      onChangeText={(t) => {
        setText(t);
        sendTyping(true);
      }}
      style={styles.input}
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
},
send: {
backgroundColor: "#22c55e",
padding: 14,
marginLeft: 10,
borderRadius: 8,
},
text: { color: "#fff" },
title: { color: "#fff", fontSize: 20, marginBottom: 10 },
chatItem: {
padding: 12,
backgroundColor: "#1e293b",
marginTop: 10,
borderRadius: 8,
},
sub: { color: "#94a3b8" },
msg: {
padding: 10,
marginVertical: 4,
borderRadius: 10,
maxWidth: "75%",
},
me: { backgroundColor: "#3b82f6", alignSelf: "flex-end" },
them: { backgroundColor: "#1e293b", alignSelf: "flex-start" },
seen: { fontSize: 10, color: "#22c55e" },
row: { flexDirection: "row", alignItems: "center" },
typing: { color: "#94a3b8" },
});
