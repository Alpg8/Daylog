import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useMemo, useState } from "react";
import { styles } from "../styles";
import type { DriverNotification } from "../types";

interface MessagesScreenProps {
  darkMode: boolean;
  notifications: DriverNotification[];
  onMarkAllNotificationsRead: () => Promise<string | null>;
  onSendOfficeMessage: (subject: string, message: string) => Promise<string | null>;
}

export function MessagesScreen({
  darkMode,
  notifications,
  onMarkAllNotificationsRead,
  onSendOfficeMessage,
}: MessagesScreenProps) {
  const [subject, setSubject] = useState("Operasyon Notu");
  const [message, setMessage] = useState("");

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  async function handleSendOfficeMessage() {
    if (!message.trim()) {
      Alert.alert("Merkez Ofis", "Lutfen mesaj girin");
      return;
    }
    const err = await onSendOfficeMessage(subject, message);
    if (err) {
      Alert.alert("Merkez Ofis", err);
      return;
    }
    setMessage("");
    Alert.alert("Basarili", "Mesaj merkeze iletildi");
  }

  async function handleMarkAllRead() {
    const err = await onMarkAllNotificationsRead();
    if (err) Alert.alert("Bildirim", err);
    else Alert.alert("Bildirim", "Tum bildirimler okundu olarak isaretlendi");
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 18 }}>
      <View style={[styles.gradientCardWarm, darkMode && styles.gradientCardWarmDark]}>
        <View style={styles.sectionHead}>
          <Text style={[styles.gradientCardTitle, darkMode && styles.cardTitleDark]}>Merkez Ofis Mesajlasma</Text>
          <Pressable onPress={handleMarkAllRead}>
            <Text style={styles.linkText}>Okundu isaretle ({unreadCount})</Text>
          </Pressable>
        </View>

        <TextInput
          style={[styles.input, darkMode && styles.inputDark]}
          value={subject}
          onChangeText={setSubject}
          placeholder="Konu"
          placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"}
        />
        <TextInput
          style={[styles.input, styles.textArea, darkMode && styles.inputDark]}
          value={message}
          onChangeText={setMessage}
          placeholder="Merkeze iletilecek mesaj"
          placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"}
          multiline
        />
        <Pressable style={styles.primaryBtn} onPress={handleSendOfficeMessage}>
          <Text style={styles.primaryBtnText}>Mesaji Gonder</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Gelen Bildirimler</Text>
      </View>

      {notifications.slice(0, 20).map((n) => (
        <View key={n.id} style={[styles.card, darkMode && styles.cardDark, !n.isRead && styles.unreadCard]}>
          <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>{n.title}</Text>
          <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>{n.message}</Text>
          <Text style={styles.meta}>{new Date(n.createdAt).toLocaleString("tr-TR")}</Text>
        </View>
      ))}
      {notifications.length === 0 && <Text style={styles.emptyText}>Henuz mesaj/bildirim yok.</Text>}
    </ScrollView>
  );
}
