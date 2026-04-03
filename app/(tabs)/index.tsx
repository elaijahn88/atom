import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { pickImage, takePhoto, pickFile } from "../lib/picker";

const PickerComponent = () => {
  const [data, setData] = useState<any>(null);

  const handleGallery = async () => {
    const res = await pickImage();
    if (res) setData(res);
  };

  const handleCamera = async () => {
    const res = await takePhoto();
    if (res) setData(res);
  };

  const handleFile = async () => {
    const res = await pickFile();
    if (res) setData(res);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Picker Component</Text>

      <TouchableOpacity style={styles.button} onPress={handleGallery}>
        <Text style={styles.buttonText}>Pick Image</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleCamera}>
        <Text style={styles.buttonText}>Take Photo</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleFile}>
        <Text style={styles.buttonText}>Pick File</Text>
      </TouchableOpacity>

      {data && (
        <View style={styles.preview}>
          <Text>Type: {data.type}</Text>
          <Text>Name: {data.fileName || data.name}</Text>
          {data.type === "image" && <Image source={{ uri: data.uri }} style={styles.image} />}
          {data.type === "file" && <Text>Size: {data.size} bytes</Text>}
        </View>
      )}
    </View>
  );
};

export default PickerComponent;

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  title: { fontSize: 20, marginBottom: 10 },
  button: {
    backgroundColor: "#333",
    padding: 12,
    marginVertical: 5,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", textAlign: "center" },
  preview: { marginTop: 15 },
  image: { width: 200, height: 200, marginTop: 10, borderRadius: 10 },
});
