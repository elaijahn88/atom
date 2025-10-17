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
  Animated,
} from "react-native";
import Video from "react-native-video";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../firebase";
import { doc, onSnapshot, push, ref as rtdbRef, onValue } from "firebase/database";

const { width } = Dimensions.get("window");

export default function MusicScreen() {
  const [paused, setPaused] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videos, setVideos] = useState<string[]>([]);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [showHeart, setShowHeart] = useState(false);
  const [labelMessage, setLabelMessage] = useState("");

  const commentScrollRef = useRef<ScrollView>(null);
  const heartScale = useRef(new Animated.Value(1)).current;

  // 🔄 Load video URLs from Firestore collection `music` document `name` field `oma` (array)
  useEffect(() => {
    const docRef = doc(db, "music", "name");
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data?.oma)) {
          setVideos(data.oma);
          setCurrentVideoIndex(0);
        } else {
          console.warn("'oma' field is missing or not an array!");
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Loop videos
  const handleEnd = () => {
    setCurrentVideoIndex((prev) => (prev + 1) % videos.length);
  };

  // Auto-scroll comments
  useEffect(() => {
    if (commentScrollRef.current) commentScrollRef.current.scrollToEnd({ animated: true });
  }, [comments]);

  // Like button handler with floating heart
  const handleLike = () => {
    const userId = auth.currentUser?.uid || "guest";
    const likesRef = rtdbRef(db, `likes/video1/${userId}`);

    setShowHeart(true);
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.5, duration: 200, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowHeart(false));

    push(likesRef, liked ? null : true);
  };

  // Add comment handler
  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const userId = auth.currentUser?.uid || "guest";
    const commentsRef = rtdbRef(db, `comments/video1`);
    push(commentsRef, { userId, text: commentText.trim(), timestamp: Date.now() });
    setCommentText("");
  };

  // Show inline label
  const showLabel = (msg: string) => {
    setLabelMessage(msg);
    setTimeout(() => setLabelMessage(""), 3000);
  };

  // Example collaborate/produce buttons (static links)
  const handleLink = async (url: string, type: string) => {
    const userId = auth.currentUser?.uid || "guest";
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else showLabel(`Cannot open ${type} link`);
    } catch {
      showLabel(`Error opening ${type} link`);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {labelMessage ? (
        <View style={styles.labelContainer}>
          <Text style={styles.labelText}>{labelMessage}</Text>
        </View>
      ) : null}
      {showHeart && (
        <Animated.View
          style={{
            position: "absolute",
            top: 150,
            alignSelf: "center",
            transform: [{ scale: heartScale }],
            zIndex: 2,
          }}
        >
          <Ionicons name="heart" size={80} color="#1DB954" />
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Video Player */}
        <View style={styles.videoContainer}>
          {videos.length > 0 && (
            <Video
              source={{ uri: videos[currentVideoIndex] }}
              style={styles.playerVideo}
              resizeMode="cover"
              repeat={false}
              paused={paused}
              onEnd={handleEnd}
            />
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={handleLike}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={34} color={liked ? "#1DB954" : "#fff"} />
          </TouchableOpacity>
          <Text style={{ color: "#fff", fontSize: 16 }}>{likeCount}</Text>
          <TouchableOpacity onPress={() => setPaused(!paused)}>
            <Ionicons name={paused ? "play-circle" : "pause-circle"} size={68} color="#1DB954" />
          </TouchableOpacity>
        </View>

        {/* Comments */}
        <ScrollView ref={commentScrollRef} style={styles.commentList}>
          {comments.map((c, i) => (
            <View key={i}>
              <Text style={styles.comment}>{c.userId}: {c.text}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Comment Input */}
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
  labelContainer: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    backgroundColor: "#222",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    zIndex: 5,
  },
  labelText: { color: "#fff", fontSize: 14 },
  videoContainer: { marginTop: 20, alignItems: "center" },
  playerVideo: { width: width * 0.9, height: 250, borderRadius: 12 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "70%",
    alignSelf: "center",
    marginVertical: 15,
  },
  commentList: {
    width: "90%",
    maxHeight: 150,
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 10,
    alignSelf: "center",
    marginTop: 10,
  },
  comment: { color: "#fff", fontSize: 14, marginBottom: 5 },
  commentBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginTop: 10,
    width: "90%",
    alignSelf: "center",
  },
  input: { flex: 1, color: "#fff", paddingVertical: 8 },
});
