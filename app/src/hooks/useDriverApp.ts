import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Platform, type AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import { apiFetch, apiFetchForm, apiFetchPublic } from "../api";
import { API_BASE_URL } from "../config";
import { STEP_LABELS, TOKEN_KEY, USER_KEY, type StepType } from "../constants";
import type {
  AttachmentItem,
  DriverFuelRequest,
  DriverMessage,
  DriverMeResponse,
  DriverNotification,
  DriverOverviewStats,
  DriverProfile,
  DriverRecentJobItem,
  DriverTask,
  DriverUser,
  DriverVehicleHistoryItem,
} from "../types";

interface MobileLoginResponse {
  token: string;
  user: DriverUser;
  message?: string;
}

interface NotificationStreamEvent {
  type: string;
  data?: string;
}

interface NativeEventSource {
  addEventListener(type: string, listener: (event: NotificationStreamEvent) => void): void;
  removeEventListener(type: string, listener: (event: NotificationStreamEvent) => void): void;
  removeAllEventListeners(): void;
  close(): void;
}

export function useDriverApp() {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<DriverUser | null>(null);

  const [tasks, setTasks] = useState<DriverTask[]>([]);
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const [messages, setMessages] = useState<DriverMessage[]>([]);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  const [driverId, setDriverId] = useState("");
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
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
  const [currentTaskAttachments, setCurrentTaskAttachments] = useState<AttachmentItem[]>([]);
  const [driverAttachments, setDriverAttachments] = useState<AttachmentItem[]>([]);

  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [stepType, setStepType] = useState<StepType>("START_JOB");
  const [stepNotes, setStepNotes] = useState("");
  const [stepKm, setStepKm] = useState("");
  const [stepPhotos, setStepPhotos] = useState<Partial<Record<StepType, string | null>>>({});

  function setStepPhoto(type: StepType, uri: string | null) {
    setStepPhotos((prev) => ({ ...prev, [type]: uri }));
  }

  const [fuelKm, setFuelKm] = useState("");
  const [fuelRequestedLiters, setFuelRequestedLiters] = useState("");
  const [fuelTankLeft, setFuelTankLeft] = useState("");
  const [fuelTankRight, setFuelTankRight] = useState("");
  const [fuelNotes, setFuelNotes] = useState("");
  const [fuelRequests, setFuelRequests] = useState<DriverFuelRequest[]>([]);

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

  useEffect(() => {
    if (!token || !selectedTaskId) {
      setCurrentTaskAttachments([]);
      return;
    }
    void loadCurrentTaskAttachments(selectedTaskId);
  }, [token, selectedTaskId]);

  useEffect(() => {
    if (!token || Platform.OS === "web") return;

    let cancelled = false;
    let stream: NativeEventSource | null = null;

    const handleNotification = () => {
      void refreshAll();
    };

    const connect = async () => {
      try {
        const mod = require("react-native-sse") as {
          default: new (
            url: string,
            options?: { headers?: Record<string, string>; pollingInterval?: number }
          ) => NativeEventSource;
        };
        if (cancelled) return;

        const EventSource = mod.default;
        const baseUrl = API_BASE_URL.replace(/\/$/, "");

        stream = new EventSource(`${baseUrl}/api/notifications/stream`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-client-source": "APP",
          },
          pollingInterval: 5_000,
        }) as NativeEventSource;

        stream.addEventListener("message", handleNotification);
        stream.addEventListener("notification", handleNotification);
      } catch (error) {
        console.warn("SSE connection could not be started", error);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (stream) {
        stream.removeAllEventListeners();
        stream.close();
      }
    };
  }, [token]);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!token) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    pollingRef.current = setInterval(() => {
      if (AppState.currentState === "active") {
        void refreshAll();
      }
    }, 60_000);

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
    () => tasks.filter((task) => task.status === "PENDING" || task.status === "PLANNED" || task.status === "IN_PROGRESS"),
    [tasks]
  );

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);

  async function registerPushToken(authToken: string) {
    if (!Device.isDevice) return; // Simulator'da çalışmaz
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    // Get native APNs device token (works without EAS/Expo account)
    const deviceTokenData = await Notifications.getDevicePushTokenAsync();
    const deviceToken = typeof deviceTokenData.data === "string"
      ? deviceTokenData.data
      : JSON.stringify(deviceTokenData.data);

    await fetch(`${API_BASE_URL}/api/auth/push-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        "x-client-source": "APP",
      },
      body: JSON.stringify({ token: deviceToken, platform: Platform.OS }),
    });
  }

  async function login(email: string, password: string): Promise<string | null> {
    try {
      setBooting(true);
      const json = await apiFetchPublic<MobileLoginResponse>("/api/auth/mobile-login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (json.user?.role !== "DRIVER") return "Bu uygulama yalnizca soforler icin";

      await AsyncStorage.setItem(TOKEN_KEY, json.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(json.user));
      setToken(json.token);
      setUser(json.user);

      // Register Expo push token
      registerPushToken(json.token).catch(() => {});

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
    setMessages([]);
    setMessageUnreadCount(0);
    setDriverId("");
    setDriverProfile(null);
    setVehicleHistory([]);
    setRecentJobs([]);
    setCurrentTaskAttachments([]);
    setOverviewStats({ totalJobs: 0, completedJobs: 0, totalFuelRecords: 0 });
  }

  async function refreshAll() {
    await Promise.all([loadTasks(), loadNotifications(), loadMessages(), loadDriverMe()]);
  }

  async function loadTasks(): Promise<string | null> {
    if (!token) return null;
    try {
      const data = await apiFetch<{ tasks: DriverTask[] }>("/api/driver/tasks", token);
      setTasks(data.tasks ?? []);
      const firstActive = (data.tasks ?? []).find((task) => task.status === "PENDING" || task.status === "PLANNED" || task.status === "IN_PROGRESS");
      setSelectedTaskId((previous) => previous || firstActive?.id || "");
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

  async function loadMessages(): Promise<string | null> {
    if (!token) return null;
    try {
      const data = await apiFetch<{ messages: DriverMessage[]; unreadCount: number }>("/api/driver/messages", token);
      setMessages(data.messages ?? []);
      setMessageUnreadCount(data.unreadCount ?? 0);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Mesajlar alinamadi";
    }
  }

  async function loadDriverMe(): Promise<string | null> {
    if (!token) return null;
    try {
      const data = await apiFetch<DriverMeResponse>("/api/driver/me", token);
      setDriverId(data.driver.id);
      setDriverProfile(data.driver);
      setDriverPhone(data.driver.phoneNumber ?? "");
      setDriverNotes(data.driver.notes ?? "");
      setAssignedVehicle(data.driver.assignedVehicle?.plateNumber ?? "Atanmamis");
      setDriverAttachments(data.driver.attachments ?? []);
      setVehicleHistory(data.vehicleHistory ?? []);
      setRecentJobs(data.recentJobs ?? []);
      setOverviewStats(data.stats ?? { totalJobs: 0, completedJobs: 0, totalFuelRecords: 0 });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Profil alinamadi";
    }
  }

  async function loadCurrentTaskAttachments(taskId: string): Promise<string | null> {
    if (!token || !taskId) return null;
    try {
      const data = await apiFetch<{ attachments: AttachmentItem[] }>(`/api/driver/orders/${taskId}/attachments`, token);
      setCurrentTaskAttachments(data.attachments ?? []);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Is dokumanlari alinamadi";
    }
  }

  async function pickImage(): Promise<string | null> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("İzin Gerekli", "Fotoğraf seçmek için galeri iznine ihtiyaç var.");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: false,
    });

    if (result.canceled) return null;
    return result.assets[0].uri;
  }

  async function uploadCurrentTaskDocument(label?: string): Promise<string | null> {
    if (!token) return "Oturum bulunamadi";
    if (!selectedTaskId) return "Lutfen once bir is secin";

    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
      type: ["application/pdf", "image/*", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    });

    if (result.canceled) return null;
    const asset = result.assets[0];

    try {
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? "application/octet-stream",
      } as unknown as Blob);
      if (label?.trim()) formData.append("label", label.trim());

      await apiFetchForm(`/api/driver/orders/${selectedTaskId}/attachments`, token, formData);
      await loadCurrentTaskAttachments(selectedTaskId);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Dosya yuklenemedi";
    }
  }

  async function uploadDriverDocument(label?: string): Promise<string | null> {
    if (!token) return "Oturum bulunamadi";

    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
      type: ["application/pdf", "image/*", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    });

    if (result.canceled) return null;
    const asset = result.assets[0];

    try {
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? "application/octet-stream",
      } as unknown as Blob);
      if (label?.trim()) formData.append("label", label.trim());

      await apiFetchForm("/api/driver/me/attachments", token, formData);
      await loadDriverMe();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Sofor dosyasi yuklenemedi";
    }
  }

  async function submitStepUpdate(opts?: { phaseData?: Record<string, string | number>; extraPhotos?: Array<{ uri: string; label: string; note?: string }>; mainPhotoLabel?: string; photoNotes?: Record<string, string> }): Promise<string | null> {
    if (!token) return "Oturum bulunamadi";
    if (!selectedTaskId) return "Lutfen once bir is secin";
    const stepPhotoUri = stepPhotos[stepType] ?? null;
    if (!stepPhotoUri) return "Asama bildirimi icin fotograf zorunlu";

    try {
      // Try to get GPS location before creating the event
      let latitude: number | null = null;
      let longitude: number | null = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
        }
      } catch {
        // Location unavailable — proceed without it
      }

      const eventRes = await apiFetch<{ event: { id: string } }>("/api/driver/events", token, {
        method: "POST",
        body: JSON.stringify({
          orderId: selectedTaskId,
          type: stepType,
          notes: stepNotes || null,
          odometerKm: stepKm ? Number(stepKm) : null,
          phaseData: opts?.phaseData ?? undefined,
          latitude,
          longitude,
        }),
      });

      // Upload main photo
      const mainLabel = opts?.mainPhotoLabel ?? STEP_LABELS[stepType];
      const mainNote = opts?.photoNotes?.[mainLabel] ?? "";
      const formData = new FormData();
      formData.append("file", {
        uri: stepPhotoUri,
        name: `step-${Date.now()}.jpg`,
        type: "image/jpeg",
      } as unknown as Blob);
      formData.append("label", mainLabel);
      if (mainNote) formData.append("note", mainNote);
      await apiFetchForm(`/api/driver/events/${eventRes.event.id}/photos`, token, formData);

      // Upload extra photos (e.g. kantar fisi, smr, etc.)
      if (opts?.extraPhotos) {
        for (const extra of opts.extraPhotos) {
          const fd = new FormData();
          fd.append("file", {
            uri: extra.uri,
            name: `${extra.label}-${Date.now()}.jpg`,
            type: "image/jpeg",
          } as unknown as Blob);
          fd.append("label", extra.label);
          if (extra.note) fd.append("note", extra.note);
          await apiFetchForm(`/api/driver/events/${eventRes.event.id}/photos`, token, fd);
        }
      }

      if (stepType === "START_JOB") {
        await apiFetch("/api/driver/update-status", token, {
          method: "POST",
          body: JSON.stringify({ orderId: selectedTaskId, status: "IN_PROGRESS" }),
        });
      }

      // On DELIVERY, also send END_JOB event and mark completed
      if (stepType === "DELIVERY") {
        const endRes = await apiFetch<{ event: { id: string } }>("/api/driver/events", token, {
          method: "POST",
          body: JSON.stringify({ orderId: selectedTaskId, type: "END_JOB", notes: "Teslim tamamlandi" }),
        });
        // attach same photo to END_JOB event too
        const fd2 = new FormData();
        fd2.append("file", {
          uri: stepPhotoUri,
          name: `end-${Date.now()}.jpg`,
          type: "image/jpeg",
        } as unknown as Blob);
        fd2.append("label", "Teslim");
        await apiFetchForm(`/api/driver/events/${endRes.event.id}/photos`, token, fd2);
        await apiFetch("/api/driver/update-status", token, {
          method: "POST",
          body: JSON.stringify({ orderId: selectedTaskId, status: "COMPLETED" }),
        });
      }

      setStepNotes("");
      setStepKm("");
      await loadTasks();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Asama kaydedilemedi";
    }
  }

  async function loadFuelRequests(): Promise<string | null> {
    if (!token) return null;
    try {
      const data = await apiFetch<{ requests: DriverFuelRequest[] }>("/api/driver/fuel-request", token);
      setFuelRequests(data.requests ?? []);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Yakit talepleri alinamadi";
    }
  }

  async function submitFuelRequest(): Promise<string | null> {
    if (!token) return "Oturum bulunamadi";
    if (!fuelKm) return "KM bilgisi zorunlu";
    if (!fuelTankLeft || !fuelTankRight) return "Sol ve sag depo miktarlari gerekli";

    try {
      await apiFetch("/api/driver/fuel-request", token, {
        method: "POST",
        body: JSON.stringify({
          km: Number(fuelKm),
          tankLeft: Number(fuelTankLeft),
          tankRight: Number(fuelTankRight),
          requestedLiters: fuelRequestedLiters ? Number(fuelRequestedLiters) : null,
          notes: fuelNotes.trim() || null,
        }),
      });
      setFuelKm("");
      setFuelRequestedLiters("");
      setFuelTankLeft("");
      setFuelTankRight("");
      setFuelNotes("");
      await loadFuelRequests();
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
      await loadMessages();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Mesaj gonderilemedi";
    }
  }

  async function deleteMessage(messageId: string): Promise<string | null> {
    if (!token) return "Oturum bulunamadi";
    try {
      await apiFetch(`/api/driver/messages/${messageId}`, token, { method: "DELETE" });
      await loadMessages();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Mesaj silinemedi";
    }
  }

  async function markAllMessagesRead(): Promise<string | null> {
    if (!token) return "Oturum bulunamadi";
    try {
      await apiFetch("/api/driver/messages", token, {
        method: "PATCH",
        body: JSON.stringify({ markAll: true }),
      });
      await loadMessages();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Mesajlar guncellenemedi";
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
    messages,
    messageUnreadCount,
    driverProfile,
    driverPhone,
    setDriverPhone,
    driverNotes,
    setDriverNotes,
    driverAttachments,
    assignedVehicle,
    vehicleHistory,
    recentJobs,
    overviewStats,
    currentTaskAttachments,
    stepType,
    setStepType,
    stepNotes,
    setStepNotes,
    stepKm,
    setStepKm,
    stepPhotos,
    setStepPhoto,
    fuelKm,
    setFuelKm,
    fuelRequestedLiters,
    setFuelRequestedLiters,
    fuelTankLeft,
    setFuelTankLeft,
    fuelTankRight,
    setFuelTankRight,
    fuelNotes,
    setFuelNotes,
    fuelRequests,
    loadFuelRequests,
    login,
    logout,
    refreshAll,
    loadTasks,
    loadNotifications,
    loadMessages,
    pickImage,
    uploadCurrentTaskDocument,
    uploadDriverDocument,
    submitStepUpdate,
    loadFuelRequests,
    submitFuelRequest,
    saveProfile,
    markAllNotificationsRead,
    markAllMessagesRead,
    sendOfficeMessage,
    deleteMessage,
  };
}
