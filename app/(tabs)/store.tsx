import React from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Animated,
  StyleSheet,
  Dimensions,
  ListRenderItemInfo,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStoreLogic } from "../logic/storeLogic";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

// 🛍️ Define item type
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  featured?: boolean;
}

// 🔁 Hook return type (optional if already typed inside storeLogic.ts)
interface StoreLogic {
  filtered: Product[];
  cartTotal: number;
  toast: { type: "success" | "error"; message: string } | null;
  toastAnim: Animated.Value;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  addToCart: (item: Product) => void;
  removeFromCart: (id: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export default function MyStore() {
  const {
    filtered,
    cartTotal,
    toast,
    toastAnim,
    search,
    setSearch,
    addToCart,
    removeFromCart,
    onRefresh,
    refreshing,
  }: StoreLogic = useStoreLogic();

  const renderItem = ({ item }: ListRenderItemInfo<Product>) => (
    <TouchableOpacity style={styles.card}>
      {item.featured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredText}>FEATURED</Text>
        </View>
      )}
      <Image source={{ uri: item.image }} style={styles.image} />
      <Text style={styles.title}>{item.name}</Text>
      <Text style={styles.description}>{item.description}</Text>
      <Text style={styles.price}>${item.price}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => addToCart(item)}
          style={[styles.btn, { backgroundColor: "#34c759" }]}
        >
          <Ionicons name="cart" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => removeFromCart(item.id)}
          style={[styles.btn, { backgroundColor: "#ff3b30" }]}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Toast */}
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            {
              backgroundColor: toast.type === "success" ? "#34c759" : "#ff3b30",
              transform: [{ translateY: toastAnim }],
            },
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Store</Text>
        <Text style={{ color: "#ff7f00", fontWeight: "bold" }}>
          Cart: ${cartTotal.toFixed(2)}
        </Text>
      </View>

      {/* Search */}
      <View style={{ flexDirection: "row", marginHorizontal: 20, marginBottom: 10 }}>
        <TextInput
          placeholder="Search iPhones..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          style={[styles.input, { flex: 1 }]}
        />
        <TouchableOpacity
          onPress={onRefresh}
          style={[styles.btn, { marginLeft: 8, backgroundColor: "#00BFFF" }]}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Product Grid */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", paddingTop: 40 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 10,
  },
  header: { color: "#fff", fontSize: 24, fontWeight: "900" },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 10,
    margin: 8,
  },
  image: { width: "100%", height: CARD_WIDTH, borderRadius: 10 },
  title: { color: "#fff", fontWeight: "700", marginTop: 8 },
  description: { color: "#aaa", fontSize: 12, marginTop: 4 },
  price: { color: "#ff7f00", fontWeight: "800", marginTop: 6 },
  row: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, gap: 8 },
  btn: { padding: 8, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  featuredBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#ff7f00",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  toast: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 10,
    zIndex: 999,
    elevation: 5,
  },
  toastText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  input: {
    backgroundColor: "#1f1f1f",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#fff",
  },
});
