import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { LOADING_PHASES, STEP_LABELS, UNLOADING_PHASES, type PhaseStep, type StepType } from "../constants";
import { styles } from "../styles";
import type { AttachmentItem, DriverTask } from "../types";

const STATUS_TR: Record<string, string> = {
  PLANNED: "Planli", IN_PROGRESS: "Devam Ediyor", COMPLETED: "Tamamlandi", CANCELLED: "Iptal",
};

interface DataField { key: string; label: string; numeric?: boolean; required?: boolean }

const PHASE_DATA_FIELDS: Partial<Record<StepType, DataField[]>> = {
  LOAD: [
    { key: "spanzet_count",  label: "Spanzet Sayisi",  numeric: true,  required: true },
    { key: "stanga_count",   label: "Stanga Sayisi",   numeric: true,  required: true },
    { key: "cita_count",     label: "Cita Sayisi",     numeric: true,  required: false },
    { key: "equipment_note", label: "Ekipman Notu",                    required: false },
  ],
  UNLOAD: [
    { key: "outgoing_spanzet",  label: "Cikan Spanzet",       numeric: true, required: true },
    { key: "tension_rod_count", label: "Gergi Cubugu Sayisi", numeric: true, required: false },
  ],
};

// Semantic label key used when uploading the mandatory main photo
const MAIN_PHOTO_LABEL: Partial<Record<StepType, string>> = {
  START_JOB: "genel",
  LOAD:      "genel",
  UNLOAD:    "smr",
  DELIVERY:  "teslim",
};

// Human-readable title shown above the main photo picker per phase
const MAIN_PHOTO_DISPLAY: Partial<Record<StepType, string>> = {
  START_JOB: "Genel Foto *",
  LOAD:      "Genel Foto *",
  UNLOAD:    "SMR Foto *",
  DELIVERY:  "Teslim Foto *",
};

// Extra labeled photos per phase — key = upload label, value = display name, required flag
interface ExtraPhotoConfig { label: string; display: string; required: boolean }
const EXTRA_PHOTO_CONFIGS: Partial<Record<StepType, ExtraPhotoConfig[]>> = {
  LOAD:     [{ label: "kantar_fisi",  display: "Kantar Fisi *",           required: true }],
  UNLOAD:   [{ label: "bosaltma_ani", display: "Bosaltma Ani Foto *",     required: true }],
  DELIVERY: [
    { label: "masraf_fisi_1", display: "Masraf Fisi 1",              required: false },
    { label: "masraf_fisi_2", display: "Masraf Fisi 2",              required: false },
  ],
};

interface TasksScreenProps {
  darkMode: boolean;
  tasks: DriverTask[];
  selectedTaskId: string;
  selectedTask: DriverTask | null;
  stepType: StepType;
  stepNotes: string;
  stepKm: string;
  stepPhotos: Partial<Record<StepType, string | null>>;
  currentTaskAttachments: AttachmentItem[];
  onRefresh: () => void;
  onSelectTask: (id: string) => void;
  onStepTypeChange: (step: StepType) => void;
  onStepNotesChange: (value: string) => void;
  onStepKmChange: (value: string) => void;
  onPickStepPhoto: (phase: StepType) => void;
  onPickExtraPhoto: (label: string, onDone: (uri: string | null) => void) => void;
  onUploadJobDocument: () => void;
  onSubmitStep: (opts?: { phaseData?: Record<string, string | number>; extraPhotos?: Array<{ uri: string; label: string }>; mainPhotoLabel?: string }) => Promise<string | null>;
}

