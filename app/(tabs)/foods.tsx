import React, { useState } from "react";

interface FoodItem {
  id: number;
  name: string;
  price: number;
  image?: string;
  restaurant: string;
}

const App: React.FC = () => {
  const menu: FoodItem[] = [
    { id: 1, name: "Classic Burger", price: 5, image: "https://i.imgur.com/8q3Z6xU.png", restaurant: "Burger Palace" },
    { id: 2, name: "Cheese Fries", price: 3, image: "https://i.imgur.com/rE9RjEx.png", restaurant: "Burger Palace" },
    { id: 3, name: "Margherita Pizza", price: 8, image: "https://i.imgur.com/e9VQXrE.png", restaurant: "Pizza World" },
    { id: 4, name: "Pepperoni Pizza", price: 10, image: "https://i.imgur.com/e9VQXrE.png", restaurant: "Pizza World" },
    { id: 5, name: "Salmon Roll", price: 12, image: "https://i.imgur.com/KGxI7Ej.png", restaurant: "Sushi House" },
    { id: 6, name: "Tuna Roll", price: 14, image: "https://i.imgur.com/KGxI7Ej.png", restaurant: "Sushi House" },
  ];

  const [cart, setCart] = useState<(FoodItem & { quantity: number })[]>([]);
  const [showCart, setShowCart] = useState(false);

  const addToCart = (item: FoodItem) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(c => c.id !== id));
  };

  const changeQuantity = (id: number, delta: number) => {
    setCart(
      cart
        .map(c => (c.id === id ? { ...c, quantity: Math.max(c.quantity + delta, 1) } : c))
        .filter(c => c.quantity > 0)
    );
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const checkout = () => {
    if (cart.length === 0) {
      alert("Cart is empty!");
      return;
    }
    alert(`🎉 Order placed at Star Foods! Total: $${total}`);
    setCart([]);
    setShowCart(false);
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 500, margin: "0 auto", paddingBottom: 80 }}>
      <h1 style={{ textAlign: "center", color: "#FF6347", margin: 20 }}>⭐ Star Foods</h1>

      {/* Scrollable feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {menu.map(item => (
          <div
            key={item.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 15,
              overflow: "hidden",
              boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
              cursor: "pointer",
              transition: "transform 0.2s",
            }}
            onClick={() => addToCart(item)}
          >
            {item.image && <img src={item.image} alt={item.name} style={{ width: "100%", height: 180, objectFit: "cover" }} />}
            <div style={{ padding: 10 }}>
              <h3 style={{ margin: 0 }}>{item.name}</h3>
              <p style={{ margin: "5px 0", color: "#555" }}>{item.restaurant}</p>
              <p style={{ margin: 0, fontWeight: "bold" }}>${item.price}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Cart Button */}
      <button
        onClick={() => setShowCart(!showCart)}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          backgroundColor: "#32CD32",
          color: "white",
          border: "none",
          borderRadius: 50,
          width: 60,
          height: 60,
          fontSize: 18,
          cursor: "pointer",
          boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
        }}
      >
        🛒 {cart.length > 0 && <span style={{ fontSize: 14 }}>{cart.length}</span>}
      </button>

      {/* Cart Modal */}
      {showCart && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            right: 20,
            width: 300,
            maxHeight: 400,
            overflowY: "auto",
            backgroundColor: "#fff",
            borderRadius: 10,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            padding: 10,
            zIndex: 1000,
          }}
        >
          <h3>Your Cart</h3>
          {cart.length === 0 && <p>Cart is empty</p>}
          {cart.map(item => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                {item.name} x {item.quantity}
                <div style={{ marginTop: 5 }}>
                  <button onClick={() => changeQuantity(item.id, -1)} style={{ marginRight: 5 }}>−</button>
                  <button onClick={() => changeQuantity(item.id, 1)}>+</button>
                </div>
              </div>
              <button onClick={() => removeFromCart(item.id)} style={{ backgroundColor: "#ccc", border: "none", borderRadius: 5, padding: "2px 6px", cursor: "pointer" }}>Remove</button>
            </div>
          ))}
          <h4>Total: ${total}</h4>
          <button onClick={checkout} style={{ width: "100%", padding: 10, backgroundColor: "#FF6347", color: "white", border: "none", borderRadius: 5, cursor: "pointer" }}>
            Checkout
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
