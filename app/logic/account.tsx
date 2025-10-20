// src/logic/accountLogic.ts
import { useState } from "react";
import { db } from "../../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export interface Profile {
  Name: string;
  age: number;
  bod: string;
  father: string;
  mother: string;
  idno: number;
  nin: string;
  nok: string;
  phone: number;
  net: number;
  transactions: any[];
  isFrozen: boolean;
  createdAt: string;
}

export const useAccountLogic = () => {
  const [name, setName] = useState("");
  const [view, setView] = useState<"login" | "account">("login");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [label, setLabel] = useState("");

  const quickTopUps = [5, 10, 20, 50, 100];
  const mobileMoneyProviders = [
    { name: "T-Money", color: "#FFD700" },
    { name: "X-Money", color: "#FF4500" },
    { name: "E-Money", color: "#4CAF50" },
  ];

  // --- LOGIN ---
  const handleLogin = async () => {
    if (!name.trim()) {
      setLabel("Please enter your name.");
      return;
    }
    setLoading(true);
    const docRef = doc(db, "acc", name.trim().toLowerCase());

    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (!("net" in data)) data.net = 0;
        if (!("transactions" in data)) data.transactions = [];
        await updateDoc(docRef, { net: data.net, transactions: data.transactions });
        setProfile(data as Profile);
        setTransactions(data.transactions);
        setView("account");
      } else {
        const defaultData: Profile = {
          Name: name.trim(),
          age: 26,
          bod: "12 2 1999",
          father: "Ziriganira robert",
          mother: "Winnie kenturegye zebra",
          idno: 18535416,
          nin: "CM9900910LFEAF",
          nok: "Atukunda timothy",
          phone: 746524088,
          net: 0,
          transactions: [],
          isFrozen: false,
          createdAt: new Date().toISOString(),
        };
        await setDoc(docRef, defaultData);
        setProfile(defaultData);
        setTransactions([]);
        setView("account");
      }
    } catch (err) {
      console.error(err);
      setLabel("Login failed.");
    } finally {
      setLoading(false);
    }
  };

  // --- FIRESTORE UPDATER ---
  const updateFirestore = async (updates: Partial<Profile>) => {
    if (!profile?.Name) return;
    const docRef = doc(db, "acc", profile.Name.toLowerCase());
    await updateDoc(docRef, updates);
  };

  // --- TOP-UP ---
  const simulateTopUp = async (amount: number, method?: string) => {
    if (profile?.isFrozen) {
      setLabel("Account is frozen. Cannot top up.");
      return;
    }
    if (!amount || isNaN(amount)) {
      setLabel("Enter valid amount.");
      return;
    }

    const newTx = {
      receiver: method || "Top-Up",
      amount,
      timestamp: new Date().toLocaleString(),
      proof: `MM#${Math.floor(Math.random() * 10000)}`,
      status: "Completed",
    };

    const newNet = (profile?.net || 0) + amount;
    const updatedTxs = [newTx, ...transactions];
    setProfile({ ...profile, net: newNet });
    setTransactions(updatedTxs);
    setTopUpAmount("");
    setLabel(`Top-up of $${amount} via ${method || "manual"} successful!`);

    await updateFirestore({ net: newNet, transactions: updatedTxs });
  };

  // --- FREEZE / UNFREEZE ---
  const toggleFreeze = async () => {
    if (!profile) return;
    const newStatus = !profile.isFrozen;
    setProfile({ ...profile, isFrozen: newStatus });