export function TasksScreen(props: TasksScreenProps) {
  const {
    tasks, darkMode, selectedTaskId, selectedTask, stepType, stepNotes, stepKm,
    stepPhotos, currentTaskAttachments, onRefresh, onSelectTask, onStepTypeChange,
    onStepNotesChange, onStepKmChange, onPickStepPhoto, onPickExtraPhoto,
    onUploadJobDocument, onSubmitStep,
  } = props;

  const [phaseInputs, setPhaseInputs] = useState<Record<string, string>>({});
  const [extraPhotos, setExtraPhotos] = useState<Record<string, string | null>>({});
  const [viewingPhase, setViewingPhase] = useState<StepType | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => { setPhaseInputs({}); setExtraPhotos({}); setViewingPhase(null); }, [stepType]);

  useEffect(() => {
    if (!selectedTaskId && activeJob?.id) onSelectTask(activeJob.id);
  }, [selectedTaskId, activeJob, onSelectTask]);

  const locationKey = activePhase?.locationKey as keyof DriverTask | undefined;
  const officeLocation = locationKey ? (currentTask?.[locationKey] as string | null | undefined) : null;

  // The phase being displayed (done phase viewed for photo, or active phase)
  const displayPhase: StepType = viewingPhase ?? stepType;
  const stepPhotoUri = stepPhotos[displayPhase] ?? null;
  // R2 photo URL stored on server for this phase (shown when viewing a completed phase)
  const serverPhotoUrl = useMemo(() => {
    if (!currentTask?.driverEvents) return null;
    const event = currentTask.driverEvents.find((e) => e.type === displayPhase);
    return event?.photos?.[0]?.url ?? null;
  }, [currentTask?.driverEvents, displayPhase]);
  const displayPhotoUri = stepPhotoUri ?? serverPhotoUrl;
  const isViewingDone = viewingPhase !== null && doneTypes.has(viewingPhase);

  // Compute whether all required fields for the current phase are filled
  const canSubmit = useMemo(() => {
    if (!stepPhotos[stepType]) return false;
    const requiredExtras = (EXTRA_PHOTO_CONFIGS[stepType] ?? []).filter((e) => e.required);
    for (const extra of requiredExtras) {
      if (!extraPhotos[extra.label]) return false;
    }
    const requiredDataFields = (PHASE_DATA_FIELDS[stepType] ?? []).filter((f) => f.required);
    for (const f of requiredDataFields) {
      if (!phaseInputs[f.key]?.trim()) return false;
    }
    return true;
  }, [stepPhotos, extraPhotos, phaseInputs, stepType]);

  async function handleSubmit() {
    if (!canSubmit) {
      Alert.alert("Eksik Bilgi", "Lutfen zorunlu fotografları ve alanları doldurun.");
      return;
    }
    const fields = PHASE_DATA_FIELDS[stepType] ?? [];
    const phaseData: Record<string, string | number> = {};
    for (const f of fields) {
      const val = phaseInputs[f.key];
      if (val) phaseData[f.key] = f.numeric ? Number(val) : val;
    }
    const extraPhotosList: Array<{ uri: string; label: string }> = [];
    for (const cfg of (EXTRA_PHOTO_CONFIGS[stepType] ?? [])) {
      const uri = extraPhotos[cfg.label];
      if (uri) extraPhotosList.push({ uri, label: cfg.label });
    }
    const err = await onSubmitStep({
      phaseData: Object.keys(phaseData).length > 0 ? phaseData : undefined,
      extraPhotos: extraPhotosList.length > 0 ? extraPhotosList : undefined,
      mainPhotoLabel: MAIN_PHOTO_LABEL[stepType] ?? "genel",
    });
    if (err) Alert.alert("Asama Hatasi", err);
    else Alert.alert("Basarili", `${STEP_LABELS[stepType]} kaydedildi`);
  }

  const c = darkMode;

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await onRefresh(); setRefreshing(false); }} />}
    >
      {tasks.length > 1 && (
        <View style={[styles.card, c && styles.cardDark]}>
          <Text style={[styles.cardTitle, c && styles.cardTitleDark]}>Isler ({tasks.filter(t => t.status === "PLANNED" || t.status === "IN_PROGRESS").length})</Text>
          {tasks.filter(t => t.status === "PLANNED" || t.status === "IN_PROGRESS").map((t) => (
            <Pressable
              key={t.id}
              onPress={() => onSelectTask(t.id)}
              style={[local.taskRow, (currentTask?.id === t.id) && local.taskRowSelected]}
            >
              <Text style={[local.taskRowText, c && local.taskRowTextDark]} numberOfLines={1}>
                {t.cargoNumber ?? t.tripNumber ?? t.id.slice(0, 8)}
              </Text>
              <View style={[local.badge, t.status === "IN_PROGRESS" ? local.badgeActive : local.badgePlanned]}>
                <Text style={local.badgeText}>{STATUS_TR[t.status] ?? t.status}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

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
          </View>
          <View style={local.phaseRow}>
            {phases.map((phase, idx) => {
              const done = doneTypes.has(phase.type);
              const isActive = activePhase?.type === phase.type;
              const isViewing = viewingPhase === phase.type || (viewingPhase === null && isActive);
              const tappable = done || isActive;
              return (
                <Pressable
                  key={phase.type}
                  style={local.phaseStep}
                  onPress={() => tappable ? setViewingPhase(done ? phase.type : null) : undefined}
                >
                  <View style={[
                    local.phaseCircle,
                    done ? local.phaseCircleDone : isActive ? local.phaseCircleActive : local.phaseCircleWaiting,
                    isViewing ? local.phaseCircleSelected : null,
                  ]}>
                    <Text style={local.phaseCircleText}>{done ? (stepPhotos[phase.type] || currentTask.driverEvents?.find((e) => e.type === phase.type)?.photos?.[0] ? "📷" : "✓") : String(idx + 1)}</Text>
                  </View>
                  <Text style={[local.phaseLabel, done ? local.phaseDoneLabel : isActive ? local.phaseActiveLabel : local.phaseWaitLabel]}>
                    {phase.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {currentTask && (viewingPhase !== null || activePhase) ? (
        <View style={[styles.card, c && styles.cardDark]}>
          <View style={local.rowBetween}>
            <Text style={[styles.cardTitle, c && styles.cardTitleDark]}>
              Asama: {phases.find((p) => p.type === displayPhase)?.label ?? STEP_LABELS[displayPhase]}
            </Text>
            {isViewingDone && (
              <Pressable onPress={() => setViewingPhase(null)}>
                <Text style={styles.linkText}>Aktif Asama →</Text>
              </Pressable>
            )}
          </View>

          {/* Location sent from office */}
          {officeLocation ? (
            <View style={local.locationBox}>
              <Text style={local.locationLabel}>📍 Konum (Ofisten)</Text>
              <Text style={[local.locationText, c && { color: "#bae6fd" }]}>{officeLocation}</Text>
            </View>
          ) : (
            <View style={[local.locationBox, { borderColor: "#94a3b830" }]}>
              <Text style={[local.locationLabel, { color: "#94a3b8" }]}>📍 Konum henüz girilmedi</Text>
            </View>
          )}

          {/* Main required photo */}
          <Text style={[local.fieldLabel, c && { color: "#94a3b8" }]}>{MAIN_PHOTO_DISPLAY[displayPhase] ?? "Ana Fotograf *"}</Text>
          <Pressable style={[styles.secondaryBtn, stepPhotoUri ? local.btnDone : null]} onPress={() => onPickStepPhoto(displayPhase)}>
            <Text style={styles.secondaryBtnText}>{stepPhotoUri ? "✓ Fotograf Secildi — Degistir" : "Fotograf Sec"}</Text>
          </Pressable>
          {displayPhotoUri ? <Image source={{ uri: displayPhotoUri }} style={local.photoLarge} /> : null}

          {/* Extra labeled photos — only for active (non-done-viewing) phase */}
          {!isViewingDone && (EXTRA_PHOTO_CONFIGS[displayPhase] ?? []).map((cfg) => (
            <View key={cfg.label} style={{ marginTop: 10 }}>
              <Text style={[local.fieldLabel, c && { color: "#94a3b8" }]}>{cfg.display}</Text>
              <Pressable
                style={[styles.secondaryBtn, { marginTop: 2 }, extraPhotos[cfg.label] ? local.btnDone : null]}
                onPress={() => onPickExtraPhoto(cfg.label, (uri) => setExtraPhotos((prev) => ({ ...prev, [cfg.label]: uri })))}>
                <Text style={styles.secondaryBtnText}>{extraPhotos[cfg.label] ? "✓ Secildi — Degistir" : "Sec"}</Text>
              </Pressable>
              {extraPhotos[cfg.label] ? <Image source={{ uri: extraPhotos[cfg.label]! }} style={[styles.preview, { height: 80 }]} /> : null}
            </View>
          ))}

          {/* Phase data fields — only for active phase */}
          {!isViewingDone && (PHASE_DATA_FIELDS[displayPhase] ?? []).map((f) => (
            <View key={f.key} style={{ marginTop: 10 }}>
              <Text style={[local.fieldLabel, c && { color: "#94a3b8" }]}>{f.label}{f.required ? " *" : ""}</Text>
              <TextInput
                style={[styles.input, c && styles.inputDark,
                  f.required && !phaseInputs[f.key]?.trim() ? local.inputRequired : null]}
                value={phaseInputs[f.key] ?? ""}
                onChangeText={(v) => setPhaseInputs((prev) => ({ ...prev, [f.key]: v }))}
                placeholder={f.label}
                placeholderTextColor={c ? "#94a3b8" : "#64748b"}
                keyboardType={f.numeric ? "numeric" : "default"}
              />
            </View>
          ))}

          {!isViewingDone && (
            <>
              <TextInput style={[styles.input, c && styles.inputDark, { marginTop: 10 }]} value={stepKm} onChangeText={onStepKmChange}
                placeholder="Kilometre (opsiyonel)" placeholderTextColor={c ? "#94a3b8" : "#64748b"} keyboardType="numeric" />
              <TextInput style={[styles.input, styles.textArea, c && styles.inputDark]} value={stepNotes} onChangeText={onStepNotesChange}
                placeholder="Aciklama (opsiyonel)" placeholderTextColor={c ? "#94a3b8" : "#64748b"} multiline />

              {/* Submit — disabled until all required fields filled */}
              <Pressable
                style={[styles.primaryBtn, !canSubmit && local.btnDisabled]}
                onPress={handleSubmit}
                disabled={false}
              >
                <Text style={styles.primaryBtnText}>{activePhase?.label ?? ""} Kaydet</Text>
              </Pressable>
              {!canSubmit && (
                <Text style={local.validationHint}>Zorunlu (*) alanları doldurun</Text>
              )}
            </>
          )}
          {isViewingDone && (
            <Text style={[local.validationHint, { color: "#22c55e", marginTop: 8 }]}>Bu asama tamamlandi.</Text>
          )}
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
  phaseCircleSelected: { borderWidth: 3, borderColor: "#f59e0b" },
  phaseCircleText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  phaseLabel: { fontSize: 10, textAlign: "center" },
  phaseDoneLabel: { color: "#22c55e" },
  phaseActiveLabel: { color: "#0ea5e9", fontWeight: "700" },
  phaseWaitLabel: { color: "#94a3b8" },
  locationBox: { backgroundColor: "#0ea5e910", borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: "#0ea5e930" },
  locationLabel: { fontSize: 11, fontWeight: "700", color: "#0ea5e9", marginBottom: 2 },
  locationText: { fontSize: 13, color: "#0f172a" },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 2, color: "#475569" },
  btnDone: { backgroundColor: "#22c55e20", borderColor: "#22c55e", borderWidth: 1 },
  btnDisabled: { backgroundColor: "#94a3b830", opacity: 0.6 },
  inputRequired: { borderColor: "#f97316", borderWidth: 1.5 },
  validationHint: { fontSize: 11, color: "#f97316", textAlign: "center", marginTop: 6 },
  photoLarge: { width: "100%", height: 240, borderRadius: 8, marginTop: 8, resizeMode: "cover" } as const,
  taskRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8, marginTop: 4 },
  taskRowSelected: { backgroundColor: "#0ea5e915", borderWidth: 1, borderColor: "#0ea5e940" },
  taskRowText: { fontSize: 13, fontWeight: "600", color: "#0f172a", flex: 1, marginRight: 8 },
  taskRowTextDark: { color: "#f1f5f9" },
});
