import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { db } from "../../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export default function App() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [view, setView] = useState<"login" | "account" | "profile">("login");

  const docRef = doc(db, "acc", "elijah");

  // ✅ Login by checking if name matches the "Name" field in doc "elijah"
  const handleLoginByName = async () => {
    if (!name.trim()) {
      setMessage("⚠️ Please enter your name.");
      return;
    }

    try {
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        if (data.Name.toLowerCase() === name.trim().toLowerCase()) {
          setProfile(data);
          setView("account");
          setMessage(`✅ Welcome back, ${data.Name}!`);
        } else {
          setMessage("❌ Invalid name. Access denied.");
        }
      } else {
        // If document “elijah” does not exist, create it with defaults
        await setDoc(docRef, {
          Name: "Nabimanya Elijah",
          father: "Ziriganira Robert",
          mother: "Winnie Kenturegye Zebra",
          nok: "Atukunda Timothy",
          idno: 18535416,
          nin: "CM9900910LFEAF",
          phone: 746524088,
          net: 200000,
        });
        setProfile({
          Name: "Nabimanya Elijah",
          father: "Ziriganira Robert",
          mother: "Winnie Kenturegye Zebra",
          nok: "Atukunda Timothy",
          idno: 18535416,
          nin: "CM9900910LFEAF",
          phone: 746524088,
          net: 200000,
        });
        setView("account");
        setMessage("✅ Default profile created and logged in as Elijah.");
      }
    } catch (error: any) {
      setMessage("⚠️ " + error.message);
    }
  };

  // ✅ Update a field in the "elijah" document
  const handleProfileUpdate = async (field: string, value: any) => {
    await updateDoc(docRef, { [field]: value });
    const snap = await getDoc(docRef);
    setProfile(snap.data());
    setMessage(`✅ Updated ${field}!`);
  };

  // ✅ Logout
  const handleLogout = () => {
    setProfile(null);
    setName("");
    setView("login");
    setMessage("👋 Logged out successfully.");
  };

  // ===================
  // 🔒 LOGIN SCREEN
  // ===================
  if (view === "login") {
    return (
      <View style={styles.container}>
        <Image
          source={{ uri: "https://i.imgur.com/3G4sQO5.png" }}
          style={styles.logo}
        />
        <Text style={styles.title}>Login with Name</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={setName}
        />

        <TouchableOpacity style={styles.primaryBtn} onPress={handleLoginByName}>
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    );
  }

  // ===================
  // 👤 ACCOUNT SCREEN
  // ===================
  if (view === "account") {
    return (
      <View style={styles.container}>
        <Image
          source={{ uri: "https://i.imgur.com/3G4sQO5.png" }}
          style={styles.profilePic}
        />
        <Text style={styles.userName}>{profile?.Name}</Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => setView("profile")}
        >
          <Text style={styles.btnText}>View Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.btnText}>Logout</Text>
        </TouchableOpacity>

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    );
  }

  // ===================
  // 🧍 PROFILE SCREEN
  // ===================
  if (view === "profile") {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profile Details</Text>

        {profile ? (
          Object.entries(profile).map(([key, value]) => (
            <View key={key} style={styles.infoCard}>
              <Text style={styles.infoLabel}>{key}:</Text>
              <TextInput
                style={styles.infoInput}
                value={String(value)}
                onChangeText={(text) => handleProfileUpdate(key, text)}
              />
            </View>
          ))
        ) : (
          <Text style={{ color: "#ccc" }}>Loading...</Text>
        )}

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setView("account")}
        >
          <Text style={styles.btnText}>Back</Text>
        </TouchableOpacity>

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  logo: { width: 80, height: 80, marginBottom: 20, borderRadius: 20 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 20 },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    width: "100%",
    padding: 12,
    borderRadius: 10,
    marginVertical: 6,
  },
  primaryBtn: {
    backgroundColor: "#00BFFF",
    width: "100%",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  logoutBtn: {
    backgroundColor: "#FF9800",
    width: "100%",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  message: { color: "#ccc", marginTop: 20, textAlign: "center" },
  profilePic: { width: 90, height: 90, borderRadius: 45, marginBottom: 10 },
  userName: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 20 },
  infoCard: {
    backgroundColor: "#1a1a1a",
    width: "100%",
    padding: 10,
    borderRadius: 10,
    marginVertical: 6,
  },
  infoLabel: { color: "#aaa", fontSize: 14, marginBottom: 4 },
  infoInput: {
    color: "#fff",
    backgroundColor: "#151515",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
