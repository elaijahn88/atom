import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Image,
  TouchableOpacity,
  useColorScheme,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import Video from "react-native-video";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

const { height, width } = Dimensions.get("window");

type MediaItem = {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  audioUrl: string;
  promoVideo?: string;
};

const mediaData: MediaItem[] = [
  {
    id: "1",
    title: "Chill Beats",
    artist: "DJ Relax",
    artwork: "https://picsum.photos/300/300?random=1",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    promoVideo: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
  {
    id: "2",
    title: "Upbeat Energy",
    artist: "Electro Vibes",
    artwork: "https://picsum.photos/300/300?random=2",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    id: "3",
    title: "Summer Vibes",
    artist: "Sunny Tunes",
    artwork: "https://picsum.photos/300/300?random=3",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    promoVideo: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
];

export default function MediaFeed() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [likes, setLikes] = useState<{ [key: string]: boolean }>({});
  const videoRefs = useRef<Array<Video | null>>([]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
      setProgress(0);
      setPaused(false);
    }
  }).current;

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 80 });

  const handleEnd = () => {
    if (currentIndex < mediaData.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      setPaused(true);
    }
  };

  const flatListRef = useRef<FlatList>(null);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#000" : "#f9f9f9" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <FlatList
        ref={flatListRef}
        data={mediaData}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfigRef.current}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            {item.promoVideo ? (
              <Video
                source={{ uri: item.promoVideo }}
                ref={(ref) => (videoRefs.current[index] = ref)}
                style={styles.video}
                resizeMode="cover"
                repeat={false}
                paused={index !== currentIndex || paused}
                onProgress={(data) => setProgress(data.currentTime / (data.seekableDuration || 1))}
                onEnd={handleEnd}
              />
            ) : (
              <Video
                source={{ uri: item.audioUrl }}
                ref={(ref) => (videoRefs.current[index] = ref)}
                style={styles.video}
                audioOnly
                paused={index !== currentIndex || paused}
                onProgress={(data) => setProgress(data.currentTime / (data.seekableDuration || 1))}
                onEnd={handleEnd}
              />
            )}

            {/* Overlay */}
            <View style={styles.overlay}>
              <Text style={[styles.title, { color: "#fff" }]}>{item.title}</Text>
              <Text style={[styles.artist, { color: "#ccc" }]}>{item.artist}</Text>

              {/* Progress Bar */}
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { flex: progress }]} />
                <View style={[styles.progressBarRemaining, { flex: 1 - progress }]} />
              </View>

              {/* Controls */}
              <TouchableOpacity
                style={styles.playPauseBtn}
                onPress={() => setPaused(!paused)}
              >
                <Ionicons
                  name={paused || index !== currentIndex ? "play-circle" : "pause-circle"}
                  size={60}
                  color="#fff"
                />
              </TouchableOpacity>

              {/* Social Buttons */}
              <View style={styles.socialRow}>
                <TouchableOpacity
                  style={styles.socialBtn}
                  onPress={() => setLikes({ ...likes, [item.id]: !likes[item.id] })}
                >
                  <Ionicons
                    name={likes[item.id] ? "heart" : "heart-outline"}
                    size={32}
                    color={likes[item.id] ? "red" : "#fff"}
                  />
                  <Text style={styles.socialText}>Like</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn}>
                  <Ionicons name="chatbubble-outline" size={32} color="#fff" />
                  <Text style={styles.socialText}>Comment</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn}>
                  <MaterialIcons name="share" size={32} color="#fff" />
                  <Text style={styles.socialText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    width,
    height,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "#000",
  },
  video: {
    width,
    height,
    position: "absolute",
    top: 0,
    left: 0,
  },
  overlay: {
    width,
    padding: 20,
    position: "absolute",
    bottom: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 6,
  },
  artist: {
    fontSize: 16,
    marginBottom: 12,
  },
  playPauseBtn: {
    alignSelf: "center",
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    flexDirection: "row",
    marginBottom: 12,
  },
  progressBarFill: {
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  progressBarRemaining: {
    backgroundColor: "transparent",
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
  },
  socialBtn: {
    alignItems: "center",
  },
  socialText: {
    color: "#fff",
    marginTop: 4,
    fontSize: 12,
  },
});
