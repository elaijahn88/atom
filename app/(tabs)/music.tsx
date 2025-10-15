import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ScrollView,
  StatusBar,
  Linking,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Video from "react-native-video";
import { auth, database, ref, onValue, push } from "../../firebase";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  FadeInDown,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");
const ITEM_WIDTH = width / 2 - 16;
const ITEM_HEIGHT = ITEM_WIDTH * 1.6;

const mediaData = [
  {
    id: "1",
    title: "Chill Beats",
    artist: "DJ Relax",
    artwork: "https://picsum.photos/400/400?random=11",
    promoVideo: "https://xlijah.com/soso.mp4",
    profilePic: "https://randomuser.me/api/portraits/men/10.jpg",
    price: 2.5,
    links: {
      collaborate: "https://example.com/collab/djrelax",
      produce: "https://example.com/produce/djrelax",
    },
  },
  {
    id: "2",
    title: "Upbeat Energy",
    artist: "Electro Vibes",
    artwork: "https://picsum.photos/400/400?random=12",
    promoVideo: "https://xlijah.com/soso.mp4",
    profilePic: "https://randomuser.me/api/portraits/women/11.jpg",
    price: 1.0,
    links: {
      collaborate: "https://example.com/collab/electrovibes",
      produce: "https://example.com/produce/electrovibes",
    },
  },
];

export default function MusicGrid() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");

  const commentScrollRef = useRef<ScrollView>(null);

  const scale = useSharedValue(1);
  const floatingHeartY = useSharedValue(0);
  const floatingHeartOpacity = useSharedValue(0);

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const floatingHeartStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: height / 3 - floatingHeartY.value,
    alignSelf: "center",
    opacity: floatingHeartOpacity.value,
  }));

  useEffect(() => {
    if (!selectedItem) return;
    const likesRef = ref(database, `likes/${selectedItem.id}`);
    const unsubscribeLikes = onValue(likesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const userId = auth.currentUser?.uid || "guest";
      setLiked(!!data[userId]);
      setLikeCount(Object.keys(data).length);
    });

    const commentsRef = ref(database, `comments/${selectedItem.id}`);
    const unsubscribeComments = onValue(commentsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setComments(Object.values(data));
    });

    return () => {
      unsubscribeLikes();
      unsubscribeComments();
    };
  }, [selectedItem]);

  useEffect(() => {
    if (commentScrollRef.current) commentScrollRef.current.scrollToEnd({ animated: true });
  }, [comments]);

  const handleLike = () => {
    if (!selectedItem) return;
    const userId = auth.currentUser?.uid || "guest";
    const likesRef = ref(database, `likes/${selectedItem.id}/${userId}`);

    scale.value = withSpring(1.4, {}, () => (scale.value = withSpring(1)));
    floatingHeartY.value = 0;
    floatingHeartOpacity.value = 1;
    floatingHeartY.value = withTiming(80, { duration: 700, easing: Easing.out(Easing.exp) });
    floatingHeartOpacity.value = withTiming(0, { duration: 700 });

    push(likesRef, liked ? null : true);
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !selectedItem) return;
    const userId = auth.currentUser?.uid || "guest";
    const commentsRef = ref(database, `comments/${selectedItem.id}`);
    push(commentsRef, { userId, text: commentText.trim(), timestamp: Date.now() });
    setCommentText("");
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelectedItem(item)}>
      <Image source={{ uri: item.artwork }} style={styles.video} />
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

      {/* Player Modal */}
      <Modal visible={!!selectedItem} animationType="slide" onRequestClose={closePlayer}>
        {selectedItem && (
          <ScrollView style={styles.playerContainer}>
            <TouchableOpacity onPress={closePlayer} style={styles.closeButton}>
              <Ionicons name="chevron-down" size={30} color="#fff" />
            </TouchableOpacity>

            <View style={styles.playerInfo}>
              <Image source={{ uri: selectedItem.profilePic }} style={styles.modalProfilePic} />
              <Text style={styles.playerTitle}>{selectedItem.title}</Text>
              <Text style={styles.playerArtist}>{selectedItem.artist}</Text>
            </View>

            <Video
              source={{ uri: selectedItem.promoVideo }}
              style={styles.playerVideo}
              resizeMode="cover"
              repeat
              paused={paused}
            />

            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity onPress={handleLike}>
                <Animated.View style={heartAnimatedStyle}>
                  <Ionicons name={liked ? "heart" : "heart-outline"} size={34} color={liked ? "#1DB954" : "#fff"} />
                </Animated.View>
              </TouchableOpacity>
              <Text style={{ color: "#fff", fontSize: 16 }}>{likeCount}</Text>
              <TouchableOpacity onPress={() => setPaused(!paused)}>
                <Ionicons name={paused ? "play-circle" : "pause-circle"} size={68} color="#1DB954" />
              </TouchableOpacity>
            </View>

            {/* Promote & Collaborate */}
            <View style={styles.collabSection}>
              <Text style={styles.collabTitle}>Promote & Collaborate</Text>
              <TouchableOpacity onPress={() => Linking.openURL(selectedItem.links.collaborate)} style={styles.collabButton}>
                <Text style={styles.collabText}>Collaborate</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL(selectedItem.links.produce)} style={styles.collabButton}>
                <Text style={styles.collabText}>Produce</Text>
              </TouchableOpacity>
            </View>

            {/* Comments */}
            <ScrollView ref={commentScrollRef} style={styles.commentList}>
              {comments.map((c, i) => (
                <Animated.View key={i} entering={FadeInDown.duration(300)}>
                  <Text style={styles.comment}>{c.userId}: {c.text}</Text>
                </Animated.View>
              ))}
            </ScrollView>

            <View style={styles.commentBox}>
              <TextInput
                style={styles.input}
                placeholder="Add a comment..."
                placeholderTextColor="#888"
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity onPress={handleAddComment}>
                <Ionicons name="send" size={24} color="#1DB954" />
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  infoContainer: { position: "absolute", bottom: 10, left: 8, right: 8, flexDirection: "row", alignItems: "center" },
  profilePic: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: "#fff" },
  title: { color: "#fff", fontWeight: "700", fontSize: 13 },
  artist: { color: "#ccc", fontSize: 11 },
  playerContainer: { flex: 1, backgroundColor: "#000", paddingTop: 60 },
  closeButton: { position: "absolute", top: 50, left: 20, zIndex: 1 },
  modalProfilePic: { width: 60, height: 60, borderRadius: 30, alignSelf: "center", marginBottom: 10 },
  playerVideo: { width: width * 0.9, height: 250, borderRadius: 12, alignSelf: "center", marginVertical: 10 },
  playerInfo: { alignItems: "center", marginBottom: 10 },
  playerTitle: { color: "#fff", fontSize: 24, fontWeight: "700" },
  playerArtist: { color: "#aaa", fontSize: 16 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", width: "70%", alignSelf: "center", marginVertical: 15 },
  commentList: { width: "90%", maxHeight: 150, backgroundColor: "#111", borderRadius: 10, padding: 10, alignSelf: "center" },
  comment: { color: "#fff", fontSize: 14, marginBottom: 5 },
  commentBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#111", borderRadius: 10, paddingHorizontal: 10, marginTop: 10, width: "90%", alignSelf: "center" },
  input: { flex: 1, color: "#fff", paddingVertical: 8 },
  collabSection: { marginVertical: 15, alignItems: "center" },
  collabTitle: { color: "#1DB954", fontSize: 18, fontWeight: "700", marginBottom: 10 },
  collabButton: { backgroundColor: "#222", paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, marginVertical: 5 },
  collabText: { color: "#fff", fontSize: 16 },
});
