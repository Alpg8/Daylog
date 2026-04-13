import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useEffect, useMemo } from "react";
import { STEP_LABELS, type StepType } from "../constants";
import { styles } from "../styles";
import type { DriverTask } from "../types";

interface TasksScreenProps {
  darkMode: boolean;
  tasks: DriverTask[];
  selectedTaskId: string;
  selectedTask: DriverTask | null;
  stepType: StepType;
  stepNotes: string;
  stepKm: string;
  stepPhotoUri: string | null;
  onRefresh: () => void;
  onSelectTask: (id: string) => void;
  onStepTypeChange: (step: StepType) => void;
  onStepNotesChange: (value: string) => void;
  onStepKmChange: (value: string) => void;
  onPickStepPhoto: () => void;
  onSubmitStep: () => Promise<string | null>;
}

export function TasksScreen(props: TasksScreenProps) {
  const {
    tasks,
    darkMode,
    selectedTaskId,
    selectedTask,
    stepType,
    stepNotes,
    stepKm,
    stepPhotoUri,
    onRefresh,
    onSelectTask,
    onStepTypeChange,
    onStepNotesChange,
    onStepKmChange,
    onPickStepPhoto,
    onSubmitStep,
  } = props;

  const activeJob = useMemo(
    () => tasks.find((t) => t.status === "IN_PROGRESS") ?? tasks.find((t) => t.status === "PLANNED") ?? tasks[0] ?? null,
    [tasks]
  );
  const currentTask = selectedTask ?? activeJob;

  const routeRemainingText = useMemo(() => {
    if (!activeJob?.unloadingDate) return "Veri yok (ornek: 2s 15dk)";
    const eta = new Date(activeJob.unloadingDate);
    if (Number.isNaN(eta.getTime())) return "Veri okunamadi";
    const diffMs = eta.getTime() - Date.now();
    if (diffMs <= 0) return "Varis zamani gecmis";
    const totalMin = Math.round(diffMs / 60000);
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return `${hours}s ${mins}dk`;
  }, [activeJob]);

  const visualUploadStatus = stepPhotoUri ? "Hazir (gorsel secildi)" : "Beklemede";
  const lastEvent = currentTask?.driverEvents?.[0] ?? null;

  useEffect(() => {
    if (!selectedTaskId && activeJob?.id) {
      onSelectTask(activeJob.id);
    }
  }, [selectedTaskId, activeJob, onSelectTask]);

  async function handleSubmit() {
    const err = await onSubmitStep();
    if (err) Alert.alert("Asama", err);
    else Alert.alert("Basarili", `${STEP_LABELS[stepType]} kaydedildi`);
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 18 }}>
      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Mevcut Is Ozeti</Text>
        {activeJob ? (
          <>
            <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Is: {activeJob.cargoNumber ?? activeJob.tripNumber ?? "Atama"}</Text>
            <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Durum: {activeJob.status}</Text>
            <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Arac: {activeJob.vehicle?.plateNumber ?? "-"}</Text>
            <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Rota: {activeJob.routeText ?? "-"}</Text>
            <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Rota kalan sure: {routeRemainingText}</Text>
            <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Gorsel yukleme: {visualUploadStatus}</Text>
            <Text style={styles.meta}>
              Son asama: {lastEvent ? `${lastEvent.type} (${new Date(lastEvent.eventAt).toLocaleString("tr-TR")})` : "Henuz asama bildirimi yok"}
            </Text>
          </>
        ) : (
          <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Aktif is bulunamadi.</Text>
        )}
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Asama Bildirimi</Text>
        <Pressable onPress={onRefresh}><Text style={styles.linkText}>Yenile</Text></Pressable>
      </View>

      {!currentTask && <Text style={styles.emptyText}>Atanmis aktif is yok.</Text>}

      {currentTask && (
        <View style={[styles.card, darkMode && styles.cardDark]}>
          <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Asama Bildirimi (Zorunlu Fotograf)</Text>
          <View style={styles.stepRow}>
            {(["START_JOB", "LOAD", "DELIVERY", "END_JOB"] as StepType[]).map((s) => (
              <Pressable key={s} onPress={() => onStepTypeChange(s)} style={[styles.stepBtn, stepType === s && styles.stepBtnActive]}>
                <Text style={[styles.stepText, stepType === s && styles.stepTextActive]}>{STEP_LABELS[s]}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={[styles.input, darkMode && styles.inputDark]} value={stepKm} onChangeText={onStepKmChange} placeholder="Kilometre (opsiyonel)" placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"} keyboardType="numeric" />
          <TextInput style={[styles.input, styles.textArea, darkMode && styles.inputDark]} value={stepNotes} onChangeText={onStepNotesChange} placeholder="Aciklama" placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"} multiline />

          <Pressable style={styles.secondaryBtn} onPress={onPickStepPhoto}>
            <Text style={styles.secondaryBtnText}>{stepPhotoUri ? "Asama Fotografini Degistir" : "Asama Fotografi Sec"}</Text>
          </Pressable>
          {stepPhotoUri && <Image source={{ uri: stepPhotoUri }} style={styles.preview} />}

          <Pressable style={styles.primaryBtn} onPress={handleSubmit}>
            <Text style={styles.primaryBtnText}>Asamayi Kaydet</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
