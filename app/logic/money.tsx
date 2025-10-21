// src/logic/creditSavingsLogic.ts
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, getDocs, getDoc, setDoc } from "firebase/firestore";

export type Service = {
  id: string;
  name: string;
  description: string;
  balance: number;
  createdBy?: string;
};

export type Tx = {
  id: string;
  user?: string;
  provider?: string;
  serviceId?: string;
  amount: number;
  type: "credit" | "savings" | "topup" | "loan" | "other";
  timestamp: number;
  note?: string;
  status?: "Pending" | "Completed" | "Failed";
};

const USER_DOC_ID = "elijah";

export const useCreditSavingsLogic = () => {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [serviceDeposit, setServiceDeposit] = useState("");

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const userDocRef = doc(db, "acc", USER_DOC_ID);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          const defaultData = {
            Name: "Nabimanya Elijah",
            phone: 746524088,
            net: 200000,
            isFrozen: false,
            transactions: [],
            createdAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, defaultData);
          if (!mounted) return;
          setProfile(defaultData);
          setTransactions([]);
        } else {
          const data = snap.data();
          if (!("net" in data)) data.net = 0;
          if (!("transactions" in data)) data.transactions = [];
          if (!mounted) return;
          setProfile(data);
          setTransactions((data.transactions || []) as Tx[]);
        }

        const serviceSnap = await getDocs(collection(db, "services"));
        const loadedServices = serviceSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Service[];
        if (!mounted) return;
        setServices(loadedServices);
      } catch (err) {
        console.error("Load error:", err);
        Alert.alert("Error", "Failed loading data.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const pushTxToProfile = async (tx: Tx) => {
    try {
      const newTxs = [tx, ...(profile.transactions || [])];
      await updateDoc(userDocRef, { transactions: newTxs });
      setProfile((p: any) => ({ ...p, transactions: newTxs }));
      setTransactions(newTxs);
    } catch (err) {
      console.error("pushTxToProfile error:", err);
    }
  };

  const updateProfileNet = async (newNet: number) => {
    try {
      await updateDoc(userDocRef, { net: newNet });
      setProfile((p: any) => ({ ...p, net: newNet }));
    } catch (err) {
      console.error("updateProfileNet error:", err);
      Alert.alert("Error", "Failed to update balance.");
    }
  };

  const createService = async () => {
    if (!serviceName.trim() || !serviceDesc.trim() || !serviceDeposit.trim()) {
      Alert.alert("Incomplete", "Please fill all fields.");
      return;
    }
    const initial = parseFloat(serviceDeposit);
    if (isNaN(initial) || initial < 0) {
      Alert.alert("Invalid deposit", "Enter a valid initial deposit.");
      return;
    }

    try {
      const newService = {
        name: serviceName.trim(),
        description: serviceDesc.trim(),
        balance: initial,
        createdBy: USER_DOC_ID,
        createdAt: Date.now(),
      };
      const refDoc = await addDoc(collection(db, "services"), newService);
      setServices((prev) => [...prev, { id: refDoc.id, ...newService }]);

      const tx: Tx = {
        id: `tx_${Date.now()}`,
        user: USER_DOC_ID,
        type: "other",
        amount: initial,
        provider: "ServiceCreated",
        serviceId: refDoc.id,
        timestamp: Date.now(),
        note: `Created Service ${serviceName.trim()}`,
        status: "Completed",
      };
      await pushTxToProfile(tx);

      setServiceName("");
      setServiceDesc("");
      setServiceDeposit("");
      setModalVisible(false);
      Alert.alert("Created", `Service "${newService.name}" created.`);
    } catch (err) {
      console.error("createService error:", err);
      Alert.alert("Error", "Failed to create service.");
    }
  };

  const sendPayment = async () => {
    if (!selectedService || !profile) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid amount", "Enter a valid payment amount.");
      return;
    }
    if (profile.isFrozen) {
      Alert.alert("Account Frozen", "Cannot make payment while account is frozen.");
      return;
    }
    if ((profile.net || 0) < amt) {
      Alert.alert("Insufficient funds", "Not enough balance to complete payment.");
      return;
    }

    try {
      const serviceRef = doc(db, "services", selectedService.id);
      const newBalance = selectedService.balance + amt;
      await updateDoc(serviceRef, { balance: newBalance });
      setServices((prev) =>
        prev.map((s) => (s.id === selectedService.id ? { ...s, balance: newBalance } : s))
      );

      const newNet = (profile.net || 0) - amt;
      await updateProfileNet(newNet);

      const tx: Tx = {
        id: `tx_${Date.now()}`,
        user: USER_DOC_ID,
        serviceId: selectedService.id,
        amount: amt,
        type: "credit",
        provider: "ServicePayment",
        timestamp: Date.now(),
        note: `Paid to Service ${selectedService.name}`,
        status: "Completed",
      };
      await pushTxToProfile(tx);

      Alert.alert("Success", `Paid $${amt.toFixed(2)} to ${selectedService.name}`);
      setPaymentAmount("");
      setSelectedService(null);
    } catch (err) {
      console.error("sendPayment error:", err);
      Alert.alert("Error", "Failed to send payment.");
    }
  };

  const toggleFreeze = async () => {
    if (!profile) return;
    try {
      const newStatus = !profile.isFrozen;
      await updateDoc(userDocRef, { isFrozen: newStatus });
      setProfile((p: any) => ({ ...p, isFrozen: newStatus }));
      Alert.alert("Success", `Account ${newStatus ? "frozen" : "unfrozen"}`);
    } catch (err) {
      console.error("toggleFreeze error:", err);
      Alert.alert("Error", "Failed to update status.");
    }
  };

  return {
    loading,
    services,
    profile,
    transactions,
    modalVisible,
    setModalVisible,
    serviceName,
    setServiceName,
    serviceDesc,
    setServiceDesc,
    serviceDeposit,
    setServiceDeposit,
    selectedService,
    setSelectedService,
    paymentAmount,
    setPaymentAmount,
    createService,
    sendPayment,
    toggleFreeze,
  };
};
