import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Image,
  ImageBackground,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ref, onValue, push, set } from "firebase/database";
import { database } from "../../firebase";

/* =====================
   USER
===================== */
const MY_EMAIL = "elajahn8@gmail.com";
const MY_KEY = MY_EMAIL.replace(/\./g, ",");

/* =====================
   APP
===================== */
export default function GreenApp() {
  const [tab, setTab] = useState<"Chats" | "Status" | "Calls" | "People">("Chats");
  const [screen, setScreen] = useState<"inbox" | "chat">("inbox");
  const [activeChat, setActiveChat] = useState<any>(null);

  const [inbox, setInbox] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [myName, setMyName] = useState("Nabimanya elijah");

  /* Presence */
  useEffect(() => {
    const p = ref(database, `presence/${MY_KEY}`);
    set(p, { online: true, lastSeen: Date.now() });
    return () => set(p, { online: false, lastSeen: Date.now() });
  }, []);

  /* Register user */
  useEffect(() => {
    const userRef = ref(database, `users/${MY_KEY}`);
    set(userRef, { email: MY_EMAIL, name: myName });
  }, []);

  /* Load inbox */
  useEffect(() => {
    const chatsRef = ref(database, "chats");
    onValue(chatsRef, (snap) => {
      if (!snap.exists()) return;
      const rows: any[] = [];
      Object.entries(snap.val()).forEach(([cid, chat]: any) => {
        if (!cid.includes(MY_KEY)) return;
        const otherKey = cid.replace(`${MY_KEY}_`, "").replace(`_${MY_KEY}`, "");
        const msgs = chat.messages || {};
        const last = Object.values(msgs).pop() as any;

        const otherUserRef = ref(database, `users/${otherKey}`);
        let otherName = otherKey;
        onValue(otherUserRef, (s) => {
          if (s.exists()) otherName = s.val().name;
        });

        rows.push({
          id: cid,
          name: otherName,
          lastText: last?.text || "",
          time: last?.timestamp || 0,
        });
      });
      rows.sort((a, b) => b.time - a.time);
      setInbox(rows);
    });
  }, []);

  /* Load people */
  useEffect(() => {
    const usersRef = ref(database, "users");
    onValue(usersRef, (snap) => {
      if (!snap.exists()) return;
      const list: any[] = [];
      Object.entries(snap.val()).forEach(([key, val]: any) => {
        if (key !== MY_KEY) list.push({ key, ...val });
      });
      setPeople(list);
    });
  }, []);

  /* Load statuses */
  useEffect(() => {
    const statusRef = ref(database, "statuses");
    onValue(statusRef, (snap) => {
      if (!snap.exists()) return setStatuses([]);
      const list = Object.entries(snap.val()).map(([k, v]: any) => ({
        userKey: k,
        ...v,
      }));
      setStatuses(list);
    });
  }, []);

  /* Load calls */
  useEffect(() => {
    const callsRef = ref(database, `calls/${MY_KEY}`);
    onValue(callsRef, (snap) => {
      if (!snap.exists()) return setCalls([]);
      const list = Object.entries(snap.val()).map(([k, v]: any) => ({
        id: k,
        ...v,
      }));
      list.sort((a, b) => b.timestamp - a.timestamp);
      setCalls(list);
    });
  }, []);

  /* Post Status */
  const postStatus = () => {
    const statusRef = ref(database, `statuses/${MY_KEY}`);
    set(statusRef, {
      name: myName,
      image: `https://i.pravatar.cc/300?u=${MY_KEY}`,
      timestamp: Date.now(),
    });
  };

  /* Make Call */
  const makeCall = (toKey: string, type: "audio" | "video") => {
    const callData = { with: toKey, type, timestamp: Date.now() };
    const myCallRef = ref(database, `calls/${MY_KEY}`);
    const otherCallRef = ref(database, `calls/${toKey}`);
    push(myCallRef, callData);
    push(otherCallRef, callData);
    Alert.alert("Call simulated", `You made a ${type} call`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Green</Text>
      </View>

      <View style={styles.tabs}>
        {["Chats", "People", "Status", "Calls"].map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t as any)}>
            <Text style={[styles.tab, tab === t && styles.activeTab]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CHATS */}
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
                <View style={{ flex: 1 }}>
                  <Text style={styles.chatName}>{item.name}</Text>
                  <Text style={styles.lastMsg}>{item.lastText}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* PEOPLE */}
      {tab === "People" && (
        <FlatList
          data={people}
          keyExtractor={(i) => i.key}
          renderItem={({ item }) => (
            <View style={styles.chatRow}>
              <Image
                source={{ uri: `https://i.pravatar.cc/150?u=${item.key}` }}
                style={styles.avatar}
              />
              <Text style={styles.chatName}>{item.name}</Text>
              <View style={{ flexDirection: "row", marginLeft: "auto" }}>
                <TouchableOpacity
                  style={{ marginRight: 8 }}
                  onPress={() => {
                    const chatId = [MY_KEY, item.key].sort().join("_");
                    set(ref(database, `chats/${chatId}`), { messages: {} });
                    setScreen("chat");
                    setActiveChat({ id: chatId, name: item.name });
                  }}
                >
                  <Ionicons name="chatbubble" size={24} color="#25D366" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => makeCall(item.key, "audio")}
                >
                  <Ionicons name="call" size={24} color="#128C7E" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* STATUS */}
      {tab === "Status" && (
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={{
              backgroundColor: "#25D366",
              padding: 10,
              borderRadius: 20,
              alignSelf: "center",
              margin: 8,
            }}
            onPress={postStatus}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Post Status</Text>
          </TouchableOpacity>

          <FlatList
            data={statuses}
            keyExtractor={(i) => i.userKey}
            renderItem={({ item }) => (
              <View style={styles.statusRow}>
                <Image
                  source={{
                    uri: item.image || `https://i.pravatar.cc/150?u=${item.userKey}`,
                  }}
                  style={styles.avatar}
                />
                <Text style={styles.chatName}>{item.name}</Text>
              </View>
            )}
          />
        </View>
      )}

      {/* CALLS */}
      {tab === "Calls" && (
        <FlatList
          data={calls}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View style={styles.callRow}>
              <Image
                source={{ uri: `https://i.pravatar.cc/150?u=${item.with}` }}
                style={styles.avatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.chatName}>{item.withName || item.with}</Text>
                <Text style={styles.lastMsg}>
                  {item.type === "audio" ? "Audio Call" : "Video Call"}
                </Text>
              </View>
              <Text style={styles.time}>
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

/* =====================
   STYLES
===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121B22" },
  header: { backgroundColor: "#075E54", padding: 14 },
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
  time: { color: "#bbb", fontSize: 11 },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 0.5,
    borderColor: "#2A3942",
  },
  callRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 0.5,
    borderColor: "#2A3942",
  },
});
