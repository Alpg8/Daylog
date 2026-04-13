import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { styles } from "../styles";

interface FuelScreenProps {
  darkMode: boolean;
  fuelDate: string;
  fuelLiters: string;
  fuelStation: string;
  fuelCost: string;
  fuelPhotoUri: string | null;
  onDateChange: (value: string) => void;
  onLitersChange: (value: string) => void;
  onStationChange: (value: string) => void;
  onCostChange: (value: string) => void;
  onPickPhoto: () => void;
  onSubmit: () => Promise<string | null>;
}

export function FuelScreen(props: FuelScreenProps) {
  const {
    darkMode,
    fuelDate,
    fuelLiters,
    fuelStation,
    fuelCost,
    fuelPhotoUri,
    onDateChange,
    onLitersChange,
    onStationChange,
    onCostChange,
    onPickPhoto,
    onSubmit,
  } = props;

  async function handleSubmit() {
    const err = await onSubmit();
    if (err) Alert.alert("Yakit", err);
    else Alert.alert("Basarili", "Yakit talebi gonderildi");
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 18 }}>
      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Yakit Talebi (Fotograf Zorunlu)</Text>
        <TextInput style={[styles.input, darkMode && styles.inputDark]} value={fuelDate} onChangeText={onDateChange} placeholder="Tarih (YYYY-MM-DD)" placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"} />
        <TextInput style={[styles.input, darkMode && styles.inputDark]} value={fuelLiters} onChangeText={onLitersChange} placeholder="Litre" placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"} keyboardType="numeric" />
        <TextInput style={[styles.input, darkMode && styles.inputDark]} value={fuelStation} onChangeText={onStationChange} placeholder="Istasyon" placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"} />
        <TextInput style={[styles.input, darkMode && styles.inputDark]} value={fuelCost} onChangeText={onCostChange} placeholder="Toplam Tutar" placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"} keyboardType="numeric" />
        <Pressable style={styles.secondaryBtn} onPress={onPickPhoto}>
          <Text style={styles.secondaryBtnText}>{fuelPhotoUri ? "Fis Fotografini Degistir" : "Fis Fotografi Sec"}</Text>
        </Pressable>
        {fuelPhotoUri && <Image source={{ uri: fuelPhotoUri }} style={styles.preview} />}
        <Pressable style={styles.primaryBtn} onPress={handleSubmit}>
          <Text style={styles.primaryBtnText}>Yakiti Gonder</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
