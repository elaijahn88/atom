// components/UserForm.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import { saveUserData, UserBio } from "../../lib/fire";

const UserForm = () => {
  const [user, setUser] = useState<Omit<UserBio, "uid">>({
    firstName: "",
    lastName: "",
    gender: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    occupation: "",
  });

  // ✅ simplified (no number handling needed anymore)
  const handleChange = (key: keyof typeof user, value: string) => {
    setUser((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const result = await saveUserData(user);

      Alert.alert(
        "Success",
        `Saved!\nFirestore ID: ${result.firestoreId}\nRealtime Key: ${result.realtimeKey}`
      );

      // ✅ Reset form
      setUser({
        firstName: "",
        lastName: "",
        gender: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        occupation: "",
      });
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Failed to save user data.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      {Object.entries(user).map(([key, value]) => (
        <View key={key} style={styles.inputContainer}>
          <Text style={styles.label}>{key}</Text>

          <TextInput
            style={styles.input}
            value={value ? String(value) : ""}
            onChangeText={(text) =>
              handleChange(key as keyof typeof user, text)
            }
          />
        </View>
      ))}

      <Button title="Save User Info" onPress={handleSubmit} />
    </ScrollView>
  );
};

export default UserForm;

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff" },
  inputContainer: { marginBottom: 15 },
  label: { fontWeight: "bold", marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
  },
});
