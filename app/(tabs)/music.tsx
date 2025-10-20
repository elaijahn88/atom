import React from "react";
import { View, Text, StatusBar, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions } from "react-native";
import Video from "react-native-video";
import { Ionicons } from "@expo/vector-icons";
import { useMediaAutoPlayAds } from "./useMediaAutoPlayAds";

const { width, height } = Dimensions.get("window");

export default function MediaAutoPlayAdsUI() {
  const { state, refs, actions } = useMediaAutoPlayAds();

  if (state.loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Loading media...</Text>
      </View>
    );
  }

  if (state.errorLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: "red", textAlign: "center", marginBottom: 12 }}>
          {state.errorLoading}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={actions.fetchUrls}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state.urls.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>No media URLs available in `ads/paid.1`.</Text>
      </View>
    );
  }

  const currentUrl = state.urls[state.currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Video
        ref={refs.videoRef}
        source={{ uri: currentUrl }}
        style={styles.video}
        resizeMode="cover"
        paused={state.paused}
        muted={state.muted}
        onEnd={actions.handleEnd}
        onError={actions.handleError}
        repeat={false}
      />

      <View style={styles.overlay}>
        <Text numberOfLines={1} style={styles.trackText}>
          Playing {state.currentIndex + 1} / {state.urls.length}
        </Text>

        <View style={styles.controls}>
          <TouchableOpacity onPress={actions.handlePrev} style={styles.controlBtn}>
            <Ionicons name="play-skip-back" size={36} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={actions.togglePaused} style={styles.controlBtn}>
            <Ionicons name={state.paused ? "play" : "pause"} size={48} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={actions.handleNext} style={styles.controlBtn}>
            <Ionicons name="play-skip-forward" size={36} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={actions.toggleMuted} style={[styles.controlBtn, { marginLeft: 10 }]}>
            <Ionicons name={state.muted ? "volume-mute" : "volume-high"} size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text numberOfLines={1} style={styles.urlText}>{currentUrl}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { justifyContent: "center", alignItems: "center" },
  video: { width, height, position: "absolute", top: 0, left: 0 },
  overlay: { position: "absolute", bottom: 40, left: 0, right: 0, alignItems: "center", paddingHorizontal: 18 },
  trackText: { color: "#fff", fontWeight: "700", marginBottom: 12, fontSize: 16 },
  controls: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.35)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 40 },
  controlBtn: { marginHorizontal: 10, alignItems: "center", justifyContent: "center" },
  urlText: { color: "#ddd", fontSize: 12, marginTop: 12, width: "100%" },
  retryBtn: { backgroundColor: "#2196F3", paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8 },
});
