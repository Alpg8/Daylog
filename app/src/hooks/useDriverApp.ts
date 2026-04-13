import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "../config";
import { apiFetch, apiFetchForm } from "../api";
import { STEP_LABELS, TOKEN_KEY, USER_KEY, type StepType } from "../constants";
import type {
  DriverMeResponse,
  DriverNotification,
  DriverOverviewStats,
  DriverRecentJobItem,
  DriverTask,
  DriverUser,
  DriverVehicleHistoryItem,
} from "../types";

export function useDriverApp() {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<DriverUser | null>(null);

  const [tasks, setTasks] = useState<DriverTask[]>([]);
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);

  const [driverId, setDriverId] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverNotes, setDriverNotes] = useState("");
  const [assignedVehicle, setAssignedVehicle] = useState<string>("-");
  const [vehicleHistory, setVehicleHistory] = useState<DriverVehicleHistoryItem[]>([]);
  const [recentJobs, setRecentJobs] = useState<DriverRecentJobItem[]>([]);
  const [overviewStats, setOverviewStats] = useState<DriverOverviewStats>({
    totalJobs: 0,
    completedJobs: 0,
    totalFuelRecords: 0,
  });

  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [stepType, setStepType] = useState<StepType>("START_JOB");
  const [stepNotes, setStepNotes] = useState("");
  const [stepKm, setStepKm] = useState("");
  const [stepPhotoUri, setStepPhotoUri] = useState<string | null>(null);

  const [fuelDate, setFuelDate] = useState(new Date().toISOString().slice(0, 10));
  const [fuelLiters, setFuelLiters] = useState("");
  const [fuelStation, setFuelStation] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [fuelPhotoUri, setFuelPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [savedToken, savedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      if (savedToken) setToken(savedToken);
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser) as DriverUser;
        if (parsedUser.role === "DRIVER") setUser(parsedUser);
        else await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      }
      setBooting(false);
    })();
  }, []);

  useEffect(() => {
    if (!token) return;
    void refreshAll();
  }, [token]);

  // Auto-refresh: when app comes to foreground + every 60s while active
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!token) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    // Start 60s polling
    pollingRef.current = setInterval(() => {
      if (AppState.currentState === "active") {
        void refreshAll();
      }
    }, 60_000);

    // Refresh when app comes back to foreground
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        void refreshAll();
      }
      appStateRef.current = nextState;
    });

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      subscription.remove();
    };
  }, [token]);

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status === "PLANNED" || t.status === "IN_PROGRESS"),
    [tasks]
  );

  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);

  async function login(email: string, password: string): Promise<string | null> {
    try {
      setBooting(true);
      const res = await fetch(`${API_BASE_URL}/api/auth/mobile-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) return json?.error ?? "Login failed";
      if (json?.user?.role !== "DRIVER") return "Bu uygulama yalnizca soforler icin";

      const driverUser = json.user as DriverUser;
      await AsyncStorage.setItem(TOKEN_KEY, json.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(driverUser));
      setToken(json.token as string);
      setUser(driverUser);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Bilinmeyen hata";
    } finally {
      setBooting(false);
    }
  }

  async function logout() {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
    setTasks([]);
    setNotifications([]);
    setDriverId("");
    setVehicleHistory([]);
    setRecentJobs([]);
    setOverviewStats({ totalJobs: 0, completedJobs: 0, totalFuelRecords: 0 });
  }

  async function refreshAll() {
    await Promise.all([loadTasks(), loadNotifications(), loadDriverMe()]);
  }

  async function loadTasks(): Promise<string | null> {
    if (!token) return null;
    try {
      const data = await apiFetch<{ tasks: DriverTask[] }>("/api/driver/tasks", token);
      setTasks(data.tasks ?? []);
      const firstActive = (data.tasks ?? []).find((t) => t.status === "PLANNED" || t.status === "IN_PROGRESS");
      setSelectedTaskId((prev) => prev || firstActive?.id || "");
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Isler alinamadi";
    }
  }

  async function loadNotifications(): Promise<string | null> {
    if (!token) return null;
    try {
      const data = await apiFetch<{ notifications: DriverNotification[] }>("/api/driver/notifications", token);
      setNotifications(data.notifications ?? []);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Bildirimler alinamadi";
    }
  }

  async function loadDriverMe(): Promise<string | null> {
    if (!token) return null;
    try {
      const data = await apiFetch<DriverMeResponse>("/api/driver/me", token);
      setDriverId(data.driver.id);
      setDriverPhone(data.driver.phoneNumber ?? "");
      setDriverNotes(data.driver.notes ?? "");
      setAssignedVehicle(data.driver.assignedVehicle?.plateNumber ?? "Atanmamis");
      setVehicleHistory(data.vehicleHistory ?? []);
      setRecentJobs(data.recentJobs ?? []);
      setOverviewStats(data.stats ?? { totalJobs: 0, completedJobs: 0, totalFuelRecords: 0 });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Profil alinamadi";
    }
  }

  async function pickImage(): Promise<string | null> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return "Galeri izni gerekli";
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: false,
    });

    if (result.canceled) return null;
    return result.assets[0].uri;
  }

  async function submitStepUpdate(): Promise<string | null> {
    if (!token) return "Oturum bulunamadi";
    if (!selectedTaskId) return "Lutfen once bir is secin";
    if (!stepPhotoUri) return "Asama bildirimi icin fotograf zorunlu";

    try {
      const eventRes = await apiFetch<{ event: { id: string } }>("/api/driver/events", token, {
        method: "POST",
        body: JSON.stringify({
          orderId: selectedTaskId,
          type: stepType,
          notes: stepNotes || null,
          odometerKm: stepKm ? Number(stepKm) : null,
        }),
      });

      const formData = new FormData();
      formData.append("file", {
        uri: stepPhotoUri,
        name: `step-${Date.now()}.jpg`,
        type: "image/jpeg",
      } as unknown as Blob);
      formData.append("label", STEP_LABELS[stepType]);

      await apiFetchForm(`/api/driver/events/${eventRes.event.id}/photos`, token, formData);

      if (stepType === "START_JOB") {
        await apiFetch("/api/driver/update-status", token, {
          method: "POST",
          body: JSON.stringify({ orderId: selectedTaskId, status: "IN_PROGRESS" }),
        });
      }
      if (stepType === "END_JOB") {
        await apiFetch("/api/driver/update-status", token, {
          method: "POST",
          body: JSON.stringify({ orderId: selectedTaskId, status: "COMPLETED" }),
        });
      }

      setStepNotes("");
      setStepKm("");
      setStepPhotoUri(null);
      await loadTasks();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Asama kaydedilemedi";
    }
  }

  async function submitFuelRequest(): Promise<string | null> {
    if (!token) return "Oturum bulunamadi";
    if (!fuelPhotoUri) return "Yakit talebi icin fis/fotograf zorunlu";
    if (!fuelLiters) return "Litre bilgisi zorunlu";

    try {
      const formData = new FormData();
      formData.append("date", fuelDate);
      formData.append("liters", fuelLiters);
      if (fuelStation) formData.append("fuelStation", fuelStation);
      if (fuelCost) formData.append("totalCost", fuelCost);
      formData.append("file", {
        uri: fuelPhotoUri,
        name: `fuel-${Date.now()}.jpg`,
        type: "image/jpeg",
      } as unknown as Blob);

      await apiFetchForm("/api/driver/fuel-request", token, formData);
      setFuelLiters("");
      setFuelStation("");
      setFuelCost("");
      setFuelPhotoUri(null);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Yakit talebi gonderilemedi";
    }
  }

  async function saveProfile(): Promise<string | null> {
    if (!token || !driverId) return "Surucu profili bulunamadi";
    try {
      await apiFetch(`/api/drivers/${driverId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ phoneNumber: driverPhone, notes: driverNotes }),
      });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Profil kaydedilemedi";
    }
  }

  async function markAllNotificationsRead(): Promise<string | null> {
    if (!token) return "Oturum bulunamadi";
    try {
      await apiFetch("/api/driver/notifications", token, {
        method: "PATCH",
        body: JSON.stringify({ markAll: true }),
      });
      await loadNotifications();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Bildirimler guncellenemedi";
    }
  }

  async function sendOfficeMessage(subject: string, message: string): Promise<string | null> {
    if (!token) return "Oturum bulunamadi";
    try {
      await apiFetch("/api/driver/office-message", token, {
        method: "POST",
        body: JSON.stringify({ subject, message }),
      });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Mesaj gonderilemedi";
    }
  }

  return {
    booting,
    token,
    user,
    tasks,
    activeTasks,
    selectedTask,
    selectedTaskId,
    setSelectedTaskId,
    notifications,
    driverPhone,
    setDriverPhone,
    driverNotes,
    setDriverNotes,
    assignedVehicle,
    vehicleHistory,
    recentJobs,
    overviewStats,
    stepType,
    setStepType,
    stepNotes,
    setStepNotes,
    stepKm,
    setStepKm,
    stepPhotoUri,
    setStepPhotoUri,
    fuelDate,
    setFuelDate,
    fuelLiters,
    setFuelLiters,
    fuelStation,
    setFuelStation,
    fuelCost,
    setFuelCost,
    fuelPhotoUri,
    setFuelPhotoUri,
    login,
    logout,
    refreshAll,
    loadTasks,
    loadNotifications,
    pickImage,
    submitStepUpdate,
    submitFuelRequest,
    saveProfile,
    markAllNotificationsRead,
    sendOfficeMessage,
  };
}
