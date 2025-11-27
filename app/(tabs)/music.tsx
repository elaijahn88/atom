import React, { useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import Video from "react-native-video";
import { Ionicons } from "@expo/vector-icons";

const screenWidth = Dimensions.get("window").width;

const demoVideos = Array.from({ length: 20 }).map((_, i) => ({
  id: i + 1,
  title: `Video ${i + 1}`,
  url: "https://www.w3schools.com/html/mov_bbb.mp4", // demo video URL
}));

const VideoPlayerDemo = () => {
  const [playingId, setPlayingId] = useState<number | null>(null);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.videoCard}>
      <Text style={styles.title}>{item.title}</Text>

      <Video
        source={{ uri: item.url }}
        style={styles.video}
        controls
        paused={playingId !== item.id} // only play the selected video
        resizeMode="contain"
      />

      <TouchableOpacity
        style={styles.playButton}
        onPress={() => setPlayingId(item.id)}
      >
        <Ionicons name="play-circle" size={30} color="#fff" />
        <Text style={styles.playText}>Play</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={demoVideos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 50 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 10 },
  videoCard: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },
  video: { width: screenWidth - 40, height: 200, borderRadius: 10, backgroundColor: "#000" },
  playButton: {
    position: "absolute",
    top: 80,
    left: (screenWidth - 40) / 2 - 40,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 5,
    borderRadius: 5,
  },
  playText: { color: "#fff", marginLeft: 5 },
});

export default VideoPlayerDemo;
