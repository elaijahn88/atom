// App.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../firebase";
import { signOut } from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

/* -----------------------
   Types
   ----------------------- */
type IUserData = {
  id: string;
  name: string;
  phone: string;
  account: number;
  age?: number;
  isFrozen?: boolean;
  createdAt?: any;
  loan?: {
    amount: number;
    outstanding: number;
    status: "NoLoan" | "Pending" | "Active" | "Paid";
    dueDate?: string | null;
  };
};

type Transaction = {
  id?: string;
  type?: string;
  provider?: string;
  amount: number;
  timestamp: string;
  status: "Pending" | "Completed" | "Failed";
  note?: string;
};

/* -----------------------
   Config
   ----------------------- */
const ADMIN_PHONE = "0752406588"; // admin phone — change if needed

/* -----------------------
   App
   ----------------------- */
export default function App() {
  // login fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // session
  const [currentUser, setCurrentUser] = useState<IUserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // UI
  const [visibleSection, setVisibleSection] = useState<
    "none" | "deposit" | "viewClient" | "loan" | "manageUsers" | "manageSingle"
  >("none");

  // deposit state (for self)
  const [topUpAmount, setTopUpAmount] = useState("");
  const quickTopUps = [5, 10, 20, 50, 100];
  const providers = ["MTN", "AirtelTigo", "Vodafone", "G-Money"];

  // admin: list of users
  const [usersList, setUsersList] = useState<IUserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<IUserData | null>(null);
  const [selectedUserTxs, setSelectedUserTxs] = useState<Transaction[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    setTimeout(() => setMessage(""), 4000);
  }, [message]);

  /* -----------------------
     Helper: show short message
     ----------------------- */
  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  };

  /* -----------------------
     Login: lookup by phone in Firestore. If not found, create user doc.
     ----------------------- */
  const handleLogin = async () => {
    if (!name.trim()) return showMsg("Please enter your name");
    if (!phone.trim()) return showMsg("Please enter your phone number");

    setLoading(true);
    try {
      // search users collection for phone
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phone", "==", phone));
      const qSnap = await getDocs(q);

      if (!qSnap.empty) {
        // use existing user (take first match)
        const docSnap = qSnap.docs[0];
        const data = docSnap.data() as any;
        const user: IUserData = {
          id: docSnap.id,
          name: data.name || name,
          phone: data.phone,
          account: data.account ?? 0,
          age: data.age,
          isFrozen: data.isFrozen ?? false,
          createdAt: data.createdAt,
          loan: data.loan ?? { amount: 0, outstanding: 0, status: "NoLoan" },
        };
        setCurrentUser(user);
        setIsAdmin(user.phone === ADMIN_PHONE);
        showMsg("Welcome back!");
      } else {
        // create user doc
        const newUser = {
          name,
          phone,
          account: 0,
          isFrozen: false,
          createdAt: serverTimestamp(),
          loan: { amount: 0, outstanding: 0, status: "NoLoan" },
        };
        const docRef = await addDoc(collection(db, "users"), newUser);
        const user: IUserData = {
          id: docRef.id,
          name,
          phone,
          account: 0,
          isFrozen: false,
          createdAt: new Date().toISOString(),
          loan: { amount: 0, outstanding: 0, status: "NoLoan" },
        };
        setCurrentUser(user);
        setIsAdmin(user.phone === ADMIN_PHONE);
        showMsg("Account created!");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      Alert.alert("Login error", err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------
     Logout
     ----------------------- */
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // ignore if not signed in via auth
    }
    setCurrentUser(null);
    setIsAdmin(false);
    setVisibleSection("none");
    setUsersList([]);
    setSelectedUser(null);
    setSelectedUserTxs([]);
    showMsg("Logged out");
  };

  /* -----------------------
     Self Top-Up: update current user's account and add tx
     ----------------------- */
  const handleSelfTopUp = async (amountParam?: number, provider?: string) => {
    if (!currentUser) return showMsg("No user logged in");
    if (currentUser.isFrozen) return Alert.alert("Account frozen", "Cannot top up a frozen account.");

    const amount = amountParam ?? Number(topUpAmount);
    if (!amount || isNaN(amount) || amount <= 0) return showMsg("Enter a valid amount");

    try {
      // update user doc
      const userRef = doc(db, "users", currentUser.id);
      const newBalance = (currentUser.account || 0) + amount;
      await updateDoc(userRef, { account: newBalance });

      // add transaction
      await addDoc(collection(db, "users", currentUser.id, "transactions"), {
        type: "TopUp",
        provider: provider ?? "Manual",
        amount,
        timestamp: new Date().toLocaleString(),
        status: "Completed",
        note: `Top-up via ${provider ?? "Manual"}`,
      });

      // refresh local
      setCurrentUser((prev) => (prev ? { ...prev, account: newBalance } : prev));
      setTopUpAmount("");
      showMsg(`+$${amount} added`);
    } catch (err) {
      console.error("Top-up error:", err);
      Alert.alert("Error", "Top-up failed");
    }
  };

  /* -----------------------
     Self: fetch transactions for current user
     ----------------------- */
  const fetchSelfTxs = async () => {
    if (!currentUser) return;
    try {
      const txCol = collection(db, "users", currentUser.id, "transactions");
      const txSnap = await getDocs(query(txCol, orderBy("timestamp", "desc")));
      const txs: Transaction[] = [];
      txSnap.forEach((d) => txs.push(d.data() as Transaction));
      return txs;
    } catch (err) {
      console.error("fetch txs error:", err);
      return [];
    }
  };

  /* -----------------------
     Admin: load all users list
     ----------------------- */
  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersRef = collection(db, "users");
      const snap = await getDocs(usersRef);
      const arr: IUserData[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        arr.push({
          id: d.id,
          name: data.name,
          phone: data.phone,
          account: data.account ?? 0,
          age: data.age,
          isFrozen: data.isFrozen ?? false,
          createdAt: data.createdAt,
          loan: data.loan ?? { amount: 0, outstanding: 0, status: "NoLoan" },
        });
      });
      setUsersList(arr);
      setVisibleSection("manageUsers");
    } catch (err) {
      console.error("load users error:", err);
      Alert.alert("Error", "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  /* -----------------------
     Admin: select a user to manage (load their txs)
     ----------------------- */
  const openManageUser = async (user: IUserData) => {
    setSelectedUser(user);
    setVisibleSection("manageSingle");
    try {
      const txCol = collection(db, "users", user.id, "transactions");
      const txSnap = await getDocs(query(txCol, orderBy("timestamp", "desc")));
      const txs: Transaction[] = [];
      txSnap.forEach((d) => txs.push(d.data() as Transaction));
      setSelectedUserTxs(txs);
    } catch (err) {
      console.error("load user txs:", err);
      setSelectedUserTxs([]);
    }
  };

  /* -----------------------
     Admin: top-up any user
     ----------------------- */
  const adminTopUpUser = async (userId: string, amount: number, provider?: string) => {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) return Alert.alert("Error", "User not found");

      const udata = userDoc.data() as any;
      const newBalance = (udata.account ?? 0) + amount;
      await updateDoc(userRef, { account: newBalance });

      await addDoc(collection(db, "users", userId, "transactions"), {
        type: "TopUp",
        provider: provider ?? "Admin",
        amount,
        timestamp: new Date().toLocaleString(),
        status: "Completed",
        note: `Admin top-up`,
      });

      // refresh selected user if open
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, account: newBalance } : prev));
        // refresh txs
        openManageUser({ ...(selectedUser as IUserData), account: newBalance });
      }
      // refresh list
      loadAllUsers();
      showMsg(`+$${amount} added`);
    } catch (err) {
      console.error("admin topup error:", err);
      Alert.alert("Error", "Top-up failed");
    }
  };

  /* -----------------------
     Admin: freeze/unfreeze user (with confirmation)
     ----------------------- */
  const toggleFreezeUser = (userId: string, currentFrozen: boolean) => {
    Alert.alert(
      `${currentFrozen ? "Unfreeze" : "Freeze"} Account`,
      `Are you sure you want to ${currentFrozen ? "unfreeze" : "freeze"} this account?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: currentFrozen ? "Unfreeze" : "Freeze",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "users", userId), { isFrozen: !currentFrozen });
              showMsg(`${currentFrozen ? "Unfrozen" : "Frozen"}`);
              loadAllUsers();
              if (selectedUser?.id === userId) {
                setSelectedUser((s) => (s ? { ...s, isFrozen: !currentFrozen } : s));
              }
            } catch (err) {
              console.error("freeze error:", err);
              Alert.alert("Error", "Failed to update status");
            }
          },
        },
      ]
    );
  };

  /* -----------------------
     Loan flows: request, approve, repay
     ----------------------- */
  const requestLoan = async (userId: string, amount: number) => {
    if (!amount || amount <= 0) return Alert.alert("Invalid", "Enter a valid loan amount");
    try {
      await updateDoc(doc(db, "users", userId), {
        loan: { amount, outstanding: amount, status: "Pending", dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toLocaleDateString() },
      });
      showMsg("Loan requested (pending)");
      loadAllUsers();
      if (selectedUser?.id === userId) openManageUser(selectedUser);
    } catch (err) {
      console.error("request loan:", err);
      Alert.alert("Error", "Failed to request loan");
    }
  };

  const approveLoan = (userId: string) => {
    Alert.alert("Approve Loan", "Approve and disburse loan to user?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          try {
            const userRef = doc(db, "users", userId);
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) return Alert.alert("Error", "User not found");
            const data: any = userDoc.data();
            if (!data.loan || data.loan.status !== "Pending") return Alert.alert("No pending loan", "No loan to approve");

            const amt = data.loan.amount;
            const newBalance = (data.account ?? 0) + amt;

            // update account and loan status
            await updateDoc(userRef, {
              account: newBalance,
              "loan.status": "Active",
            });

            // add tx
            await addDoc(collection(db, "users", userId, "transactions"), {
              type: "LoanDisburse",
              amount: amt,
              timestamp: new Date().toLocaleString(),
              status: "Completed",
              note: "Loan disbursed by admin",
            });

            showMsg("Loan approved & disbursed");
            loadAllUsers();
            if (selectedUser?.id === userId) openManageUser(selectedUser);
          } catch (err) {
            console.error("approve loan:", err);
            Alert.alert("Error", "Failed to approve loan");
          }
        },
      },
    ]);
  };

  const repayLoan = (userId: string, amount: number) => {
    if (!amount || amount <= 0) return Alert.alert("Invalid", "Enter valid repayment amount");
    Alert.alert("Confirm Repayment", `Repay $${amount} from user's account?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Repay",
        onPress: async () => {
          try {
            const userRef = doc(db, "users", userId);
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) return Alert.alert("Error", "User not found");
            const data: any = userDoc.data();
            const balance = data.account ?? 0;
            const loan = data.loan ?? { outstanding: 0, status: "NoLoan" };
            if (amount > balance) return Alert.alert("Insufficient funds", "Cannot repay more than balance");

            const newBalance = balance - amount;
            const newOutstanding = Math.max(0, loan.outstanding - amount);
            const newStatus = newOutstanding === 0 ? "Paid" : "Active";

            await updateDoc(userRef, {
              account: newBalance,
              "loan.outstanding": newOutstanding,
              "loan.status": newStatus,
            });

            await addDoc(collection(db, "users", userId, "transactions"), {
              type: "LoanRepayment",
              amount,
              timestamp: new Date().toLocaleString(),
              status: "Completed",
              note: "Loan repayment",
            });

            showMsg("Repayment processed");
            loadAllUsers();
            if (selectedUser?.id === userId) openManageUser(selectedUser);
          } catch (err) {
            console.error("repay loan:", err);
            Alert.alert("Error", "Repayment failed");
          }
        },
      },
    ]);
  };

  /* -----------------------
     UI: small components
     ----------------------- */
  const SectionButton = ({ onPress, label, icon }: { onPress: () => void; label: string; icon: string }) => (
    <TouchableOpacity style={styles.sectionBtn} onPress={onPress}>
      <Ionicons name={icon as any} size={18} color="#fff" />
      <Text style={styles.sectionBtnText}>{label}</Text>
    </TouchableOpacity>
  );

  /* -----------------------
     Render: Login screen (phone)
     ----------------------- */
  if (!currentUser) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ alignItems: "center" }}>
          <Ionicons name="call-outline" size={64} color="#00BFFF" />
          <Text style={styles.title}>Phone Login</Text>

          <TextInput style={styles.input} placeholder="Your name" placeholderTextColor="#aaa" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Phone (e.g. 0752406588)" placeholderTextColor="#aaa" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>

          {loading && <ActivityIndicator size="large" color="#00BFFF" />}
          {message ? <Text style={styles.msg}>{message}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /* -----------------------
     Render: Logged-in Dashboard
     ----------------------- */
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <Ionicons name="person-circle-outline" size={86} color="#00BFFF" />
        <Text style={styles.welcome}>Welcome, {currentUser.name}</Text>
        <Text style={styles.balance}>💰 ${currentUser.account?.toFixed(2) ?? 0}</Text>
        <Text style={{ color: currentUser.isFrozen ? "#FF5252" : "#4CAF50" }}>{currentUser.isFrozen ? "Frozen" : "Active"}</Text>
      </View>

      <View style={styles.buttonsRow}>
        <SectionButton onPress={() => setVisibleSection((s) => (s === "deposit" ? "none" : "deposit"))} label="Deposit / Top-Up" icon="cash-outline" />
        <SectionButton onPress={() => setVisibleSection((s) => (s === "viewClient" ? "none" : "viewClient"))} label="View Transactions" icon="list-outline" />
        <SectionButton onPress={() => setVisibleSection((s) => (s === "loan" ? "none" : "loan"))} label="Loan / Account" icon="briefcase-outline" />
      </View>

      {isAdmin && (
        <TouchableOpacity style={[styles.adminBtn, { marginTop: 10 }]} onPress={loadAllUsers}>
          <Ionicons name="settings-outline" size={18} color="#fff" />
          <Text style={[styles.sectionBtnText, { marginLeft: 8 }]}>Manage Users (Admin)</Text>
        </TouchableOpacity>
      )}

      {/* ---------------- Deposit / Top-Up ---------------- */}
      {visibleSection === "deposit" && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Deposit / Top-Up</Text>
          <Text style={styles.label}>Your balance: ${currentUser.account?.toFixed(2) ?? 0}</Text>

          <TextInput style={styles.input} placeholder="Amount" placeholderTextColor="#aaa" keyboardType="numeric" value={topUpAmount} onChangeText={setTopUpAmount} />

          <View style={styles.quickRow}>
            {quickTopUps.map((amt) => (
              <TouchableOpacity key={amt} style={styles.quickBtn} onPress={() => handleSelfTopUp(amt, "Quick")}>
                <Text style={styles.quickBtnText}>+${amt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 10 }]}>Providers</Text>
          <View style={styles.providersRow}>
            {providers.map((p) => (
              <TouchableOpacity key={p} style={styles.providerBtn} onPress={() => handleSelfTopUp(undefined, p)}>
                <Text style={styles.providerText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12 }]} onPress={() => handleSelfTopUp(undefined)}>
            <Text style={styles.primaryBtnText}>Top-Up Manual</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryBtn, { marginTop: 10 }]} onPress={() => {
            Alert.alert(currentUser.isFrozen ? "Unfreeze account?" : "Freeze account?", "Confirm action", [
              { text: "Cancel", style: "cancel" },
              { text: currentUser.isFrozen ? "Unfreeze" : "Freeze", onPress: async () => {
                await updateDoc(doc(db, "users", currentUser.id), { isFrozen: !currentUser.isFrozen });
                setCurrentUser((prev) => (prev ? { ...prev, isFrozen: !prev.isFrozen } : prev));
                showMsg("Account status updated");
              }}
            ])
          }}>
            <Text style={styles.secondaryBtnText}>{currentUser.isFrozen ? "Unfreeze" : "Freeze"} Account</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ---------------- View Transactions ---------------- */}
      {visibleSection === "viewClient" && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <UserTxList userId={currentUser.id} />
        </View>
      )}

      {/* ---------------- Loan / Account ---------------- */}
      {visibleSection === "loan" && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Loan & Account</Text>
          <Text style={styles.label}>Loan status: {currentUser.loan?.status ?? "NoLoan"}</Text>
          {currentUser.loan && currentUser.loan.status !== "NoLoan" && (
            <>
              <Text style={styles.label}>Amount: ${currentUser.loan.amount?.toFixed(2)}</Text>
              <Text style={styles.label}>Outstanding: ${currentUser.loan.outstanding?.toFixed(2)}</Text>
              <Text style={styles.label}>Due: {currentUser.loan.dueDate ?? "—"}</Text>
            </>
          )}

          <View style={{ marginTop: 12 }}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => requestLoan(currentUser.id, 100)}>
              <Text style={styles.primaryBtnText}>Request $100 Loan</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.secondaryBtn, { marginTop: 8 }]} onPress={() => {
              // repay 50 from own account (confirm)
              if ((currentUser.account ?? 0) < 50) return Alert.alert("Insufficient funds", "Can't repay $50");
              Alert.alert("Confirm Repayment", "Repay $50 from your account?", [
                { text: "Cancel", style: "cancel" },
                { text: "Repay", onPress: async () => {
                  // call repayLoan (admin function works on any user id)
                  await repayLoan(currentUser.id, 50);
                  // refresh current user doc
                  const uDoc = await getDoc(doc(db, "users", currentUser.id));
                  if (uDoc.exists()) {
                    const d = uDoc.data() as any;
                    setCurrentUser((prev) => prev ? { ...prev, account: d.account ?? 0, loan: d.loan ?? prev.loan } : prev);
                  }
                }}
              ])
            }}>
              <Text style={styles.secondaryBtnText}>Repay $50</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ---------------- Admin: manage users list ---------------- */}
      {visibleSection === "manageUsers" && isAdmin && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>All Registered Users</Text>
          {loadingUsers ? (
            <ActivityIndicator color="#00BFFF" />
          ) : (
            <FlatList
              data={usersList}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => (
                <View style={styles.userRow}>
                  <View>
                    <Text style={{ color: "#fff", fontWeight: "700" }}>{item.name}</Text>
                    <Text style={{ color: "#aaa" }}>{item.phone}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: "#00BFFF", fontWeight: "700" }}>${item.account?.toFixed(2)}</Text>
                    <View style={{ flexDirection: "row", marginTop: 6 }}>
                      <TouchableOpacity style={[styles.smallBtn]} onPress={() => openManageUser(item)}>
                        <Text style={{ color: "#fff" }}>Open</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.smallBtn, { marginLeft: 8 }]} onPress={() => adminTopUpUser(item.id, 10, "AdminQuick")}>
                        <Text style={{ color: "#fff" }}>+10</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />
          )}
        </View>
      )}

      {/* ---------------- Admin: manage single user ---------------- */}
      {visibleSection === "manageSingle" && selectedUser && isAdmin && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Manage: {selectedUser.name}</Text>
          <Text style={styles.label}>Phone: {selectedUser.phone}</Text>
          <Text style={styles.label}>Balance: ${selectedUser.account?.toFixed(2)}</Text>
          <Text style={styles.label}>Status: {selectedUser.isFrozen ? "Frozen" : "Active"}</Text>

          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => adminTopUpUser(selectedUser.id, 50, "Admin")}>
              <Text style={styles.primaryBtnText}>+50</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryBtn, { marginLeft: 8 }]} onPress={() => toggleFreezeUser(selectedUser.id, !!selectedUser.isFrozen)}>
              <Text style={styles.secondaryBtnText}>{selectedUser.isFrozen ? "Unfreeze" : "Freeze"}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Transactions</Text>
          {selectedUserTxs.length === 0 ? (
            <Text style={styles.noTx}>No transactions</Text>
          ) : (
            <FlatList
              data={selectedUserTxs}
              keyExtractor={(it, idx) => it.timestamp + idx}
              renderItem={({ item }) => (
                <View style={styles.txCard}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>{item.type} • {item.provider ?? ""}</Text>
                  <Text style={{ color: "#aaa" }}>{item.note}</Text>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>${item.amount.toFixed(2)}</Text>
                  <Text style={{ color: "#888" }}>{item.timestamp}</Text>
                </View>
              )}
            />
          )}

          <View style={{ marginTop: 12 }}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => {
              setVisibleSection("manageUsers");
              setSelectedUser(null);
              setSelectedUserTxs([]);
            }}>
              <Text style={styles.secondaryBtnText}>Back to Users</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* footer */}
      <View style={{ marginTop: 18, alignItems: "center" }}>
        <TouchableOpacity style={[styles.secondaryBtn, { width: 180 }]} onPress={handleLogout}>
          <Text style={styles.secondaryBtnText}>Log Out</Text>
        </TouchableOpacity>
        {message ? <Text style={{ color: "#ccc", marginTop: 8 }}>{message}</Text> : null}
      </View>

      <View style={{ height: 36 }} />
    </ScrollView>
  );
}

