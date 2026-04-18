import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { styles } from "../styles";
import type { DriverFuelRequest } from "../types";

interface FuelScreenProps {
  darkMode: boolean;
  fuelKm: string;
  fuelRequestedLiters: string;
  fuelTankLeft: string;
  fuelTankRight: string;
  fuelNotes: string;
  fuelRequests: DriverFuelRequest[];
  onKmChange: (value: string) => void;
  onRequestedLitersChange: (value: string) => void;
  onTankLeftChange: (value: string) => void;
  onTankRightChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSubmit: () => Promise<string | null>;
  onRefresh: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Onay Bekliyor",
  APPROVED: "Onaylandi",
  REJECTED: "Reddedildi",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#f59e0b",
  APPROVED: "#22c55e",
  REJECTED: "#ef4444",
};

function RequestCard({ req, darkMode }: { req: DriverFuelRequest; darkMode: boolean }) {
  const date = new Date(req.createdAt).toLocaleDateString("tr-TR");
  const color = STATUS_COLOR[req.status] ?? "#94a3b8";
  return (
    <View style={[styles.card, darkMode && styles.cardDark, { marginBottom: 8, borderLeftWidth: 3, borderLeftColor: color }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <Text style={{ color, fontWeight: "600", fontSize: 12 }}>{STATUS_LABEL[req.status] ?? req.status}</Text>
        <Text style={{ color: darkMode ? "#94a3b8" : "#64748b", fontSize: 12 }}>{date}</Text>
      </View>
      <Text style={[{ fontSize: 13 }, darkMode ? { color: "#e2e8f0" } : { color: "#1e293b" }]}>
        {`KM: ${req.km}  •  Sol: ${req.tankLeft}L  •  Sag: ${req.tankRight}L${req.requestedLiters ? `  •  Talep: ${req.requestedLiters}L` : ""}`}
      </Text>
      {req.notes ? (
        <Text style={{ color: darkMode ? "#94a3b8" : "#64748b", fontSize: 12, marginTop: 4 }}>{req.notes}</Text>
      ) : null}
    </View>
  );
}

export function FuelScreen(props: FuelScreenProps) {
  const {
    darkMode,
    fuelKm,
    fuelRequestedLiters,
    fuelTankLeft,
    fuelTankRight,
    fuelNotes,
    fuelRequests,
    onKmChange,
    onRequestedLitersChange,
    onTankLeftChange,
    onTankRightChange,
    onNotesChange,
    onSubmit,
    onRefresh,
  } = props;

  async function handleSubmit() {
    const err = await onSubmit();
    if (err) Alert.alert("Hata", err);
    else Alert.alert("Gonderildi", "Yakit talebiniz olusturuldu. Onayi bekleniyor.");
  }

  const pending = fuelRequests.filter((r) => r.status === "PENDING");
  const approved = fuelRequests.filter((r) => r.status === "APPROVED");
  const rejected = fuelRequests.filter((r) => r.status === "REJECTED");

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Request form */}
      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Yakit Talebi Olustur</Text>
        <TextInput
          style={[styles.input, darkMode && styles.inputDark]}
          value={fuelKm}
          onChangeText={onKmChange}
          placeholder="Guncel KM"
          placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.input, darkMode && styles.inputDark]}
          value={fuelRequestedLiters}
          onChangeText={onRequestedLitersChange}
          placeholder="Almak istenen litre"
          placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.input, darkMode && styles.inputDark]}
          value={fuelTankLeft}
          onChangeText={onTankLeftChange}
          placeholder="Sol depo (litre)"
          placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.input, darkMode && styles.inputDark]}
          value={fuelTankRight}
          onChangeText={onTankRightChange}
          placeholder="Sag depo (litre)"
          placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.input, darkMode && styles.inputDark]}
          value={fuelNotes}
          onChangeText={onNotesChange}
          placeholder="Not (opsiyonel)"
          placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"}
          multiline
        />
        <Pressable style={styles.primaryBtn} onPress={handleSubmit}>
          <Text style={styles.primaryBtnText}>Talep Gonder</Text>
        </Pressable>
      </View>

      {/* Requests list */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark, { marginBottom: 0 }]}>Taleplerim</Text>
          <Pressable onPress={onRefresh}>
            <Text style={{ color: "#6366f1", fontSize: 12 }}>Yenile</Text>
          </Pressable>
        </View>

        {pending.length > 0 && (
          <>
            <Text style={{ color: "#f59e0b", fontWeight: "600", fontSize: 12, marginBottom: 6 }}>
              ONAY BEKLEYEN ({pending.length})
            </Text>
            {pending.map((r) => <RequestCard key={r.id} req={r} darkMode={darkMode} />)}
          </>
        )}

        {approved.length > 0 && (
          <>
            <Text style={{ color: "#22c55e", fontWeight: "600", fontSize: 12, marginBottom: 6, marginTop: 8 }}>
              ONAYLANDI ({approved.length})
            </Text>
            {approved.map((r) => <RequestCard key={r.id} req={r} darkMode={darkMode} />)}
          </>
        )}

        {rejected.length > 0 && (
          <>
            <Text style={{ color: "#ef4444", fontWeight: "600", fontSize: 12, marginBottom: 6, marginTop: 8 }}>
              REDDEDILDI ({rejected.length})
            </Text>
            {rejected.map((r) => <RequestCard key={r.id} req={r} darkMode={darkMode} />)}
          </>
        )}

        {fuelRequests.length === 0 && (
          <Text style={{ color: darkMode ? "#64748b" : "#94a3b8", textAlign: "center", marginTop: 16 }}>
            Henuz yakit talebiniz yok.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
