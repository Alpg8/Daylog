import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { styles } from "../styles";

interface FuelScreenProps {
  darkMode: boolean;
  fuelDate: string;
  fuelLiters: string;
  fuelStation: string;
  fuelCost: string;
  fuelStartKm: string;
  fuelEndKm: string;
  fuelTankLeft: string;
  fuelTankRight: string;
  onDateChange: (value: string) => void;
  onLitersChange: (value: string) => void;
  onStationChange: (value: string) => void;
  onCostChange: (value: string) => void;
  onStartKmChange: (value: string) => void;
  onEndKmChange: (value: string) => void;
  onTankLeftChange: (value: string) => void;
  onTankRightChange: (value: string) => void;
  onSubmit: () => Promise<string | null>;
}

export function FuelScreen(props: FuelScreenProps) {
  const {
    darkMode,
    fuelDate,
    fuelLiters,
    fuelStation,
    fuelCost,
    fuelStartKm,
    fuelEndKm,
    fuelTankLeft,
    fuelTankRight,
    onDateChange,
    onLitersChange,
    onStationChange,
    onCostChange,
    onStartKmChange,
    onEndKmChange,
    onTankLeftChange,
    onTankRightChange,
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
        <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Yakit Bilgisi</Text>
        <TextInput style={[styles.input, darkMode && styles.inputDark]} value={fuelDate} onChangeText={onDateChange} placeholder="Tarih (YYYY-MM-DD)" placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"} />
        <TextInput style={[styles.input, darkMode && styles.inputDark]} value={fuelLiters} onChangeText={onLitersChange} placeholder="Litre" placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"} keyboardType="numeric" />
        <TextInput style={[styles.input, darkMode && styles.inputDark]} value={fuelStation} onChangeText={onStationChange} placeholder="Istasyon" placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"} />
        <TextInput style={[styles.input, darkMode && styles.inputDark]} value={fuelCost} onChangeText={onCostChange} placeholder="Toplam Tutar" placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"} keyboardType="numeric" />
        <TextInput style={[styles.input, darkMode && styles.inputDark]} value={fuelStartKm} onChangeText={onStartKmChange} placeholder="Baslangic KM" placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"} keyboardType="numeric" />
        <TextInput style={[styles.input, darkMode && styles.inputDark]} value={fuelEndKm} onChangeText={onEndKmChange} placeholder="Bitis KM" placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"} keyboardType="numeric" />
        <TextInput style={[styles.input, darkMode && styles.inputDark]} value={fuelTankLeft} onChangeText={onTankLeftChange} placeholder="Sol depo miktari" placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"} keyboardType="numeric" />
        <TextInput style={[styles.input, darkMode && styles.inputDark]} value={fuelTankRight} onChangeText={onTankRightChange} placeholder="Sag depo miktari" placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"} keyboardType="numeric" />
        <Pressable style={styles.primaryBtn} onPress={handleSubmit}>
          <Text style={styles.primaryBtnText}>Yakiti Gonder</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
