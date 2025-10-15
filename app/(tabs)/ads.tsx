import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Animated,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Video from "react-native-video";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "react-native";

const { width } = Dimensions.get("window");

const ads = [
  {
    id: "1",
    video: "https://xlijah.com/soso.mp4",
    title: "Shop iPhone 16 Now",
    description: "Experience next-level performance with the A18 Pro Chip.",
    link: "https://www.apple.com",
    profile: "https://i.pravatar.cc/100?img=5",
  },
  {
    id: "2",
    video: "https://xlijah.com/soso.mp4",
    title: "Stream Your Favorite Music",
    description: "Join Beats X for unlimited premium tracks.",
    link: "https://www.spotify.com",
    profile: "https://i.pravatar.cc/100?img=11",
  },
  {
    id: "3",
    video: "https://xlijah.com/soso.mp4",
    title: "Upgrade Your Style",
    description: "Discover fashion deals up to 70% off.",
    link: "https://www.jumia.ug",
    profile: "https://i.pravatar.cc/100?img=8",
  },
];

const mainVideo = {
  video: "https://xlijah.com/soso.mp4",
  title: "Main Content Video",
  description: "This is your main content after ads.",
};

export default function AdBanner() {
  const isDark = useColorScheme() === "dark";
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSkip, setShowSkip] = useState(false);
  const [showMain, setShowMain] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Animate fade-in for each ad
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start();

    setCountdown(5);
    setShowSkip(false);

    const skipTimer = setTimeout(() => setShowSkip(true), 5000);
    const countInterval = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);

    return () => {
      clearTimeout(skipTimer);
      clearInterval(countInterval);
      progressAnim.setValue(0);
    };
  }, [currentIndex]);

  const handleEnd = () => {
    if (currentIndex < ads.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowMain(true);
    }
  };

  const handleSkip = () => {
    Haptics.selectionAsync();
    handleEnd();
  };

  const openLink = async (url: string) => {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  if (showMain) {
    return (
      <View style={styles.container}>
        <Video
          source={{ uri: mainVideo.video }}
          style={styles.video}
          resizeMode="cover"
          repeat
          paused={false}
        />
        <View style={styles.mainOverlay}>
          <Text style={styles.mainTitle}>{mainVideo.title}</Text>
          <Text style={styles.mainDesc}>{mainVideo.description}</Text>
        </View>
      </View>
    );
  }

  const currentAd = ads[currentIndex];
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, backgroundColor: isDark ? "#000" : "#fff" },
      ]}
    >
      {/* 🎥 Ad Video */}
      <Video
        source={{ uri: currentAd.video }}
        style={styles.video}
        resizeMode="cover"
        paused={false}
        onEnd={handleEnd}
      />

      {/* Gradient overlay */}
      <View style={styles.overlay}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Text style={styles.adBadge}>Ad • {countdown}s left</Text>

          {showSkip && (
            <TouchableOpacity
              onPress={handleSkip}
              style={styles.skipButton}
              activeOpacity={0.8}
            >
              <Text style={styles.skipText}>Skip Ad</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[styles.progressBar, { width: progressWidth }]}
          />
        </View>

        {/* Profile Row */}
        <View style={styles.profileRow}>
          <Image source={{ uri: currentAd.profile }} style={styles.profilePic} />
          <View style={{ flex: 1 }}>
            <Text style={styles.channelName}>{currentAd.title}</Text>
            <Text style={styles.desc}>{currentAd.description}</Text>
          </View>
        </View>

        {/* Learn More CTA */}
        <TouchableOpacity
          style={styles.learnMore}
          onPress={() => openLink(currentAd.link)}
          activeOpacity={0.8}
        >
          <Text style={styles.learnText}>Learn more</Text>
          <Ionicons
            name="arrow-forward-circle-outline"
            size={18}
            color="#00cc66"
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>

      {/* Dot Indicators */}
      <View style={styles.indicatorContainer}>
        {ads.map((_, i) => (
          <View
            key={i}
            style={[
              styles.indicator,
              { backgroundColor: i === currentIndex ? "#00cc66" : "#ccc" },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  adBadge: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  skipButton: {
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  skipText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  progressContainer: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBar: {
    height: 3,
    backgroundColor: "#00cc66",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  profilePic: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  channelName: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  desc: {
    color: "#ddd",
    fontSize: 12,
  },
  learnMore: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  learnText: {
    color: "#00cc66",
    fontWeight: "600",
  },
  indicatorContainer: {
    position: "absolute",
    bottom: 6,
    flexDirection: "row",
    justifyContent: "center",
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  mainOverlay: {
    position: "absolute",
    bottom: 20,
    left: 20,
  },
  mainTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  mainDesc: {
    color: "#ddd",
    fontSize: 14,
    marginTop: 4,
  },
});
