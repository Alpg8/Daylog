import { ActivityIndicator, Alert, SafeAreaView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./src/styles";
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
  const [email, setEmail] = useState("driver@example.com");
  const [password, setPassword] = useState("Driver12345!");
  const [loginError, setLoginError] = useState("");

  const app = useDriverApp();

  const {
    booting,
    token,
    user,
    tasks,
    activeTasks,
    notifications,
    selectedTask,
    selectedTaskId,
    setSelectedTaskId,
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
    loadTasks,
    pickImage,
    submitStepUpdate,
    submitFuelRequest,
    saveProfile,
    markAllNotificationsRead,
    sendOfficeMessage,
  } = app;

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

      <View style={[styles.content, isDarkMode && styles.contentDark]}>
        {activeTab === "job" && (
          <TasksScreen
            darkMode={isDarkMode}
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            selectedTask={selectedTask}
            stepType={stepType}
            stepNotes={stepNotes}
            stepKm={stepKm}
            stepPhotoUri={stepPhotoUri}
            onRefresh={async () => {
              const err = await loadTasks();
              if (err) Alert.alert("Isler", err);
            }}
            onSelectTask={setSelectedTaskId}
            onStepTypeChange={setStepType}
            onStepNotesChange={setStepNotes}
            onStepKmChange={setStepKm}
            onPickStepPhoto={async () => {
              const result = await pickImage();
              if (result?.startsWith("/")) setStepPhotoUri(result);
              else if (result) Alert.alert("Fotograf", result);
            }}
            onSubmitStep={submitStepUpdate}
          />
        )}

        {activeTab === "messages" && (
          <MessagesScreen
            darkMode={isDarkMode}
            notifications={notifications}
            onMarkAllNotificationsRead={markAllNotificationsRead}
            onSendOfficeMessage={sendOfficeMessage}
          />
        )}

        {activeTab === "fuel" && (
          <FuelScreen
            darkMode={isDarkMode}
            fuelDate={fuelDate}
            fuelLiters={fuelLiters}
            fuelStation={fuelStation}
            fuelCost={fuelCost}
            fuelPhotoUri={fuelPhotoUri}
            onDateChange={setFuelDate}
            onLitersChange={setFuelLiters}
            onStationChange={setFuelStation}
            onCostChange={setFuelCost}
            onPickPhoto={async () => {
              const result = await pickImage();
              if (result?.startsWith("/")) setFuelPhotoUri(result);
              else if (result) Alert.alert("Fotograf", result);
            }}
            onSubmit={submitFuelRequest}
          />
        )}

        {activeTab === "vehicle" && (
          <VehicleScreen
            darkMode={isDarkMode}
            assignedVehicle={assignedVehicle}
            vehicleHistory={vehicleHistory}
            recentJobs={recentJobs}
            overviewStats={overviewStats}
          />
        )}

        {activeTab === "profile" && (
          <ProfileScreen
            user={user}
            tasks={tasks}
            driverPhone={driverPhone}
            driverNotes={driverNotes}
            darkMode={isDarkMode}
            onToggleDarkMode={setIsDarkMode}
            onPhoneChange={setDriverPhone}
            onNotesChange={setDriverNotes}
            onSave={saveProfile}
            onLogout={logout}
          />
        )}
      </View>

      <TabBar activeTab={activeTab} onChange={setActiveTab} darkMode={isDarkMode} />
    </SafeAreaView>
  );
}
