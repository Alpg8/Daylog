import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useMemo, useState } from "react";
import { styles } from "../styles";
import type { DriverMessage, DriverNotification } from "../types";

interface MessagesScreenProps {
  darkMode: boolean;
  messages: DriverMessage[];
  messageUnreadCount: number;
  notifications: DriverNotification[];
  onMarkAllMessagesRead: () => Promise<string | null>;
  onMarkAllNotificationsRead: () => Promise<string | null>;
  onSendOfficeMessage: (subject: string, message: string) => Promise<string | null>;
  onDeleteMessage: (messageId: string) => Promise<string | null>;
}

export function MessagesScreen({
  darkMode,
  messages,
  messageUnreadCount,
  notifications,
  onMarkAllMessagesRead,
  onMarkAllNotificationsRead,
  onSendOfficeMessage,
  onDeleteMessage,
}: MessagesScreenProps) {
  const [subject, setSubject] = useState("Operasyon Notu");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "OFFICE" | "DRIVER">("ALL");

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);
  const filteredMessages = useMemo(() => {
    if (filter === "UNREAD") {
      return messages.filter((item) => item.direction === "OFFICE_TO_DRIVER" && !item.isRead);
    }
    if (filter === "OFFICE") {
      return messages.filter((item) => item.direction === "OFFICE_TO_DRIVER");
    }
    if (filter === "DRIVER") {
      return messages.filter((item) => item.direction === "DRIVER_TO_OFFICE");
    }
    return messages;
  }, [filter, messages]);

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

  async function handleMarkAllMessagesRead() {
    const err = await onMarkAllMessagesRead();
    if (err) Alert.alert("Mesaj", err);
    else Alert.alert("Mesaj", "Ofisten gelen mesajlar okundu olarak isaretlendi");
  }

  async function handleDeleteMessage(messageId: string) {
    const err = await onDeleteMessage(messageId);
    if (err) Alert.alert("Mesaj", err);
    else Alert.alert("Mesaj", "Gonderilen mesaj silindi");
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 18 }}>
      <View style={[styles.gradientCardWarm, darkMode && styles.gradientCardWarmDark]}>
        <View style={styles.sectionHead}>
          <Text style={[styles.gradientCardTitle, darkMode && styles.cardTitleDark]}>Merkez Ofis Mesajlasma</Text>
          <Pressable onPress={handleMarkAllMessagesRead}>
            <Text style={styles.linkText}>Mesaj okundu ({messageUnreadCount})</Text>
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
        <Text style={styles.sectionTitle}>Mesaj Gecmisi</Text>
      </View>

      <View style={styles.stepRow}>
        {[
          { key: "ALL", label: `Tum (${messages.length})` },
          { key: "UNREAD", label: `Okunmamis (${messageUnreadCount})` },
          { key: "OFFICE", label: "Ofisten" },
          { key: "DRIVER", label: "Benden" },
        ].map((item) => (
          <Pressable
            key={item.key}
            style={[styles.stepBtn, filter === item.key && styles.stepBtnActive]}
            onPress={() => setFilter(item.key as "ALL" | "UNREAD" | "OFFICE" | "DRIVER")}
          >
            <Text style={[styles.stepText, filter === item.key && styles.stepTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {filteredMessages.map((item) => (
        <View key={item.id} style={[styles.card, darkMode && styles.cardDark, item.direction === "OFFICE_TO_DRIVER" && !item.isRead && styles.unreadCard]}>
          <View style={styles.sectionHead}>
            <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>
              {item.subject || (item.direction === "OFFICE_TO_DRIVER" ? "Ofisten mesaj" : "Gonderilen mesaj")}
            </Text>
            <Text style={styles.meta}>{item.isRead ? "Okundu" : "Yeni"}</Text>
          </View>
          <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>
            {item.direction === "OFFICE_TO_DRIVER" ? `Gonderen: ${item.senderUser.name}` : "Alici: Merkez Ofis"}
          </Text>
          <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>{item.message}</Text>
          <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString("tr-TR")}</Text>
          {item.direction === "DRIVER_TO_OFFICE" && (
            <Pressable style={styles.inlineDangerBtn} onPress={() => handleDeleteMessage(item.id)}>
              <Text style={styles.inlineDangerBtnText}>Mesaji Sil</Text>
            </Pressable>
          )}
        </View>
      ))}

      {messages.length === 0 && <Text style={styles.emptyText}>Henuz mesaj yok.</Text>}

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Bildirimler</Text>
        <Pressable onPress={handleMarkAllRead}>
          <Text style={styles.linkText}>Okundu isaretle ({unreadCount})</Text>
        </Pressable>
      </View>

      {notifications.slice(0, 20).map((n) => (
        <View key={n.id} style={[styles.card, darkMode && styles.cardDark, !n.isRead && styles.unreadCard]}>
          <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>{n.title}</Text>
          <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>{n.message}</Text>
          <Text style={styles.meta}>{new Date(n.createdAt).toLocaleString("tr-TR")}</Text>
        </View>
      ))}
      {notifications.length === 0 && <Text style={styles.emptyText}>Henuz bildirim yok.</Text>}
    </ScrollView>
  );
}
