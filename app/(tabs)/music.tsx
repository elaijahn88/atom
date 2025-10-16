import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
} from "react-native";
import Video from "react-native-video";
import { Ionicons } from "@expo/vector-icons";
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

export default function MusicScreen() {
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

  const videoItem = {
    id: "1",
    title: "Chill Beats",
    artist: "DJ Relax",
    artwork: "https://picsum.photos/400/400?random=11",
    promoVideo: "https://xlijah.com/soso.mp4",
    profilePic: "https://randomuser.me/api/portraits/men/10.jpg",
    links: {
      collaborate: "https://example.com/collab/djrelax",
      produce: "https://example.com/produce/djrelax",
    },
  };

  // Listen for likes and comments
  useEffect(() => {
    const likesRef = ref(database, `likes/${videoItem.id}`);
    const unsubscribeLikes = onValue(likesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const userId = auth.currentUser?.uid || "guest";
      setLiked(!!data[userId]);
      setLikeCount(Object.keys(data).length);
    });

    const commentsRef = ref(database, `comments/${videoItem.id}`);
    const unsubscribeComments = onValue(commentsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setComments(Object.values(data));
    });

    return () => {
      unsubscribeLikes();
      unsubscribeComments();
    };
  }, []);

  // Auto scroll comments
  useEffect(() => {
    if (commentScrollRef.current) commentScrollRef.current.scrollToEnd({ animated: true });
  }, [comments]);

  // Like animation & database update
  const handleLike = () => {
    const userId = auth.currentUser?.uid || "guest";
    const likesRef = ref(database, `likes/${videoItem.id}/${userId}`);

    scale.value = withSpring(1.4, {}, () => (scale.value = withSpring(1)));
    floatingHeartY.value = 0;
    floatingHeartOpacity.value = 1;
    floatingHeartY.value = withTiming(80, { duration: 700, easing: Easing.out(Easing.exp) });
    floatingHeartOpacity.value = withTiming(0, { duration: 700 });

    push(likesRef, liked ? null : true);
  };

  // Add comment to database
  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const userId = auth.currentUser?.uid || "guest";
    const commentsRef = ref(database, `comments/${videoItem.id}`);
    push(commentsRef, { userId, text: commentText.trim(), timestamp: Date.now() });
    setCommentText("");
  };

  // Collaborate button - open URL + log in DB
  const handleCollaborate = async () => {
    const url = videoItem.links.collaborate;
    const userId = auth.currentUser?.uid || "guest";
    try {
      // Save action to user in DB
      const userActionsRef = ref(database, `users/${userId}/actions`);
      push(userActionsRef, { type: "collaborate", videoId: videoItem.id, timestamp: Date.now() });

      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert("Cannot open the link:", url);
    } catch (err) {
      console.log(err);
    }
  };

  // Produce button - open URL + log in DB
  const handleProduce = async () => {
    const url = videoItem.links.produce;
    const userId = auth.currentUser?.uid || "guest";
    try {
      // Save action to user in DB
      const userActionsRef = ref(database, `users/${userId}/actions`);
      push(userActionsRef, { type: "produce", videoId: videoItem.id, timestamp: Date.now() });

      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert("Cannot open the link:", url);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[floatingHeartStyle]}>
        <Ionicons name="heart" size={80} color="#1DB954" />
      </Animated.View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Video */}
        <View style={styles.videoContainer}>
          <Video
            source={{ uri: videoItem.promoVideo }}
            style={styles.playerVideo}
            resizeMode="cover"
            repeat
            paused={paused}
          />
        </View>

        {/* Video Info */}
        <View style={styles.playerInfo}>
          <Image source={{ uri: videoItem.profilePic }} style={styles.profilePic} />
          <Text style={styles.playerTitle}>{videoItem.title}</Text>
          <Text style={styles.playerArtist}>{videoItem.artist}</Text>
        </View>

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

        {/* Collaborate / Produce */}
        <View style={styles.collabSection}>
          <Text style={styles.collabTitle}>Promote & Collaborate</Text>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 15 }}>
            <TouchableOpacity onPress={handleCollaborate} style={styles.collabButton}>
              <Text style={styles.collabText}>Collaborate</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleProduce} style={styles.collabButton}>
              <Text style={styles.collabText}>Produce</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments */}
        <ScrollView ref={commentScrollRef} style={styles.commentList}>
          {comments.map((c, i) => (
            <Animated.View key={i} entering={FadeInDown.duration(300)}>
              <Text style={styles.comment}>{c.userId}: {c.text}</Text>
            </Animated.View>
          ))}
        </ScrollView>

        {/* Add Comment */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  videoContainer: { marginTop: 20, alignItems: "center" },
  playerVideo: { width: width * 0.9, height: 250, borderRadius: 12 },
  playerInfo: { alignItems: "center", marginVertical: 15 },
  profilePic: { width: 60, height: 60, borderRadius: 30, marginBottom: 10 },
  playerTitle: { color: "#fff", fontSize: 24, fontWeight: "700" },
  playerArtist: { color: "#aaa", fontSize: 16 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", width: "70%", alignSelf: "center", marginVertical: 15 },
  collabSection: { marginVertical: 15, alignItems: "center" },
  collabTitle: { color: "#1DB954", fontSize: 18, fontWeight: "700", marginBottom: 10 },
  collabButton: { backgroundColor: "#222", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  collabText: { color: "#fff", fontSize: 16 },
  commentList: { width: "90%", maxHeight: 150, backgroundColor: "#111", borderRadius: 10, padding: 10, alignSelf: "center" },
  comment: { color: "#fff", fontSize: 14, marginBottom: 5 },
  commentBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#111", borderRadius: 10, paddingHorizontal: 10, marginTop: 10, width: "90%", alignSelf: "center" },
  input: { flex: 1, color: "#fff", paddingVertical: 8 },
});
