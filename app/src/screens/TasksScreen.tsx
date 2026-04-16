import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { LOADING_PHASES, STEP_LABELS, UNLOADING_PHASES, type PhaseStep, type StepType } from "../constants";
import { styles } from "../styles";
import type { AttachmentItem, DriverTask } from "../types";

const STATUS_TR: Record<string, string> = {
  PLANNED: "Planli", IN_PROGRESS: "Devam Ediyor", COMPLETED: "Tamamlandi", CANCELLED: "Iptal",
};

interface DataField { key: string; label: string; numeric?: boolean }

const PHASE_DATA_FIELDS: Partial<Record<StepType, DataField[]>> = {
  LOAD: [
    { key: "spanzet_count", label: "Spanzet Sayisi", numeric: true },
    { key: "stanga_count",  label: "Stanga Sayisi",  numeric: true },
    { key: "cita_count",    label: "Cita Sayisi",    numeric: true },
    { key: "equipment_note", label: "Ekipman Notu" },
  ],
  UNLOAD: [
    { key: "outgoing_spanzet",  label: "Cikan Spanzet",    numeric: true },
    { key: "tension_rod_count", label: "Gergi Cubugu Say.", numeric: true },
  ],
};

const EXTRA_PHOTO_LABELS: Partial<Record<StepType, string[]>> = {
  LOAD: ["kantar_fisi"],
  UNLOAD: ["smr", "bosaltma_ani"],
  DELIVERY: ["masraf_fisi"],
};

interface TasksScreenProps {
  darkMode: boolean;
  tasks: DriverTask[];
  selectedTaskId: string;
  selectedTask: DriverTask | null;
  stepType: StepType;
  stepNotes: string;
  stepKm: string;
  stepPhotoUri: string | null;
  currentTaskAttachments: AttachmentItem[];
  onRefresh: () => void;
  onSelectTask: (id: string) => void;
  onStepTypeChange: (step: StepType) => void;
  onStepNotesChange: (value: string) => void;
  onStepKmChange: (value: string) => void;
  onPickStepPhoto: () => void;
  onPickExtraPhoto: (label: string, onDone: (uri: string | null) => void) => void;
  onUploadJobDocument: () => void;
  onSubmitStep: (opts?: { phaseData?: Record<string, string | number>; extraPhotos?: Array<{ uri: string; label: string }> }) => Promise<string | null>;
}

