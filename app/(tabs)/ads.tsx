import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Linking,
} from "react-native";
import { useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Video from "react-native-video";

const { width } = Dimensions.get("window");

// 🎥 All video ads
const ads = [
  {
    id: "1",
    type: "video",
    video: "https://xlijah.com/soso.mp4",
    title: "Sample Video Ad 1",
    description: "This is the first video ad.",
    link: "https://www.example1.com",
  },
  {
    id: "2",
    type: "video",
    video: "https://xlijah.com/soso.mp4",
    title: "Sample Video Ad 2",
    description: "This is the second video ad.",
    link: "https://www.example2.com",
  },
  {
    id: "3",
    type: "video",
    video: "https://xlijah.com/soso.mp4",
    title: "Sample Video Ad 3",
    description: "This is the third video ad.",
    link: "https://www.example3.com",
  },
  {
    id: "4",
    type: "video",
    video: "https://xlijah.com/soso.mp4",
    title: "Sample Video Ad 4",
    description: "This is the fourth video ad.",
    link: "https://www.example4.com",
  },
];

export default function AdBanner() {
  const isDark = useColorScheme() === "dark";
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // 🔁 Auto-rotate every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const next = (currentIndex + 1) % ads.length;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    }, 6000);
    return () => clearInterval(timer);
  }, [currentIndex]);

  const openLink = async (url: string) => {
    if (await Linking.canOpenURL(url)) {
      Linking.openURL(url);
    }
  };

  const renderAd = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => openLink(item.link)}
      style={styles.card}
    >
      <Video
        source={{ uri: item.video }}
        style={styles.media}
        resizeMode="cover"
        repeat
        muted
        playInBackground={false}
        paused={false}
      />

      <View style={styles.overlay}>
        <Text style={[styles.title, { color: isDark ? "#fff" : "#111" }]}>
          {item.title}
        </Text>
        <Text style={[styles.desc, { color: isDark ? "#ddd" : "#333" }]}>
          {item.description}
        </Text>
        <View style={styles.row}>
          <Text style={{ color: "#00cc66", fontWeight: "600" }}>
            Learn more
          </Text>
          <Ionicons
            name="arrow-forward-circle-outline"
            size={18}
            color="#00cc66"
            style={{ marginLeft: 6 }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#111" : "#f9f9f9" },
      ]}
    >
      {/* Ad Banner Section */}
      <FlatList
        ref={flatListRef}
        data={ads}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={renderAd}
      />

      {/* Video Section Below Ads */}
      <View style={styles.videoContainer}>
        <Video
          source={{ uri: ads[currentIndex].video }}
          style={styles.videoPlayer}
          resizeMode="cover"
          repeat
          muted={false}
          playInBackground={false}
          paused={false}
        />
        <View style={styles.videoOverlay}>
          <Text style={[styles.videoTitle, { color: isDark ? "#fff" : "#111" }]}>
            {ads[currentIndex].title}
          </Text>
          <Text style={[styles.videoDesc, { color: isDark ? "#ddd" : "#333" }]}>
            {ads[currentIndex].description}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingBottom: 20,
  },
  card: {
    width,
    height: 240,
    position: "relative",
  },
  media: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  overlay: {
    position: "absolute",
    bottom: 12,
    left: 14,
    right: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  desc: {
    fontSize: 14,
    marginVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  videoContainer: {
    width: "100%",
    height: 240,
    marginTop: 10,
    position: "relative",
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    position: "absolute",
    bottom: 10,
    left: 14,
    right: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  videoDesc: {
    fontSize: 14,
    marginVertical: 4,
  },
});
