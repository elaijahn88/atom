import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
} from "react-native";

export default function GroupChatScreen() {
  const me = "me@example.com"; // placeholder
  const isAdmin = true; // placeholder for admin check
  const groupName = "My Group"; // placeholder

  const [messages, setMessages] = useState([
    { id: '1', sender: me, text: "Hi there!", time: "10:00 AM", avatar: "https://i.pravatar.cc/150?u=me" },
    { id: '2', sender: "friend@example.com", text: "Hello!", time: "10:01 AM", avatar: "https://i.pravatar.cc/150?u=friend" },
  ]);
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState({ "friend@example.com": true });
  const [menuVisible, setMenuVisible] = useState(false);

  const flatListRef = useRef();

  const sendMessage = () => {
    if (!text.trim()) return;
    const newMsg = {
      id: Date.now().toString(),
      sender: me,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: "https://i.pravatar.cc/150?u=me"
    };
    setMessages([...messages, newMsg]);
    setText("");
    flatListRef.current.scrollToEnd({ animated: true });
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender === me;
    return (
      <View style={[styles.messageRow, isMe ? { justifyContent: "flex-end" } : { justifyContent: "flex-start" }]}>
        {!isMe && <Image source={{ uri: item.avatar }} style={styles.avatar} />}
        <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.otherMessage]}>
          <Text style={styles.messageText}>{item.text}</Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
        {isMe && <Image source={{ uri: item.avatar }} style={styles.avatar} />}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={80}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>{groupName}</Text>
        {isAdmin && (
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
            <Text style={{color:"white", fontSize:18}}>⋮</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ADMIN MENU */}
      <Modal transparent visible={menuVisible} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => alert("Add Member clicked")}>
              <Text style={styles.menuText}>Add Member</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => alert("Delete Group clicked")}>
              <Text style={[styles.menuText, { color: "red" }]}>Delete Group</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MESSAGES */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 10 }}
        onContentSizeChange={() => flatListRef.current.scrollToEnd({ animated: true })}
      />

      {/* TYPING */}
      {Object.entries(typingUsers).map(([u, v]) =>
        v && u !== me && (
          <Text key={u} style={styles.typingText}>{u} is typing...</Text>
        )
      )}

      {/* INPUT */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: { padding: 15, backgroundColor: "#4CAF50", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerText: { fontSize: 20, fontWeight: "bold", color: "white" },
  menuBtn: { paddingHorizontal: 10 },
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'flex-start', alignItems:'flex-end' },
  menuContainer: { marginTop:60, marginRight:10, backgroundColor:'white', borderRadius:5, width:150, paddingVertical:5 },
  menuItem: { padding:10 },
  menuText: { fontSize:16 },
  messageRow: { flexDirection: "row", marginVertical: 5, alignItems: "flex-end", paddingHorizontal: 10 },
  avatar: { width: 35, height: 35, borderRadius: 17.5, marginHorizontal: 5 },
  messageContainer: { maxWidth: "70%", padding: 10, borderRadius: 15 },
  myMessage: { backgroundColor: "#DCF8C6", borderTopRightRadius: 0 },
  otherMessage: { backgroundColor: "white", borderTopLeftRadius: 0 },
  messageText: { fontSize: 16 },
  timeText: { fontSize: 10, color: "#555", alignSelf: "flex-end", marginTop: 3 },
  typingText: { fontStyle: "italic", color: "#888", marginLeft: 50, marginBottom: 5 },
  inputContainer: { flexDirection: "row", padding: 10, borderTopWidth: 1, borderColor: "#ddd", backgroundColor: "white" },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 25, paddingHorizontal: 15, fontSize: 16 },
  sendBtn: { backgroundColor: "#4CAF50", borderRadius: 25, paddingHorizontal: 20, justifyContent: "center", marginLeft: 10 },
  sendBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
