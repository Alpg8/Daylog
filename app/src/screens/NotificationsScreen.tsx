import { FlatList, Pressable, Text, View } from "react-native";
import { styles } from "../styles";
import type { DriverNotification } from "../types";

interface NotificationsScreenProps {
  notifications: DriverNotification[];
  onMarkAllRead: () => void;
}

export function NotificationsScreen({ notifications, onMarkAllRead }: NotificationsScreenProps) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Bildirimler</Text>
        <Pressable onPress={onMarkAllRead}><Text style={styles.linkText}>Tumunu oku</Text></Pressable>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>Bildirim yok.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.isRead && styles.unreadCard]}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardLine}>{item.message}</Text>
            <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString("tr-TR")}</Text>
          </View>
        )}
      />
    </View>
  );
}
