import { ActivityIndicator, Alert, SafeAreaView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { styles } from "./src/styles";

// Show push notifications even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
import { TabBar } from "./src/components/TabBar";
import { LoginScreen } from "./src/screens/LoginScreen";
import { TasksScreen } from "./src/screens/TasksScreen";
import { MessagesScreen } from "./src/screens/MessagesScreen";
import { FuelScreen } from "./src/screens/FuelScreen";
import { VehicleScreen } from "./src/screens/VehicleScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { useDriverApp } from "./src/hooks/useDriverApp";
import { THEME_KEY, type TabKey } from "./src/constants";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("job");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);
  const unreadCountsRef = useRef<{ notifications: number; messages: number } | null>(null);

  const app = useDriverApp();

  const {
    booting,
    token,
    user,
    tasks,
    activeTasks,
    notifications,
    messages,
    messageUnreadCount,
    selectedTask,
    selectedTaskId,
    setSelectedTaskId,
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
    routeInfo,
    routeInfoLoading,
    loadRouteInfo,
    login,
    logout,
    loadTasks,
    pickImage,
    uploadCurrentTaskDocument,
    uploadDriverDocument,
    submitStepUpdate,
    submitFuelRequest,
    submitVehicleDamageReport,
    saveProfile,
    markAllNotificationsRead,
    markAllMessagesRead,
    sendOfficeMessage,
    deleteMessage,
  } = app;

  const unreadNotificationsCount = notifications.filter((item) => !item.isRead).length;
  const messagesTabBadgeCount = unreadNotificationsCount + messageUnreadCount;

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const unreadOfficeMessages = messages.filter((item) => item.direction === "OFFICE_TO_DRIVER" && !item.isRead);
    const unreadNotifications = notifications.filter((item) => !item.isRead);

    if (!unreadCountsRef.current) {
      unreadCountsRef.current = {
        notifications: unreadNotifications.length,
        messages: unreadOfficeMessages.length,
      };
      return;
    }

    const counts = unreadCountsRef.current;

    if (unreadOfficeMessages.length > counts.messages) {
      const latestMessage = unreadOfficeMessages[0];
      setToast({
        title: latestMessage.subject || "Ofisten yeni mesaj",
        message: latestMessage.message,
      });
    } else if (unreadNotifications.length > counts.notifications) {
      const latestNotification = unreadNotifications[0];
      setToast({
        title: latestNotification.title,
        message: latestNotification.message,
      });
    }

    counts.notifications = unreadNotifications.length;
    counts.messages = unreadOfficeMessages.length;
  }, [messages, notifications]);

  useEffect(() => {
    if (activeTab === "fuel") void loadFuelRequests();
  }, [activeTab]);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved === "dark") setIsDarkMode(true);
    })();
  }, []);

  useEffect(() => {
    void AsyncStorage.setItem(THEME_KEY, isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  if (booting) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  if (!token || !user) {
    return (
      <LoginScreen
        email={email}
        password={password}
        loading={booting}
        errorMessage={loginError}
        darkMode={isDarkMode}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={async () => {
          setLoginError("");
          const err = await login(email, password);
          if (err) {
            setLoginError(err);
            Alert.alert("Giris Hatasi", err);
          } else {
            setActiveTab("job");
          }
        }}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.screen, isDarkMode && styles.screenDark]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <View style={[styles.headerWrap, isDarkMode && styles.headerWrapDark]}>
        <View style={styles.rowInline}>
          <View style={[styles.brandBadge, isDarkMode && styles.brandBadgeDark]}>
            <Ionicons name="cube-outline" size={14} color={isDarkMode ? "#7dd3fc" : "#0369a1"} />
            <Text style={[styles.brandBadgeText, isDarkMode && styles.brandBadgeTextDark]}>DL</Text>
          </View>
          <View>
          <Text style={[styles.headerKicker, isDarkMode && styles.headerKickerDark]}>Daylog Mobile</Text>
          <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Merhaba, {user.name}</Text>
          </View>
        </View>
      </View>

      {toast ? (
        <View pointerEvents="none" style={styles.toastWrap}>
          <View style={[styles.toastCard, isDarkMode && styles.toastCardDark]}>
            <Text style={[styles.toastTitle, isDarkMode && styles.toastTitleDark]}>{toast.title}</Text>
            <Text numberOfLines={2} style={[styles.toastMessage, isDarkMode && styles.toastMessageDark]}>{toast.message}</Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.content, isDarkMode && styles.contentDark]}>
        {activeTab === "job" && (
          <TasksScreen
            darkMode={isDarkMode}
            tasks={tasks}
            assignedVehicle={assignedVehicle}
            selectedTaskId={selectedTaskId}
            selectedTask={selectedTask}
            stepType={stepType}
            stepNotes={stepNotes}
            stepKm={stepKm}
            stepPhotos={stepPhotos}
            currentTaskAttachments={currentTaskAttachments}
            onRefresh={async () => {
              const err = await loadTasks();
              if (err) Alert.alert("Isler", err);
            }}
            onSelectTask={setSelectedTaskId}
            onStepTypeChange={setStepType}
            onStepNotesChange={setStepNotes}
            onStepKmChange={setStepKm}
            onPickStepPhoto={async (phase) => {
              const result = await pickImage();
              if (result) setStepPhoto(phase, result);
            }}
            onPickExtraPhoto={(label, onDone) => {
              pickImage().then((uri) => {
                onDone(uri ?? null);
              });
            }}
            onUploadJobDocument={async () => {
              const err = await uploadCurrentTaskDocument(selectedTask?.cargoNumber ?? selectedTask?.tripNumber ?? undefined);
              if (err) Alert.alert("Is Dokumani", err);
              else Alert.alert("Basarili", "Dokuman yuklendi");
            }}
            onSubmitStep={submitStepUpdate}
            routeInfo={routeInfo}
            routeInfoLoading={routeInfoLoading}
            onRefreshRoute={() => { if (selectedTaskId) void loadRouteInfo(selectedTaskId); }}
          />
        )}

        {activeTab === "messages" && (
          <MessagesScreen
            darkMode={isDarkMode}
            messages={messages}
            messageUnreadCount={messageUnreadCount}
            notifications={notifications}
            onMarkAllNotificationsRead={markAllNotificationsRead}
            onMarkAllMessagesRead={markAllMessagesRead}
            onSendOfficeMessage={sendOfficeMessage}
            onDeleteMessage={deleteMessage}
          />
        )}

        {activeTab === "fuel" && (
          <FuelScreen
            darkMode={isDarkMode}
            fuelKm={fuelKm}
            fuelRequestedLiters={fuelRequestedLiters}
            fuelTankLeft={fuelTankLeft}
            fuelTankRight={fuelTankRight}
            fuelNotes={fuelNotes}
            fuelRequests={fuelRequests}
            onKmChange={setFuelKm}
            onRequestedLitersChange={setFuelRequestedLiters}
            onTankLeftChange={setFuelTankLeft}
            onTankRightChange={setFuelTankRight}
            onNotesChange={setFuelNotes}
            onSubmit={submitFuelRequest}
            onRefresh={loadFuelRequests}
          />
        )}

        {activeTab === "vehicle" && (
          <VehicleScreen
            darkMode={isDarkMode}
            assignedVehicle={assignedVehicle}
            driverProfile={driverProfile}
            vehicleHistory={vehicleHistory}
            recentJobs={recentJobs}
            overviewStats={overviewStats}
          />
        )}

        {activeTab === "profile" && (
          <ProfileScreen
            user={user}
            driverProfile={driverProfile}
            driverAttachments={driverAttachments}
            tasks={tasks}
            driverPhone={driverPhone}
            driverNotes={driverNotes}
            darkMode={isDarkMode}
            onToggleDarkMode={setIsDarkMode}
            onUploadDriverDocument={uploadDriverDocument}
            onPhoneChange={setDriverPhone}
            onNotesChange={setDriverNotes}
            onSave={saveProfile}
            onLogout={logout}
          />
        )}
      </View>

      <TabBar activeTab={activeTab} onChange={setActiveTab} darkMode={isDarkMode} messagesBadgeCount={messagesTabBadgeCount} />
    </SafeAreaView>
  );
}
