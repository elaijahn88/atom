import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  StatusBar,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Video from "react-native-video";

const { width, height } = Dimensions.get("window");
const ITEM_WIDTH = width / 2 - 16;
const ITEM_HEIGHT = ITEM_WIDTH * 1.4;

type MediaItem = {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  audioUrl: string;
  promoVideo?: string;
  profilePic?: string;
  price?: number;
};

const mediaData: MediaItem[] = [
  {
    id: "1",
    title: "Chill Beats",
    artist: "DJ Relax",
    artwork: "https://picsum.photos/400/400?random=11",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    promoVideo: "https://xlijah.com/soso.mp4",
    profilePic: "https://randomuser.me/api/portraits/men/10.jpg",
    price: 2.5,
  },
  {
    id: "2",
    title: "Upbeat Energy",
    artist: "Electro Vibes",
    artwork: "https://picsum.photos/400/400?random=12",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    promoVideo: "https://xlijah.com/soso.mp4",
    profilePic: "https://randomuser.me/api/portraits/women/11.jpg",
    price: 1.0,
  },
  {
    id: "3",
    title: "Sunny Tunes",
    artist: "Sunny Tunes",
    artwork: "https://picsum.photos/400/400?random=13",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    promoVideo: "https://xlijah.com/soso.mp4",
    profilePic: "https://randomuser.me/api/portraits/men/12.jpg",
    price: 3.0,
  },
];

export default function MusicGrid() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(false);

  const renderItem = ({ item }: { item: MediaItem }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.card}
      onPress={() => setSelectedItem(item)}
    >
      {item.promoVideo ? (
        <Video
          source={{ uri: item.promoVideo }}
          style={styles.video}
          resizeMode="cover"
          repeat
          muted
        />
      ) : (
        <Image source={{ uri: item.artwork }} style={styles.video} />
      )}

      <View style={styles.overlay} />
      <View style={styles.infoContainer}>
        <Image source={{ uri: item.profilePic }} style={styles.profilePic} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.artist}>{item.artist}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const closePlayer = () => setSelectedItem(null);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <FlatList
        data={mediaData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      {/* Spotify-like Full Player Modal */}
      <Modal
        visible={!!selectedItem}
        animationType="slide"
        onRequestClose={closePlayer}
      >
        {selectedItem && (
          <View style={styles.playerContainer}>
            <TouchableOpacity
              onPress={closePlayer}
              style={styles.closeButton}
            >
              <Ionicons name="chevron-down" size={30} color="#fff" />
            </TouchableOpacity>

            {selectedItem.promoVideo ? (
              <Video
                source={{ uri: selectedItem.promoVideo }}
                style={styles.playerVideo}
                resizeMode="cover"
                repeat
                paused={paused}
              />
            ) : (
              <Image
                source={{ uri: selectedItem.artwork }}
                style={styles.playerVideo}
              />
            )}

            <View style={styles.playerInfo}>
              <Text style={styles.playerTitle}>{selectedItem.title}</Text>
              <Text style={styles.playerArtist}>{selectedItem.artist}</Text>
            </View>

            {/* Player Controls */}
            <View style={styles.controls}>
              <TouchableOpacity onPress={() => setLiked(!liked)}>
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={30}
                  color={liked ? "#1DB954" : "#fff"}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setPaused(!paused)}>
                <Ionicons
                  name={paused ? "play-circle" : "pause-circle"}
                  size={68}
                  color="#1DB954"
                />
              </TouchableOpacity>

              <TouchableOpacity>
                <Ionicons name="share-outline" size={30} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.price}>
              💳 Price: ${selectedItem.price?.toFixed(2)}
            </Text>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { justifyContent: "space-between", paddingHorizontal: 8 },
  listContent: { paddingVertical: 12 },
  card: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    backgroundColor: "#111",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  video: { ...StyleSheet.absoluteFillObject, borderRadius: 12 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  infoContainer: {
    position: "absolute",
    bottom: 10,
    left: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  profilePic: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  title: { color: "#fff", fontWeight: "700", fontSize: 13 },
  artist: { color: "#ccc", fontSize: 11 },

  // Full Player
  playerContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 1,
  },
  playerVideo: {
    width: width * 0.9,
    height: height * 0.5,
    borderRadius: 20,
    marginBottom: 20,
  },
  playerInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  playerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  playerArtist: {
    color: "#aaa",
    fontSize: 16,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "70%",
    marginBottom: 30,
  },
  price: {
    color: "#1DB954",
    fontSize: 16,
  },
});
