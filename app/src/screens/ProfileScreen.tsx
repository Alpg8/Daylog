import { Alert, Linking, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { resolveAppUrl } from "../api";
import { styles } from "../styles";
import type { DriverProfile, DriverTask, DriverUser } from "../types";

interface ProfileScreenProps {
  user: DriverUser;
  driverProfile: DriverProfile | null;
  driverAttachments: DriverProfile["attachments"];
  tasks: DriverTask[];
  driverPhone: string;
  driverNotes: string;
  onUploadDriverDocument: () => Promise<string | null>;
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
    driverProfile,
    driverAttachments,
    tasks,
    driverPhone,
    driverNotes,
    onUploadDriverDocument,
    onPhoneChange,
    onNotesChange,
    onSave,
    onLogout,
    darkMode,
    onToggleDarkMode,
  } = props;

  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");

  async function openAttachment(url: string) {
    const targetUrl = resolveAppUrl(url);
    const supported = await Linking.canOpenURL(targetUrl);
    if (!supported) {
      Alert.alert("Dosya", "Dosya acilamadi");
      return;
    }
    await Linking.openURL(targetUrl);
  }

  async function handleSave() {
    const err = await onSave();
    if (err) Alert.alert("Profil", err);
    else Alert.alert("Profil", "Bilgiler kaydedildi");
  }

  async function handleUploadDriverDocument() {
    const err = await onUploadDriverDocument();
    if (err) Alert.alert("Sofor Dosyasi", err);
    else Alert.alert("Sofor Dosyasi", "Dosya yuklendi");
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 18 }}>
      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Sofor Bilgilerim</Text>
        <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Ad Soyad: {user.name}</Text>
        <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>E-posta: {user.email}</Text>
      </View>

      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Belge Son Kullanım Tarihleri</Text>
        <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Ehliyet: {driverProfile?.licenseExpiryDate ? new Date(driverProfile.licenseExpiryDate).toLocaleDateString("tr-TR") : "-"}</Text>
        <Text style={styles.meta}>Kalan gun: {driverProfile?.licenseRemainingDays ?? "-"}</Text>
        <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Pasaport: {driverProfile?.passportExpiryDate ? new Date(driverProfile.passportExpiryDate).toLocaleDateString("tr-TR") : "-"}</Text>
        <Text style={styles.meta}>Kalan gun: {driverProfile?.passportRemainingDays ?? "-"}</Text>
        <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Psikoteknik: {driverProfile?.psychotechnicExpiryDate ? new Date(driverProfile.psychotechnicExpiryDate).toLocaleDateString("tr-TR") : "-"}</Text>
        <Text style={styles.meta}>Kalan gun: {driverProfile?.psychotechnicRemainingDays ?? "-"}</Text>
      </View>

      <View style={[styles.card, darkMode && styles.cardDark]}>
        <View style={styles.sectionHead}>
          <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Sofor Dosyalarim</Text>
          <Pressable onPress={handleUploadDriverDocument}>
            <Text style={styles.linkText}>Dosya Yukle</Text>
          </Pressable>
        </View>
        {driverAttachments?.length ? (
          driverAttachments.map((attachment) => (
            <View key={attachment.id} style={styles.listItemBlock}>
              <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>{attachment.label ?? "Dosya"}</Text>
              <Text style={styles.meta}>{new Date(attachment.createdAt).toLocaleString("tr-TR")}</Text>
              <Pressable onPress={() => void openAttachment(attachment.url)}>
                <Text style={styles.linkText}>Dosyayi Ac</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Pasaport, ehliyet veya diger sofor belgeleri henuz eklenmemis.</Text>
        )}
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
