import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { auth, db } from "../../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

export default function App() {
  const [user, setUser] = useState(null);
  const [activeScreen, setActiveScreen] = useState("threads"); // 🟢 Default start

  // 🔁 Firebase auth state tracking
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const ref = doc(db, "acc", "elijah", currentUser.email);
        const snap = await getDoc(ref);
        if (snap.exists()) setUser(snap.data());
        else setUser({ email: currentUser.email });
      } else {
        setUser(null);
      }
    });
    return () => unsub();
  }, []);

  // 🧠 Chat button handler
  const handleChatPress = () => {
    if (user) setActiveScreen("threads");
    else setActiveScreen("auth");
  };

  // 🧭 Navigation bar
  const NavBar = () => (
    <View style={styles.navBar}>
      <TouchableOpacity onPress={() => setActiveScreen("threads")} style={styles.navBtn}>
        <Ionicons name="chatbubbles-outline" size={24} color={activeScreen === "threads" ? "#4e8ef7" : "#999"} />
        <Text style={styles.navText}>Threads</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setActiveScreen("explore")} style={styles.navBtn}>
        <Ionicons name="compass-outline" size={24} color={activeScreen === "explore" ? "#4e8ef7" : "#999"} />
        <Text style={styles.navText}>Explore</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setActiveScreen("profile")} style={styles.navBtn}>
        <Ionicons name="person-outline" size={24} color={activeScreen === "profile" ? "#4e8ef7" : "#999"} />
        <Text style={styles.navText}>Profile</Text>
      </TouchableOpacity>
    </View>
  );

  // 🔐 Auth Screen
  if (activeScreen === "auth") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔐 Login / Signup</Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => setActiveScreen("threads")}
        >
          <Text style={styles.btnText}>Back to Threads</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 💬 Threads Screen
  if (activeScreen === "threads") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>💬 Threads Screen</Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleChatPress}>
          <Text style={styles.btnText}>Chat</Text>
        </TouchableOpacity>

        {user && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: "red", marginTop: 10 }]}
            onPress={() => signOut(auth)}
          >
            <Text style={styles.btnText}>Logout</Text>
          </TouchableOpacity>
        )}

        <NavBar />
      </View>
    );
  }

  // 🌍 Explore Screen
  if (activeScreen === "explore") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🌍 Explore Screen</Text>
        <Text style={styles.text}>Discover trending topics and people.</Text>
        <NavBar />
      </View>
    );
  }

  // 👤 Profile Screen
  if (activeScreen === "profile") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>👤 Profile Screen</Text>
        {user ? (
          <Text style={styles.text}>Signed in as {user.email}</Text>
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
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 80,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
  },
  text: {
    fontSize: 16,
    color: "#444",
  },
  primaryBtn: {
    backgroundColor: "#4e8ef7",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  btnText: {
    color: "white",
    fontWeight: "600",
  },
  navBar: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    backgroundColor: "#f8f8f8",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    width: "100%",
    justifyContent: "space-around",
    paddingVertical: 10,
  },
  navBtn: {
    alignItems: "center",
  },
  navText: {
    fontSize: 12,
    color: "#666",
    marginTop: 3,
  },
});