export function TasksScreen(props: TasksScreenProps) {
  const {
    tasks, darkMode, selectedTaskId, selectedTask, stepType, stepNotes, stepKm,
    stepPhotoUri, currentTaskAttachments, onRefresh, onSelectTask, onStepTypeChange,
    onStepNotesChange, onStepKmChange, onPickStepPhoto, onPickExtraPhoto,
    onUploadJobDocument, onSubmitStep,
  } = props;

  const [phaseInputs, setPhaseInputs] = useState<Record<string, string>>({});
  const [extraPhotos, setExtraPhotos] = useState<Record<string, string | null>>({});

  const activeJob = useMemo(
    () => tasks.find((t) => t.status === "IN_PROGRESS") ?? tasks.find((t) => t.status === "PLANNED") ?? tasks[0] ?? null,
    [tasks]
  );
  const currentTask = selectedTask ?? activeJob;
  const phases: PhaseStep[] = useMemo(() => (currentTask?.jobType === "UNLOADING" ? UNLOADING_PHASES : LOADING_PHASES), [currentTask?.jobType]);
  const doneTypes = useMemo(() => new Set(currentTask?.driverEvents?.map((e) => e.type) ?? []), [currentTask?.driverEvents]);
  const activePhase = useMemo(() => phases.find((p) => !doneTypes.has(p.type)) ?? null, [phases, doneTypes]);

  useEffect(() => {
    if (activePhase && stepType !== activePhase.type) onStepTypeChange(activePhase.type);
  }, [activePhase?.type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setPhaseInputs({}); setExtraPhotos({}); }, [stepType]);

  useEffect(() => {
    if (!selectedTaskId && activeJob?.id) onSelectTask(activeJob.id);
  }, [selectedTaskId, activeJob, onSelectTask]);

  const locationKey = activePhase?.locationKey as keyof DriverTask | undefined;
  const officeLocation = locationKey ? (currentTask?.[locationKey] as string | null | undefined) : null;

  async function handleSubmit() {
    const fields = PHASE_DATA_FIELDS[stepType] ?? [];
    const phaseData: Record<string, string | number> = {};
    for (const f of fields) {
      const val = phaseInputs[f.key];
      if (val) phaseData[f.key] = f.numeric ? Number(val) : val;
    }
    const extraPhotosList: Array<{ uri: string; label: string }> = [];
    for (const [label, uri] of Object.entries(extraPhotos)) {
      if (uri) extraPhotosList.push({ uri, label });
    }
    const err = await onSubmitStep({
      phaseData: Object.keys(phaseData).length > 0 ? phaseData : undefined,
      extraPhotos: extraPhotosList.length > 0 ? extraPhotosList : undefined,
    });
    if (err) Alert.alert("Asama Hatasi", err);
    else Alert.alert("Basarili", `${STEP_LABELS[stepType]} kaydedildi`);
  }

  const c = darkMode;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={[styles.card, c && styles.cardDark]}>
        <View style={local.rowBetween}>
          <Text style={[styles.cardTitle, c && styles.cardTitleDark]}>
            {currentTask?.cargoNumber ?? currentTask?.tripNumber ?? "Aktif Is"}
          </Text>
          <View style={[local.badge, currentTask?.status === "IN_PROGRESS" ? local.badgeActive : local.badgePlanned]}>
            <Text style={local.badgeText}>{STATUS_TR[currentTask?.status ?? ""] ?? (currentTask?.status ?? "?")}</Text>
          </View>
        </View>
        {currentTask?.jobType ? (
          <Text style={[local.jobTypeBadgeBase, currentTask.jobType === "UNLOADING" ? local.jobTypeUnload : local.jobTypeLoad]}>
            {currentTask.jobType === "UNLOADING" ? "Bosaltma Isi" : "Yukleme Isi"}
          </Text>
        ) : null}
        {currentTask?.vehicle?.plateNumber ? <Text style={[styles.cardLine, c && styles.cardLineDark]}>Arac: {currentTask.vehicle.plateNumber}</Text> : null}
        {currentTask?.routeText ? <Text style={[styles.cardLine, c && styles.cardLineDark]}>Rota: {currentTask.routeText}</Text> : null}
        {!currentTask && <Text style={[styles.cardLine, c && styles.cardLineDark]}>Aktif is bulunamadi.</Text>}
      </View>

      {currentTask ? (
        <View style={[styles.card, c && styles.cardDark]}>
          <View style={local.rowBetween}>
            <Text style={[styles.cardTitle, c && styles.cardTitleDark]}>Asama Durumu</Text>
            <Pressable onPress={onRefresh}><Text style={styles.linkText}>Yenile</Text></Pressable>
          </View>
          <View style={local.phaseRow}>
            {phases.map((phase, idx) => {
              const done = doneTypes.has(phase.type);
              const isActive = activePhase?.type === phase.type;
              return (
                <View key={phase.type} style={local.phaseStep}>
                  <View style={[local.phaseCircle, done ? local.phaseCircleDone : isActive ? local.phaseCircleActive : local.phaseCircleWaiting]}>
                    <Text style={local.phaseCircleText}>{done ? "v" : String(idx + 1)}</Text>
                  </View>
                  <Text style={[local.phaseLabel, done ? local.phaseDoneLabel : isActive ? local.phaseActiveLabel : local.phaseWaitLabel]}>
                    {phase.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {currentTask && activePhase ? (
        <View style={[styles.card, c && styles.cardDark]}>
          <Text style={[styles.cardTitle, c && styles.cardTitleDark]}>Asama: {activePhase.label}</Text>
          {officeLocation ? (
            <View style={local.locationBox}>
              <Text style={local.locationLabel}>Ofis Konumu</Text>
              <Text style={[local.locationText, c && { color: "#bae6fd" }]}>{officeLocation}</Text>
            </View>
          ) : null}
          <Text style={[local.fieldLabel, c && { color: "#94a3b8" }]}>Ana Fotograf *</Text>
          <Pressable style={styles.secondaryBtn} onPress={onPickStepPhoto}>
            <Text style={styles.secondaryBtnText}>{stepPhotoUri ? "Fotografı Degistir" : "Fotograf Sec"}</Text>
          </Pressable>
          {stepPhotoUri ? <Image source={{ uri: stepPhotoUri }} style={styles.preview} /> : null}
          {(EXTRA_PHOTO_LABELS[stepType] ?? []).map((label) => (
            <View key={label} style={{ marginTop: 10 }}>
              <Text style={[local.fieldLabel, c && { color: "#94a3b8" }]}>{label.replace(/_/g, " ")}</Text>
              <Pressable style={[styles.secondaryBtn, { marginTop: 2 }]}
                onPress={() => onPickExtraPhoto(label, (uri) => setExtraPhotos((prev) => ({ ...prev, [label]: uri })))}>
                <Text style={styles.secondaryBtnText}>{extraPhotos[label] ? "Degistir" : "Sec"}</Text>
              </Pressable>
              {extraPhotos[label] ? <Image source={{ uri: extraPhotos[label]! }} style={[styles.preview, { height: 80 }]} /> : null}
            </View>
          ))}
          {(PHASE_DATA_FIELDS[stepType] ?? []).map((f) => (
            <View key={f.key} style={{ marginTop: 10 }}>
              <Text style={[local.fieldLabel, c && { color: "#94a3b8" }]}>{f.label}</Text>
              <TextInput
                style={[styles.input, c && styles.inputDark]}
                value={phaseInputs[f.key] ?? ""}
                onChangeText={(v) => setPhaseInputs((prev) => ({ ...prev, [f.key]: v }))}
                placeholder={f.label}
                placeholderTextColor={c ? "#94a3b8" : "#64748b"}
                keyboardType={f.numeric ? "numeric" : "default"}
              />
            </View>
          ))}
          <TextInput style={[styles.input, c && styles.inputDark, { marginTop: 10 }]} value={stepKm} onChangeText={onStepKmChange}
            placeholder="Kilometre (opsiyonel)" placeholderTextColor={c ? "#94a3b8" : "#64748b"} keyboardType="numeric" />
          <TextInput style={[styles.input, styles.textArea, c && styles.inputDark]} value={stepNotes} onChangeText={onStepNotesChange}
            placeholder="Aciklama (opsiyonel)" placeholderTextColor={c ? "#94a3b8" : "#64748b"} multiline />
          <Pressable style={styles.primaryBtn} onPress={handleSubmit}>
            <Text style={styles.primaryBtnText}>{activePhase.label} Kaydet</Text>
          </Pressable>
        </View>
      ) : null}

      {currentTask && !activePhase ? (
        <View style={[styles.card, c && styles.cardDark, { borderColor: "#22c55e", borderWidth: 1.5 }]}>
          <Text style={[styles.cardTitle, { color: "#22c55e" }]}>Tum Asamalar Tamamlandi</Text>
          <Text style={[styles.cardLine, c && styles.cardLineDark]}>Bu is basariyla tamamlandi.</Text>
        </View>
      ) : null}

      {currentTask ? (
        <View style={[styles.card, c && styles.cardDark]}>
          <View style={styles.sectionHead}>
            <Text style={[styles.cardTitle, c && styles.cardTitleDark]}>Is Dokumanlari</Text>
            <Pressable onPress={onUploadJobDocument}><Text style={styles.linkText}>Dokuman Ekle</Text></Pressable>
          </View>
          {currentTaskAttachments.length === 0 ? (
            <Text style={[styles.cardLine, c && styles.cardLineDark]}>Bu ise ait dokuman eklenmedi.</Text>
          ) : (
            currentTaskAttachments.map((a) => (
              <View key={a.id} style={styles.listItemBlock}>
                <Text style={[styles.cardLine, c && styles.cardLineDark]}>{a.label ?? "Dokuman"}</Text>
                <Text style={styles.meta}>{new Date(a.createdAt).toLocaleString("tr-TR")}</Text>
              </View>
            ))
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const local = StyleSheet.create({
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeActive: { backgroundColor: "#0ea5e920" },
  badgePlanned: { backgroundColor: "#64748b20" },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#0ea5e9" },
  jobTypeBadgeBase: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, marginBottom: 6, fontSize: 11, fontWeight: "700" },
  jobTypeLoad: { backgroundColor: "#3b82f620", color: "#3b82f6" },
  jobTypeUnload: { backgroundColor: "#f9731620", color: "#f97316" },
  phaseRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 10 },
  phaseStep: { alignItems: "center", flex: 1 },
  phaseCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  phaseCircleDone: { backgroundColor: "#22c55e" },
  phaseCircleActive: { backgroundColor: "#0ea5e9" },
  phaseCircleWaiting: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "#94a3b8" },
  phaseCircleText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  phaseLabel: { fontSize: 10, textAlign: "center" },
  phaseDoneLabel: { color: "#22c55e" },
  phaseActiveLabel: { color: "#0ea5e9", fontWeight: "700" },
  phaseWaitLabel: { color: "#94a3b8" },
  locationBox: { backgroundColor: "#0ea5e910", borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: "#0ea5e930" },
  locationLabel: { fontSize: 10, fontWeight: "700", color: "#0ea5e9", marginBottom: 2 },
  locationText: { fontSize: 13, color: "#0f172a" },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 2, color: "#475569" },
});
