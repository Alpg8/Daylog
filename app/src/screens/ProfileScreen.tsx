import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { styles } from "../styles";
import type { DriverTask, DriverUser } from "../types";

interface ProfileScreenProps {
  user: DriverUser;
  tasks: DriverTask[];
  driverPhone: string;
  driverNotes: string;
  onPhoneChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSave: () => Promise<string | null>;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: (value: boolean) => void;
}

export function ProfileScreen(props: ProfileScreenProps) {
  const {
    user,
    tasks,
    driverPhone,
    driverNotes,
    onPhoneChange,
    onNotesChange,
    onSave,
    onLogout,
    darkMode,
    onToggleDarkMode,
  } = props;

  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");

  async function handleSave() {
    const err = await onSave();
    if (err) Alert.alert("Profil", err);
    else Alert.alert("Profil", "Bilgiler kaydedildi");
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 18 }}>
      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Sofor Bilgilerim</Text>
        <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Ad Soyad: {user.name}</Text>
        <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>E-posta: {user.email}</Text>
      </View>

      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Devam Eden Isler ({inProgressTasks.length})</Text>
        {inProgressTasks.length === 0 && <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Devam eden is yok.</Text>}
        {inProgressTasks.map((item) => (
          <View key={item.id} style={styles.listItemBlock}>
            <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>{item.cargoNumber ?? item.tripNumber ?? "Is"}</Text>
            <Text style={styles.meta}>Arac: {item.vehicle?.plateNumber ?? "-"}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Tamamlanan Isler ({completedTasks.length})</Text>
        {completedTasks.length === 0 && <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Tamamlanan is yok.</Text>}
        {completedTasks.slice(0, 8).map((item) => (
          <View key={item.id} style={styles.listItemBlock}>
            <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>{item.cargoNumber ?? item.tripNumber ?? "Is"}</Text>
            <Text style={styles.meta}>Guncelleme: {item.updatedAt ? new Date(item.updatedAt).toLocaleString("tr-TR") : "-"}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, darkMode && styles.cardDark]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Gorunum</Text>
          <View style={styles.rowInline}>
            <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Karanlik Mod</Text>
            <Switch value={darkMode} onValueChange={onToggleDarkMode} />
          </View>
        </View>
      </View>

      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Iletisim ve Notlar</Text>
        <TextInput
          style={[styles.input, darkMode && styles.inputDark]}
          value={driverPhone}
          onChangeText={onPhoneChange}
          placeholder="Telefon"
          placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"}
        />
        <TextInput
          style={[styles.input, styles.textArea, darkMode && styles.inputDark]}
          value={driverNotes}
          onChangeText={onNotesChange}
          placeholder="Not"
          placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"}
          multiline
        />

        <Pressable style={[styles.primaryBtn, darkMode && styles.primaryBtnDark]} onPress={handleSave}>
          <Text style={styles.primaryBtnText}>Bilgileri Kaydet</Text>
        </Pressable>
        <Pressable style={[styles.logoutBtn, darkMode && styles.logoutBtnDark]} onPress={onLogout}>
          <Text style={styles.logoutText}>Cikis Yap</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
