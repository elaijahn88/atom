import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  StatusBar,
  ImageBackground,
  Switch,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ref, onValue, push, update } from "firebase/database";
import { db } from "../../firebase"; // <-- adjust this path to your firebase config

// --------------------------
// CONFIG: logged-in user
// --------------------------
const userEmail = "elajahn8@gmail.com";
const userKey = userEmail.replace(/\./g, ",");

// --------------------------
// WALLPAPERS
// --------------------------
const wallpapers = [
  "https://images.unsplash.com/photo-1503264116251-35a269479413?w=1200&q=60&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470167290877-7d5b1f83c9a0?w=1200&q=60&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=1200&q=60&auto=format&fit=crop",
];

// --------------------------
// MAIN APP
// --------------------------
export default function App() {
  const [theme, setTheme] = useState("dark"); // 'dark' | 'light'
  const [screen, setScreen] = useState("inbox"); // inbox | chat | settings
  const [receiverKey, setReceiverKey] = useState(null); // either userKey-like 'alice@green,com' or 'group_g1001'
  const [wallpaper, setWallpaper] = useState(wallpapers[0]);

  // data from DB
  const [users, setUsers] = useState({});
  const [groups, setGroups] = useState({});
  const [inbox, setInbox] = useState({});
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // chat UI state
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const flatRef = useRef(null);

  const styles = makeStyles(theme);

  // --------------------------
  // LOAD USERS + GROUPS + INBOX
  // --------------------------
  useEffect(() => {
    setLoading(true);

    const usersRef = ref(db, "users/users"); // your DB has users/users
    const groupsRootRef = ref(db, "groups"); // top-level groups
    const usersGroupsRef = ref(db, "users/groups"); // sometimes groups stored under users/groups
    const inboxRef = ref(db, `users/users/${userKey}/inbox`);

    const unsubUsers = onValue(usersRef, (snap) => {
      setUsers(snap.val() || {});
    });

    const unsubGroupsRoot = onValue(groupsRootRef, (snap) => {
      setGroups((prev) => {
        const rootGroups = snap.val() || {};
        // merge with any groups coming from users/groups later
        return { ...rootGroups, ...prev };
      });
    });

    const unsubUsersGroups = onValue(usersGroupsRef, (snap) => {
      const uGroups = snap.val() || {};
      setGroups((prev) => ({ ...prev, ...uGroups }));
    });

    const unsubInbox = onValue(inboxRef, (snap) => {
      setInbox(snap.val() || {});
      setLoading(false);
    });

    return () => {
      unsubUsers?.();
      unsubGroupsRoot?.();
      unsubUsersGroups?.();
      unsubInbox?.();
    };
  }, []);

  // --------------------------
  // LOAD MESSAGES (PRIVATE OR GROUP)
  // --------------------------
  useEffect(() => {
    if (!receiverKey) {
      setMessages([]);
      return;
    }

    const isGroup = receiverKey.startsWith("group_");
    const chatId = isGroup ? null : [userKey, receiverKey].sort().join("_");
    const path = isGroup
      ? `groups/${receiverKey}/messages`
      : `users/users/${userKey}/messages/${chatId}`;

    const messagesRef = ref(db, path);
    const unsub = onValue(messagesRef, (snap) => {
      const list = [];
      snap.forEach((s) => {
        list.push({ id: s.key, ...s.val() });
      });
      // sort by timestamp (defensive)
      list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(list);
      // scroll to bottom
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
    });

    // mark inbox unreadCount 0 (mark read)
    const inboxPath = `users/users/${userKey}/inbox/${receiverKey}`;
    update(ref(db, inboxPath), { unreadCount: 0 }).catch(() => {});

    return () => unsub();
  }, [receiverKey]);

  // --------------------------
  // SEND MESSAGE (private + group)
  // --------------------------
  const sendMessage = async () => {
    if (!text.trim() || !receiverKey) return;

    const isGroup = receiverKey.startsWith("group_");
    const chatId = isGroup ? null : [userKey, receiverKey].sort().join("_");

    const basePath = isGroup
      ? `groups/${receiverKey}/messages`
      : `users/users/${userKey}/messages/${chatId}`;

    const msg = {
      sender: userKey,
      text: text.trim(),
      timestamp: Date.now(),
    };

    try {
      // push to base path (current user's copy)
      await push(ref(db, basePath), msg);

      // if private -> push to receiver's private copy
      if (!isGroup) {
        await push(ref(db, `users/users/${receiverKey}/messages/${chatId}`), msg);
      }

      // update inboxes
      await updateInbox(msg.text, receiverKey);
      setText("");
      Keyboard.dismiss();
    } catch (err) {
      console.error("sendMessage error", err);
    }
  };

  // --------------------------
  // UPDATE INBOX (private + group)
  // --------------------------
  const updateInbox = async (lastText, targetKey) => {
    const isGroup = targetKey.startsWith("group_");

    if (isGroup) {
      // update inbox for all group members
      const members = groups[targetKey]?.members || {};
      const updates = {};
      Object.keys(members).forEach((uid) => {
        updates[`users/users/${uid}/inbox/${targetKey}`] = {
          lastText,
          timestamp: Date.now(),
          unreadCount:
            uid === userKey
              ? 0
              : (users[uid]?.inbox?.[targetKey]?.unreadCount || 0) + 1,
        };
      });

      // write batch update
      await update(ref(db), updates);
      return;
    }

    // private: update sender and receiver inbox
    const updates = {};
    updates[`users/users/${userKey}/inbox/${targetKey}`] = {
      lastText,
      timestamp: Date.now(),
      unreadCount: 0,
    };
    updates[`users/users/${targetKey}/inbox/${userKey}`] = {
      lastText,
      timestamp: Date.now(),
      unreadCount: (users[targetKey]?.inbox?.[userKey]?.unreadCount || 0) + 1,
    };

    await update(ref(db), updates);
  };

  // --------------------------
  // Sorted inbox keys for UI
  // --------------------------
  const sortedInboxKeys = Object.keys(inbox || {}).sort(
    (a, b) => (inbox[b]?.timestamp || 0) - (inbox[a]?.timestamp || 0)
  );

  // --------------------------
  // UI: quick loading
  // --------------------------
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#25D366" />
          <Text style={{ color: theme === "dark" ? "#fff" : "#111", marginTop: 12 }}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --------------------------
  // Render
  // --------------------------
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>Green Chat</Text>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={{ marginRight: 14 }}
            onPress={() => setScreen("settings")}
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color={theme === "dark" ? "#fff" : "#222"}
            />
          </TouchableOpacity>

          <Switch
            value={theme === "dark"}
            onValueChange={(v) => setTheme(v ? "dark" : "light")}
            trackColor={{ true: "#25D366", false: "#888" }}
            thumbColor={theme === "dark" ? "#fff" : "#fff"}
          />
        </View>
      </View>

      {/* --- INBOX SCREEN --- */}
      {screen === "inbox" && (
        <View style={{ flex: 1 }}>
          {/* STORIES (UI-only) */}
          <View style={styles.storiesContainer}>
            <FlatList
              data={Object.values(users).slice(0, 6)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(u) => u.email || u.name}
              renderItem={({ item }) => (
                <StoryBubble
                  item={{
                    id: item.email || item.name,
                    user: item.name,
                    avatar: item.avatar,
                  }}
                  onPress={() => {}}
                  theme={theme}
                />
              )}
            />
          </View>

          {/* INBOX LIST (users + groups) */}
          <FlatList
            data={sortedInboxKeys}
            keyExtractor={(k) => k}
            renderItem={({ item }) => {
              const isGroup = item.startsWith("group_");
              const data = isGroup ? groups[item] : users[item];
              if (!data) return null;

              return (
                <TouchableOpacity
                  onPress={() => {
                    setReceiverKey(item);
                    setScreen("chat");
                  }}
                >
                  <View style={styles.inboxItem}>
                    <Image
                      source={{ uri: data.avatar || data.groupIcon || "https://i.pravatar.cc/100" }}
                      style={styles.avatar}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>
                        {isGroup ? data.name : data.name}
                      </Text>
                      <Text style={styles.last}>
                        {inbox[item]?.lastText || (isGroup ? "Group created" : "Say hi")}
                      </Text>
                    </View>

                    <View style={styles.timestampBox}>
                      <Text style={styles.timestamp}>
                        {inbox[item]?.unreadCount > 0 ? inbox[item].unreadCount : ""}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* --- CHAT SCREEN --- */}
      {screen === "chat" && receiverKey && (
        <>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                setScreen("inbox");
                setReceiverKey(null);
              }}
            >
              <Ionicons name="arrow-back" size={22} color={theme === "dark" ? "#fff" : "#222"} />
            </TouchableOpacity>

            <Image
              source={{
                uri:
                  (receiverKey.startsWith("group_") ? groups[receiverKey]?.groupIcon : users[receiverKey]?.avatar) ||
                  "https://i.pravatar.cc/100",
              }}
              style={styles.headerAvatar}
            />
            <Text style={styles.headerName}>
              {receiverKey.startsWith("group_") ? groups[receiverKey]?.name : users[receiverKey]?.name}
            </Text>
          </View>

          <ImageBackground source={{ uri: wallpaper }} style={styles.chatBackground}>
            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
              renderItem={({ item }) => {
                const mine = item.sender === userKey;
                return (
                  <View
                    style={[
                      styles.msg,
                      mine ? styles.right : styles.left,
                      mine ? { backgroundColor: "#056162" } : null,
                    ]}
                  >
                    <Text style={{ color: theme === "dark" ? "#fff" : "#111" }}>
                      {item.text}
                    </Text>
                  </View>
                );
              }}
            />

            {typing && (
              <View style={styles.typingRow}>
                <Image
                  source={{
                    uri: receiverKey.startsWith("group_")
                      ? groups[receiverKey]?.groupIcon
                      : users[receiverKey]?.avatar,
                  }}
                  style={styles.typingAvatar}
                />
                <Text style={styles.typingText}>Typing…</Text>
              </View>
            )}
          </ImageBackground>

          <View style={styles.inputBar}>
            <TouchableOpacity>
              <Ionicons name="happy-outline" size={26} color="#aaa" />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Message"
              placeholderTextColor="#aaa"
            />

            <TouchableOpacity
              onPress={() => {
                setTyping(true);
                sendMessage();
                // small client-side typing feedback
                setTimeout(() => setTyping(false), 800);
              }}
            >
              <Ionicons name="send" size={26} color="#25D366" />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* --- SETTINGS SCREEN --- */}
      {screen === "settings" && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={styles.settingsTitle}>Settings</Text>

          <TouchableOpacity onPress={() => setScreen("inbox")}>
            <Text style={styles.settingsItem}>Back</Text>
          </TouchableOpacity>

          <Text style={[styles.settingsItem, { marginTop: 18 }]}>Chat Wallpapers</Text>

          <FlatList
            data={wallpapers}
            horizontal
            keyExtractor={(w) => w}
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => setWallpaper(item)}>
                <Image
                  source={{ uri: item }}
                  style={{
                    width: 120,
                    height: 80,
                    borderRadius: 8,
                    marginRight: 12,
                    borderWidth: item === wallpaper ? 3 : 0,
                    borderColor: "#25D366",
                  }}
                />
              </TouchableOpacity>
            )}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// --------------------------
// Small UI components
// --------------------------
function StoryBubble({ item, onPress, theme }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 8 }}>
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            borderRadius: 36,
            padding: 3,
            borderWidth: 2,
            borderColor: theme === "dark" ? "#25D366" : "#075E54",
          }}
        >
          <Image source={{ uri: item.avatar }} style={{ width: 64, height: 64, borderRadius: 32 }} />
        </View>
        <Text style={{ color: theme === "dark" ? "#fff" : "#222", marginTop: 6 }}>{item.user}</Text>
      </View>
    </TouchableOpacity>
  );
}

