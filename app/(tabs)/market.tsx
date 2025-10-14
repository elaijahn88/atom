import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
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

  // 🔄 Fetch user's products
  useEffect(() => {
    const q = query(
      collection(db, "products"),
      where("sellerEmail", "==", currentUserEmail)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setMyProducts(products);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUserEmail]);

  // 🗑 Delete product
  const handleDelete = async (id: string) => {
    Alert.alert("Delete Product", "Do you really want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => await deleteDoc(doc(db, "products", id)),
      },
    ]);
  };

  // ✏️ Edit product
  const handleEdit = (product: Product) => {
    setProductToEdit(product);
    setName(product.name);
    setPrice(product.price.toString());
    setImage(product.image);
    setEditModal(true);
  };

  // 💾 Save updated product
  const saveEdit = async () => {
    if (!productToEdit) return;
    if (!name.trim() || !price.trim() || !image.trim()) {
      Alert.alert("Incomplete", "All fields are required.");
      return;
    }
    const docRef = doc(db, "products", productToEdit.id);
    await updateDoc(docRef, {
      name: name.trim(),
      price: Number(price),
      image: image.trim(),
    });
    setEditModal(false);
    setProductToEdit(null);
  };

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#121212" : "#f9f9f9" },
      ]}
    >
      <Text style={[styles.header, { color: isDark ? "#fff" : "#000" }]}>
        My Store
      </Text>

      {myProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="cube-outline"
            size={70}
            color={isDark ? "#777" : "#ccc"}
          />
          <Text style={[styles.emptyText, { color: isDark ? "#aaa" : "#777" }]}>
            No products yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={myProducts}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? "#1c1c1e" : "#fff",
                  shadowColor: isDark ? "#000" : "#999",
                },
              ]}
            >
              <Image
                source={{ uri: item.image }}
                style={styles.image}
                resizeMode="cover"
              />
              <Text
                style={[styles.title, { color: isDark ? "#fff" : "#000" }]}
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <Text
                style={[
                  styles.price,
                  { color: isDark ? "#00ff7f" : "#00a650" },
                ]}
              >
                ${item.price}
              </Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => handleEdit(item)}
                  style={[styles.button, styles.editBtn]}
                >
                  <Ionicons name="create-outline" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  style={[styles.button, styles.deleteBtn]}
                >
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* ✏️ Edit Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <TouchableWithoutFeedback
          onPress={() => {
            Keyboard.dismiss();
            setEditModal(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <ScrollView
                contentContainerStyle={styles.modalScroll}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Edit Product</Text>

                  <TextInput
                    placeholder="Product Name"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                  />
                  <TextInput
                    placeholder="Price"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                  <TextInput
                    placeholder="Image URL"
                    value={image}
                    onChangeText={setImage}
                    style={styles.input}
                  />

                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveBtn]}
                    onPress={saveEdit}
                  >
                    <Text style={styles.modalButtonText}>Save Changes</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelBtn]}
                    onPress={() => setEditModal(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: "#333" }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: {
    fontSize: 28,
    fontWeight: "900",
    marginLeft: 20,
    marginBottom: 10,
  },
  list: { paddingHorizontal: 12, paddingBottom: 100 },

  // 🧩 Cards
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 12,
    margin: 8,
    alignItems: "center",
    elevation: 3,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
  },
  image: { width: "100%", height: CARD_WIDTH - 24, borderRadius: 12 },
  title: {
    marginTop: 8,
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
  price: { marginTop: 4, fontWeight: "700", fontSize: 15 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    width: "100%",
  },

  // 🔘 Buttons
  button: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  editBtn: { backgroundColor: "#007aff" },
  deleteBtn: { backgroundColor: "#ff3b30" },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },

  // ✏️ Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalScroll: { justifyContent: "center", alignItems: "center", flexGrow: 1 },
  modalContent: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
    backgroundColor: "#f0f0f0",
  },
  modalButton: {
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 10,
  },
  saveBtn: { backgroundColor: "#25D366" },
  cancelBtn: { backgroundColor: "#ccc" },
  modalButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // 💤 Empty state
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { marginTop: 12, fontSize: 16 },

  // ⏳ Loading
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
