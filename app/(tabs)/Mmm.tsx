import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;
const ITEMS_PER_PAGE = 6; // 2 columns × 3 rows

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  sellerEmail: string;
  description?: string;
};

export default function MyStore({
  currentUserEmail,
}: {
  currentUserEmail: string;
}) {
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    if (!currentUserEmail) return;
    try {
      const q = query(
        collection(db, "products"),
        where("sellerEmail", "==", currentUserEmail)
      );
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const products = snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as Partial<Product>;
            return {
              id: docSnap.id,
              name: data.name || "Unnamed Product",
              price: typeof data.price === "number" ? data.price : 0,
              image: data.image || "",
              sellerEmail: data.sellerEmail || "",
              description: data.description || "",
            };
          }) as Product[];
          setMyProducts(products);
          setLoading(false);
        },
        (error) => {
          console.error("Snapshot error:", error);
          Alert.alert("Error", "Failed to load store items.");
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.error("Query error:", err);
      setLoading(false);
    }
  }, [currentUserEmail]);

  const handleDelete = async (id: string) => {
    Alert.alert("Delete Product", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "products", id));
          } catch (err) {
            console.error("Delete error:", err);
            Alert.alert("Error", "Failed to delete product.");
          }
        },
      },
    ]);
  };

  const handleEdit = (product: Product) => {
    setProductToEdit(product);
    setName(product.name);
    setPrice(product.price.toString());
    setImage(product.image);
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!productToEdit) return;
    if (!name.trim() || !price.trim() || isNaN(Number(price))) {
      Alert.alert("Invalid Input", "Enter a valid product name and price.");
      return;
    }

    try {
      const docRef = doc(db, "products", productToEdit.id);
      await updateDoc(docRef, {
        name: name.trim(),
        price: Number(price),
        image: image.trim(),
      });
      setEditModal(false);
      setProductToEdit(null);
    } catch (err) {
      console.error("Update error:", err);
      Alert.alert("Error", "Failed to save changes.");
    }
  };

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff7f00" />
        <Text style={{ marginTop: 12, color: "#888" }}>Loading store...</Text>
      </View>
    );

  const pages: Product[][] = [];
  for (let i = 0; i < myProducts.length; i += ITEMS_PER_PAGE) {
    pages.push(myProducts.slice(i, i + ITEMS_PER_PAGE));
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? "#121212" : "#fafafa" }]}
      pagingEnabled
    >
      {pages.map((pageItems, pageIndex) => (
        <View key={pageIndex} style={styles.page}>
          {pageItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.9}
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? "#1c1c1e" : "#fff",
                  shadowColor: isDark ? "#000" : "#ddd",
                },
              ]}
            >
              <Image
                source={{
                  uri:
                    item.image && item.image.startsWith("http")
                      ? item.image
                      : "https://xlijah.com/pics/phones/iphone/12.jpg",
                }}
                style={styles.image}
              />
              <View style={styles.cardBody}>
                <Text
                  style={[styles.title, { color: isDark ? "#fff" : "#111" }]}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                <Text
                  style={[styles.price, { color: isDark ? "#00ff88" : "#ff7f00" }]}
                >
                  ${item.price}
                </Text>
              </View>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={() => handleEdit(item)}
                  style={[styles.smallBtn, { backgroundColor: "#007aff" }]}
                >
                  <Ionicons name="create-outline" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  style={[styles.smallBtn, { backgroundColor: "#ff3b30" }]}
                >
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* ✏️ Edit Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: isDark ? "#222" : "#fff" },
              ]}
            >
              <Text
                style={[
                  styles.modalTitle,
                  { color: isDark ? "#fff" : "#000" },
                ]}
              >
                Edit Product
              </Text>
              <TextInput
                placeholder="Product Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholderTextColor="#999"
              />
              <TextInput
                placeholder="Price"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                style={styles.input}
                placeholderTextColor="#999"
              />
              <TextInput
                placeholder="Image URL"
                value={image}
                onChangeText={setImage}
                style={styles.input}
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#ff7f00" }]}
                onPress={saveEdit}
              >
                <Text style={styles.modalBtnText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#ddd" }]}
                onPress={() => setEditModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: "#333" }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  page: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
    elevation: 3,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  image: { width: "100%", height: CARD_WIDTH, borderRadius: 10 },
  cardBody: { marginTop: 8 },
  title: { fontWeight: "700", fontSize: 15, textAlign: "left" },
  price: { fontWeight: "800", marginTop: 4, fontSize: 16 },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 6,
  },
  smallBtn: {
    padding: 6,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { borderRadius: 20, padding: 20 },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 15,
  },
  modalBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
    alignItems: "center",
  },
  modalBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
