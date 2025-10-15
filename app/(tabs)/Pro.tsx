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
  const [cart, setCart] = useState<Product[]>([]);
  const [editModal, setEditModal] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // 🧠 Sample fallback products
  const sampleProducts: Product[] = [
    {
      id: "12",
      name: "iPhone 12",
      price: 799,
      image: "https://xlijah.com/pics/phones/iphone/12.jpg",
      sellerEmail: "sample@store.com",
    },
    {
      id: "13",
      name: "iPhone 13",
      price: 899,
      image: "https://xlijah.com/pics/phones/iphone/13.jpg",
      sellerEmail: "sample@store.com",
    },
    {
      id: "14",
      name: "iPhone 14",
      price: 999,
      image: "https://xlijah.com/pics/phones/iphone/14.jpg",
      sellerEmail: "sample@store.com",
    },
    {
      id: "15",
      name: "iPhone 15",
      price: 1099,
      image: "https://xlijah.com/pics/phones/iphone/15.jpg",
      sellerEmail: "sample@store.com",
    },
    {
      id: "16",
      name: "iPhone 16",
      price: 1199,
      image: "https://xlijah.com/pics/phones/iphone/16.jpg",
      sellerEmail: "sample@store.com",
    },
    {
      id: "17",
      name: "iPhone 17",
      price: 1299,
      image: "https://xlijah.com/pics/phones/iphone/17.jpg",
      sellerEmail: "sample@store.com",
    },
  ];

  // 🧩 Firestore listener
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
            } as Product;
          });
          setMyProducts(products);
        },
        (error) => {
          console.error("Snapshot error:", error);
          Alert.alert("Error", "Failed to load your store items.");
        }
      );
      return () => unsubscribe();
    } catch (error) {
      console.error("Query error:", error);
    }
  }, [currentUserEmail]);

  // 🗑 Delete
  const handleDelete = async (id: string) => {
    Alert.alert("Delete Product", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "products", id));
          } catch (err) {
            console.error("Delete failed:", err);
            Alert.alert("Error", "Failed to delete product.");
          }
        },
      },
    ]);
  };

  // ✏️ Edit
  const handleEdit = (product: Product) => {
    setProductToEdit(product);
    setName(product.name || "");
    setPrice(product.price?.toString() || "");
    setImage(product.image || "");
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!productToEdit) return;
    if (!name.trim() || !price.trim() || isNaN(Number(price))) {
      Alert.alert("Error", "Please enter valid name and price.");
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
      console.error("Update failed:", err);
      Alert.alert("Error", "Failed to save changes.");
    }
  };

  // 🛒 Add to cart
  const addToCart = (item: Product) => {
    setCart((prev) => [...prev, item]);
    Alert.alert("Added to Cart", `${item.name} added successfully`);
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
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
              : "https://xlijah.com/pics/phones/iphone/14.jpg",
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
          onPress={() => addToCart(item)}
          style={[styles.smallBtn, { backgroundColor: "#00cc66" }]}
        >
          <Ionicons name="cart-outline" size={18} color="#fff" />
        </TouchableOpacity>
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
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#121212" : "#fafafa" },
      ]}
    >
      <Text style={[styles.header, { color: isDark ? "#fff" : "#111" }]}>
        My Store
      </Text>

      <FlatList
        data={myProducts.length > 0 ? myProducts : sampleProducts}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={renderProduct}
      />

      {/* 🛒 Floating Payment Cart */}
      {cart.length > 0 && (
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() =>
            Alert.alert(
              "Payment Summary",
              `Items: ${cart.length}\nTotal: $${totalPrice.toFixed(2)}`
            )
          }
        >
          <Ionicons name="cart" size={30} color="#fff" />
          <View style={styles.cartBadge}>
            <Text style={styles.cartCount}>{cart.length}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  header: {
    fontSize: 26,
    fontWeight: "900",
    marginLeft: 20,
    marginBottom: 16,
  },
  list: { paddingHorizontal: 12, paddingBottom: 120 },
  card: {
    width: CARD_WIDTH,
    borderRadius: 14,
    padding: 10,
    margin: 8,
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
    justifyContent: "space-between",
    marginTop: 8,
    gap: 6,
  },
  smallBtn: {
    flex: 1,
    padding: 6,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cartButton: {
    position: "absolute",
    right: 20,
    bottom: 30,
    backgroundColor: "#ff7f00",
    padding: 16,
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ff3b30",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cartCount: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
