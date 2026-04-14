import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles";
import type { TabKey } from "../constants";

interface TabBarProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
  darkMode?: boolean;
  messagesBadgeCount?: number;
}

function TabButton({
  icon,
  label,
  active,
  darkMode,
  badgeCount,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  active: boolean;
  darkMode?: boolean;
  badgeCount?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tabButton,
        darkMode && styles.tabButtonDark,
        active && styles.tabButtonActive,
        active && darkMode && styles.tabButtonActiveDark,
      ]}
    >
      <Ionicons
        name={icon}
        size={24}
        style={[styles.tabIcon, darkMode && styles.tabIconDark, active && styles.tabIconActive]}
      />
      <Text
        style={[
          styles.tabLabel,
          darkMode && styles.tabLabelDark,
          active && styles.tabLabelActive,
          active && darkMode && styles.tabLabelActiveDark,
        ]}
      >
        {label}
      </Text>
      {badgeCount ? (
        <View style={[styles.tabBadge, darkMode && styles.tabBadgeDark]}>
          <Text style={styles.tabBadgeText}>{badgeCount > 99 ? "99+" : badgeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function TabBar({ activeTab, onChange, darkMode = false, messagesBadgeCount = 0 }: TabBarProps) {
  return (
    <View style={[styles.tabBar, darkMode && styles.tabBarDark]}>
      <TabButton icon="briefcase-outline" label="Is" darkMode={darkMode} active={activeTab === "job"} onPress={() => onChange("job")} />
      <TabButton icon="chatbubble-ellipses-outline" label="Mesaj" badgeCount={messagesBadgeCount} darkMode={darkMode} active={activeTab === "messages"} onPress={() => onChange("messages")} />
      <TabButton icon="car-sport-outline" label="Arac" darkMode={darkMode} active={activeTab === "vehicle"} onPress={() => onChange("vehicle")} />
      <TabButton icon="water-outline" label="Yakit" darkMode={darkMode} active={activeTab === "fuel"} onPress={() => onChange("fuel")} />
      <TabButton icon="person-circle-outline" label="Profilim" darkMode={darkMode} active={activeTab === "profile"} onPress={() => onChange("profile")} />
    </View>
  );
}