// --------------------------
// Styles (theme-aware)
// --------------------------
const makeStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme === "dark" ? "#121B22" : "#fafafa" },

    topBar: {
      backgroundColor: theme === "dark" ? "#075E54" : "#e6f4ef",
      padding: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    logo: { color: theme === "dark" ? "#fff" : "#075E54", fontSize: 20, fontWeight: "bold" },

    storiesContainer: {
      paddingVertical: 12,
      paddingLeft: 12,
      borderBottomWidth: 0.5,
      borderColor: theme === "dark" ? "#2A3942" : "#ddd",
      backgroundColor: theme === "dark" ? "#121B22" : "#fff",
    },

    inboxItem: {
      flexDirection: "row",
      padding: 12,
      borderBottomWidth: 0.5,
      borderColor: theme === "dark" ? "#2A3942" : "#eee",
      alignItems: "center",
    },

    avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
    name: { color: theme === "dark" ? "#fff" : "#111", fontSize: 16 },
    last: { color: theme === "dark" ? "#bbb" : "#666", fontSize: 13 },

    timestampBox: {
      alignItems: "flex-end",
      justifyContent: "center",
      marginLeft: 8,
    },
    timestamp: { color: theme === "dark" ? "#bbb" : "#999", fontSize: 12 },

    header: {
      backgroundColor: theme === "dark" ? "#075E54" : "#e6f4ef",
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
    },

    headerAvatar: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 8 },
    headerName: { color: theme === "dark" ? "#fff" : "#075E54", fontSize: 16 },

    chatBackground: {
      flex: 1,
      resizeMode: "cover",
      backgroundColor: theme === "dark" ? "#0f1a1d" : "#f5f5f5",
    },

    msg: {
      backgroundColor: theme === "dark" ? "#1E2C33" : "#e8f6f2",
      marginVertical: 6,
      padding: 10,
      borderRadius: 12,
      maxWidth: "78%",
    },

    left: { alignSelf: "flex-start" },
    right: { alignSelf: "flex-end" },

    typingRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 8,
      marginLeft: 12,
    },

    typingAvatar: { width: 28, height: 28, borderRadius: 14 },
    typingText: { color: theme === "dark" ? "#aaa" : "#666", marginLeft: 8 },

    inputBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme === "dark" ? "#1E2C33" : "#fff",
      padding: 10,
      borderTopWidth: 0.5,
      borderColor: theme === "dark" ? "#26343a" : "#ddd",
    },

    input: {
      flex: 1,
      backgroundColor: theme === "dark" ? "#2A3942" : "#f0f0f0",
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: theme === "dark" ? "#fff" : "#111",
      marginHorizontal: 8,
    },

    settingsTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: theme === "dark" ? "#fff" : "#111",
      marginBottom: 12,
    },

    settingsItem: {
      fontSize: 18,
      color: theme === "dark" ? "#ccc" : "#444",
      marginVertical: 10,
    },
  });
