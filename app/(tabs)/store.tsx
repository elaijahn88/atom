import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  RefreshControl,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  description?: string;
  featured?: boolean;
};

type CartItem = Product & { quantity: number };

export default function MyStore() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterFeatured, setFilterFeatured] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastAnim = useRef(new Animated.Value(-60)).current;

  // Initial demo products
  useEffect(() => {
    const initialProducts: Product[] = [
      { id: "1", name: "iPhone 12", price: 699, image: "https://xlijah.com/pics/phones/iphone/12.jpg", description: "Compact and powerful smartphone.", featured: true },
      { id: "2", name: "iPhone 13", price: 799, image: "https://xlijah.com/pics/phones/iphone/13.jpg", description: "Improved camera and battery." },
      { id: "3", name: "iPhone 14", price: 899, image: "https://xlijah.com/pics/phones/iphone/14.jpg", description: "Sleek design with advanced features.", featured: true },
      { id: "4", name: "iPhone 15", price: 999, image: "https://xlijah.com/pics/phones/iphone/15.jpg", description: "Next-gen performance and display." },
      { id: "5", name: "iPhone 16", price: 1099, image: "https://xlijah.com/pics/phones/iphone/16.jpg", description: "Top-tier smartphone experience." },
      { id: "6", name: "iPhone SE", price: 499, image: "https://xlijah.com/pics/phones/iphone/12.jpg", description: "Affordable and reliable phone." },
    ];
    setProducts(initialProducts);
  }, []);

  // Refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      const newProduct: Product = {
        id: Math.random().toString(),
        name: `New Gadget ${Math.floor(Math.random() * 100)}`,
        price: Math.floor(Math.random() * 1000) + 100,
        image: "https://picsum.photos/200/300?random=" + Math.floor(Math.random() * 1000),
        description: "Check out this amazing new gadget!",
      };
      setProducts((prev) => [newProduct, ...prev]);
      setRefreshing(false);
      showToast("New product added 🔥", "success");
    }, 1500);
  };

  // Cart handlers
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    showToast(`${product.name} added to cart ✅`, "success");
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    showToast("Item removed from cart 🗑️", "error");
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Edit handlers
  const handleEdit = (product: Product) => {
    setProductToEdit(product);
    setName(product.name);
    setPrice(product.price.toString());
    setImage(product.image);
    setDescription(product.description || "");
    setEditModal(true);
  };

  const saveEdit = () => {
    if (!productToEdit) return;
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productToEdit.id
          ? { ...p, name, price: parseFloat(price), image, description }
          : p
      )
    );
    showToast("Product changes saved ✏️", "success");
    setEditModal(false);
  };

  const handlePayment = () => {
    showToast(`Checkout $${cartTotal.toFixed(2)} 💰`, "success");
    setCart([]);
    setCartVisible(false);
  };

  const handleDelete = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setCart((prev) => prev.filter((p) => p.id !== productId));
    showToast("Product deleted 🗑️", "error");
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 20, duration: 300, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: -60, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  const filteredProducts = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) && (!filterFeatured || p.featured)
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: "#1e1e1e", shadowColor: "#000" }]}>
      {item.featured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredText}>FEATURED</Text>
        </View>
      )}
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.cardBody}>
        <Text style={[styles.title, { color: "#fff" }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.description, { color: "#aaa" }]} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={[styles.price, { color: "#ff7f00" }]}>
          ${item.price}
        </Text>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={() => addToCart(item)} style={[styles.smallBtn, { backgroundColor: "#34c759" }]}>
          <Ionicons name="cart" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleEdit(item)} style={[styles.smallBtn, { backgroundColor: "#007aff" }]}>
          <Ionicons name="create-outline" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.smallBtn, { backgroundColor: "#ff3b30" }]}>
          <Ionicons name="trash-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: "#121212" }]}>
      {/* Toast */}
      {toast && (
        <Animated.View
          style={[styles.toast, { backgroundColor: toast.type === "success" ? "#34c759" : "#ff3b30", transform: [{ translateY: toastAnim }] }]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}

      {/* Header + Search */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>My Store</Text>
        <TouchableOpacity onPress={() => setCartVisible(true)}>
          <Ionicons name="cart-outline" size={32} color="#ff7f00" />
          {cart.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row", marginHorizontal: 20, marginBottom: 10 }}>
        <TextInput
          placeholder="Search products..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          style={[styles.input, { flex: 1, backgroundColor: "#1f1f1f", color: "#fff" }]}
        />
        <TouchableOpacity
          style={[styles.smallBtn, { marginLeft: 8, backgroundColor: filterFeatured ? "#ff7f00" : "#555" }]}
          onPress={() => setFilterFeatured(!filterFeatured)}
        >
          <Ionicons name="star" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 120 }}
        renderItem={renderProduct}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      />

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: "#222" }]}>
              <Text style={[styles.modalTitle, { color: "#fff" }]}>Edit Product</Text>
              <TextInput placeholder="Product Name" value={name} onChangeText={setName} style={[styles.input, { backgroundColor: "#333", color: "#fff" }]} placeholderTextColor="#888" />
              <TextInput placeholder="Price" value={price} onChangeText={setPrice} keyboardType="numeric" style={[styles.input, { backgroundColor: "#333", color: "#fff" }]} placeholderTextColor="#888" />
              <TextInput placeholder="Image URL" value={image} onChangeText={setImage} style={[styles.input, { backgroundColor: "#333", color: "#fff" }]} placeholderTextColor="#888" />
              <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={[styles.input, { backgroundColor: "#333", color: "#fff" }]} placeholderTextColor="#888" />

              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ff7f00" }]} onPress={saveEdit}>
                <Text style={styles.modalBtnText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#555" }]} onPress={() => setEditModal(false)}>
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Cart Modal */}
      <Modal visible={cartVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: "#222", height: "70%" }]}>
            <Text style={[styles.modalTitle, { color: "#fff" }]}>My Cart ({cart.length})</Text>
            <ScrollView>
              {cart.map((item) => (
                <View key={item.id} style={[styles.cartItem, { backgroundColor: "#333" }]}>
                  <Image source={{ uri: item.image }} style={styles.cartImage} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontWeight: "700", color: "#fff" }}>{item.name}</Text>
                    <Text style={{ color: "#ff7f00", fontWeight: "600" }}>${item.price}</Text>
                    <View style={{ flexDirection: "row", marginTop: 4 }}>
                      <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={[styles.smallBtn, { backgroundColor: "#555" }]}>
                        <Ionicons name="remove" size={16} color="#fff" />
                      </TouchableOpacity>
                      <Text style={{ color: "#fff", marginHorizontal: 8 }}>{item.quantity}</Text>
                      <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={[styles.smallBtn, { backgroundColor: "#555" }]}>
                        <Ionicons name="add" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removeFromCart(item.id)} style={[styles.smallBtn, { backgroundColor: "#ff3b30" }]}>
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#fff" }}>
                Total: ${cartTotal.toFixed(2)}
              </Text>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#34c759" }]} onPress={handlePayment}>
                <Text style={styles.modalBtnText}>Checkout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#555" }]} onPress={() => setCartVisible(false)}>
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 20, marginBottom: 10 },
  header: { fontSize: 26, fontWeight: "900", color: "#fff" },
  card: { width: CARD_WIDTH, borderRadius: 14, padding: 10, margin: 8, elevation: 3, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  image: { width: "100%", height: CARD_WIDTH, borderRadius: 10 },
  cardBody: { marginTop: 8 },
  title: { fontWeight: "700", fontSize: 15 },
  description: { fontSize: 12, marginTop: 2 },
  price: { fontWeight: "800", marginTop: 4, fontSize: 16 },
  buttonRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, gap: 6 },
  smallBtn: { padding: 6, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 20 },
  modalContent: { borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: "900", textAlign: "center", marginBottom: 16 },
  input: { backgroundColor: "#333", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, fontSize: 15, color: "#fff" },
  modalBtn: { borderRadius: 10, paddingVertical: 12, marginTop: 10, alignItems: "center" },
  modalBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cartItem: { flexDirection: "row", alignItems: "center", marginBottom: 10, borderRadius: 10, padding: 8 },
  cartImage: { width: 60, height: 60, borderRadius: 10 },
  cartBadge: { position: "absolute", right: -6, top: -4, backgroundColor: "red", borderRadius: 10, paddingHorizontal: 6 },
  cartBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  toast: { position: "absolute", left: 20, right: 20, padding: 12, borderRadius: 10, zIndex: 999, elevation: 5 },
  toastText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  featuredBadge: { position: "absolute", top: 6, left: 6, backgroundColor: "#ff7f00", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  featuredText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
