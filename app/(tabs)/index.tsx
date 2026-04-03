// components/UserForm.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Button, ScrollView, Alert, StyleSheet } from "react-native";
import { saveUserData, UserBio } from "../lib/saveUserData";

const UserForm = () => {
  const [user, setUser] = useState<UserBio>({
    firstName: "",
    lastName: "",
    age: 0,
    gender: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    occupation: "",
  });

  const handleChange = (key: keyof UserBio, value: string) => {
    setUser(prev => ({
      ...prev,
      [key]: key === "age" ? Number(value) : value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const result = await saveUserData(user);
      Alert.alert("Success", `Saved!\nFirestore ID: ${result.firestoreId}\nRealtime Key: ${result.realtimeKey}`);
      // Reset form
      setUser({
        firstName: "",
        lastName: "",
        age: 0,
        gender: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        country: "",
        occupation: "",
      });
    } catch (error) {
      Alert.alert("Error", "Failed to save user data. Check console.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      {Object.entries(user).map(([key, value]) => (
        <View key={key} style={styles.inputContainer}>
          <Text style={styles.label}>{key}</Text>
          <TextInput
            style={styles.input}
            value={value.toString()}
            onChangeText={text => handleChange(key as keyof UserBio, text)}
            keyboardType={key === "age" ? "numeric" : "default"}
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
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 5 },
});
