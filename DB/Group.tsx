// GroupChatScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { ref, push, set, update, remove, onValue } from "firebase/database";
import { db } from "./firebase";

const safeEmail = (email) => email.replace(/\./g, ",");

export default function GroupChatScreen({ route }) {
  const { userEmail, groupId } = route.params;
  const me = safeEmail(userEmail);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [members, setMembers] = useState({});
  const [admins, setAdmins] = useState({});
  const [typingUsers, setTypingUsers] = useState({});

  // LOAD GROUP METADATA
  useEffect(() => {
    onValue(ref(db, `groups/${groupId}`), snap => {
      if (snap.exists()) {
        const data = snap.val();
        setMembers(data.members || {});
        setAdmins(data.admins || {});
      }
    });
  }, []);

  // LOAD MESSAGES
  useEffect(() => {
    onValue(ref(db, `groupMessages/${groupId}`), snap => {
      if (snap.exists()) {
        const msgs = Object.values(snap.val());
        setMessages(msgs.sort((a,b)=>a.timestamp-b.timestamp));
        markRead();
      }
    });
  }, []);

  // MARK AS READ
  const markRead = async () => {
    await update(ref(db, `users/${me}/inbox/${groupId}`), {
      unreadCount: 0
    });
  };

  // SEND MESSAGE
  const sendMessage = async () => {
    if (!text.trim()) return;

    const msgRef = push(ref(db, `groupMessages/${groupId}`));

    const message = {
      sender: me,
      text,
      timestamp: Date.now(),
      readBy: { [me]: true }
    };

    await set(msgRef, message);

    // Update group lastMessage
    await update(ref(db, `groups/${groupId}/lastMessage`), message);

    // Update inbox for all users
    Object.keys(members).forEach(async (u) => {
      await update(ref(db, `users/${u}/inbox/${groupId}`), {
        lastText: text,
        timestamp: Date.now(),
        unreadCount: u === me ? 0 : 1
      });
    });

    setText("");
    setTyping(false);
  };

  // TYPING INDICATOR
  const setTyping = async (state) => {
    await set(ref(db, `groups/${groupId}/typing/${me}`), state);
  };

  useEffect(() => {
    onValue(ref(db, `groups/${groupId}/typing`), snap => {
      setTypingUsers(snap.val() || {});
    });
  }, []);

  // ADD MEMBER (ADMIN)
  const addMember = async (email) => {
    const u = safeEmail(email);
    await set(ref(db, `groups/${groupId}/members/${u}`), true);
    await set(ref(db, `users/${u}/inbox/${groupId}`), { lastText:"", timestamp:0, unreadCount:0 });
  };

  // REMOVE MEMBER
  const removeMember = async (email) => {
    const u = safeEmail(email);
    await remove(ref(db, `groups/${groupId}/members/${u}`));
    await remove(ref(db, `users/${u}/inbox/${groupId}`));
  };

  // DELETE GROUP
  const deleteGroup = async () => {
    if (!admins[me]) return alert("Admins only!");

    await remove(ref(db, `groups/${groupId}`));
    await remove(ref(db, `groupMessages/${groupId}`));

    Object.keys(members).forEach(async u => {
      await remove(ref(db, `users/${u}/inbox/${groupId}`));
    });

    alert("Group deleted");
  };

  // READ RECEIPT DISPLAY
  const renderItem = ({ item }) => (
    <Text style={{padding:5, color: item.sender===me?"green":"black"}}>
      {item.text}
      {"  "}
      ✅ {item.readBy ? Object.keys(item.readBy).length : 0}
    </Text>
  );

  return (
    <View style={styles.container}>

      <Text style={styles.header}>Group Chat</Text>

      {Object.entries(typingUsers).map(([u,v]) =>
        v && u!==me && <Text key={u}>{u} is typing...</Text>
      )}

      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
      />

      <TextInput
        style={styles.input}
        value={text}
        onChangeText={(t) => {
          setText(t);
          setTyping(true);
        }}
        placeholder="Type a message..."
      />

      <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
        <Text style={{color:"white"}}>Send</Text>
      </TouchableOpacity>

      {admins[me] && (
        <>
          <TouchableOpacity onPress={()=>addMember("new@green.com")}>
            <Text>Add Member</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={deleteGroup}>
            <Text style={{color:"red"}}>Delete Group</Text>
          </TouchableOpacity>
        </>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,padding:10},
  header:{fontSize:18,fontWeight:"bold"},
  input:{borderWidth:1,marginTop:10,padding:8},
  sendBtn:{backgroundColor:"green",padding:10,marginTop:5}
});