/* -----------------------
   Small helper component: list transactions for given user
   ----------------------- */
function UserTxList({ userId }: { userId: string }) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const txCol = collection(db, "users", userId, "transactions");
        const txSnap = await getDocs(query(txCol, orderBy("timestamp", "desc")));
        const arr: Transaction[] = [];
        txSnap.forEach((d) => arr.push(d.data() as Transaction));
        if (mounted) setTxs(arr);
      } catch (err) {
        console.error("UserTxList error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [userId]);

  if (loading) return <ActivityIndicator color="#00BFFF" />;

  if (!txs.length) return <Text style={styles.noTx}>No transactions yet.</Text>;

  return (
    <FlatList
      data={txs}
      keyExtractor={(it, idx) => it.timestamp + idx}
      renderItem={({ item }) => (
        <View style={styles.txCard}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>{item.type} • {item.provider ?? ""}</Text>
          <Text style={{ color: "#aaa" }}>{item.note}</Text>
          <Text style={{ color: "#fff", fontWeight: "700" }}>${item.amount.toFixed(2)}</Text>
          <Text style={{ color: "#888" }}>{item.timestamp}</Text>
        </View>
      )}
    />
  );
}

/* -----------------------
   Styles
   ----------------------- */
const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingTop: Platform.OS === "ios" ? 60 : 36,
    backgroundColor: "#0b0b0b",
    minHeight: "100%",
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 12 },
  input: {
    backgroundColor: "#121212",
    color: "#fff",
    width: "94%",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  button: {
    backgroundColor: "#00BFFF",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    width: "94%",
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  msg: { color: "#ccc", marginTop: 8, textAlign: "center" },

  welcome: { color: "#fff", fontSize: 20, fontWeight: "700" },
  balance: { color: "#00BFFF", fontSize: 18 },

  buttonsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },

  sectionBtn: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionBtnText: { color: "#fff", marginLeft: 8, fontWeight: "700" },

  adminBtn: {
    flexDirection: "row",
    backgroundColor: "#FF9800",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionCard: { backgroundColor: "#121212", padding: 14, borderRadius: 12, marginTop: 12 },

  sectionTitle: { fontSize: 18, color: "#fff", fontWeight: "700", marginBottom: 8 },
  label: { color: "#ccc", marginTop: 4 },

  quickRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  quickBtn: { backgroundColor: "#00BFFF", padding: 8, borderRadius: 8 },
  quickBtnText: { color: "#fff", fontWeight: "700" },

  providersRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 8 },
  providerBtn: { width: "48%", backgroundColor: "#2a2a2a", padding: 12, borderRadius: 10, marginVertical: 4 },
  providerText: { color: "#fff", textAlign: "center", fontWeight: "700" },

  primaryBtn: { backgroundColor: "#FF9800", padding: 12, borderRadius: 10, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700" },

  secondaryBtn: { backgroundColor: "#333", padding: 12, borderRadius: 10, alignItems: "center" },
  secondaryBtnText: { color: "#fff", fontWeight: "700" },

  userRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10, backgroundColor: "#141414", borderRadius: 10 },
  smallBtn: { backgroundColor: "#00BFFF", padding: 8, borderRadius: 8 },

  txCard: { backgroundColor: "#151515", padding: 10, borderRadius: 8, marginTop: 8 },
  noTx: { color: "#888", marginTop: 10, textAlign: "center" },
});
