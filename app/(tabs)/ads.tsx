import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
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

// 🖼️ + 🎥 Real mixed-media ads
const ads = [
  {
    id: "1",
    type: "image",
    image:
      "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-gallery-1-202309?wid=1200&hei=630&fmt=jpeg&qlt=90",
    title: "iPhone 15 Pro — Titanium Power",
    description: "Experience the strongest and lightest iPhone ever made.",
    link: "https://www.apple.com/iphone-15-pro/",
  },
  {
    id: "2",
    type: "video",
    video:
      "https://cdn.pixabay.com/vimeo/832687847/iphone-156881.mp4?width=640&hash=4b0cb5c25b1df5439b3ad160b94dcbd31d0c1e6e",
    title: "Apple Showcase Video",
    description: "Sleek design, real power — in motion.",
    link: "https://www.apple.com/",
  },
  {
    id: "3",
    type: "image",
    image:
      "https://images.samsung.com/is/image/samsung/assets/global/about-us/brand/logo/og-img-logo-1200x630.jpg",
    title: "Samsung Galaxy Z Fold 6",
    description: "Foldable future. Redefined productivity and style.",
    link: "https://www.samsung.com/global/galaxy/galaxy-z-fold6/",
  },
  {
    id: "4",
    type: "video",
    video:
      "https://cdn.pixabay.com/vimeo/333891183/fashion-19600.mp4?width=640&hash=03f38a2ad6f8a91778d6a4a39290e8c046da2459",
    title: "Fashion Ad — 50% Off",
    description: "Discover trending outfits and accessories near you.",
    link: "https://www.zara.com/",
  },
];

export default function AdBanner() {
  const isDark = useColorScheme() === "dark";
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // 🔁 Auto-rotate every 6 s
  useEffect(() => {
    const timer = setInterval(() => {
      const next = (currentIndex + 1) % ads.length;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    }, 6000);
    return () => clearInterval(timer);
  }, [currentIndex]);

  const openLink = async (url: string) => {
    if (await Linking.canOpenURL(url)) Linking.openURL(url);
  };

  const renderAd = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => openLink(item.link)}
      style={styles.card}
    >
      {item.type === "video" ? (
        <Video
          source={{ uri: item.video }}
          style={styles.media}
          resizeMode="cover"
          repeat
          muted
          playInBackground={false}
          paused={false}
        />
      ) : (
        <Image source={{ uri: item.image }} style={styles.media} />
      )}

      <View style={styles.overlay}>
        <Text style={[styles.title, { color: isDark ? "#fff" : "#111" }]}>
          {item.title}
        </Text>
        <Text style={[styles.desc, { color: isDark ? "#ddd" : "#333" }]}>
          {item.description}
        </Text>
        <View style={styles.row}>
          <Text style={{ color: "#00cc66", fontWeight: "600" }}>Learn more</Text>
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
      <FlatList
        ref={flatListRef}
        data={ads}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={renderAd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 240,
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 10,
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
});
