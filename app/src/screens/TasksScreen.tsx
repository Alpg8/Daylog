import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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

const MAIN_PHOTO_LABEL: Partial<Record<StepType, string>> = {
  START_JOB: "genel",
  LOAD:      "genel",
  UNLOAD:    "smr",
  DELIVERY:  "teslim",
};

const MAIN_PHOTO_DISPLAY: Partial<Record<StepType, string>> = {
  START_JOB: "Genel Foto *",
  LOAD:      "Genel Foto *",
  UNLOAD:    "SMR Foto *",
  DELIVERY:  "Teslim Foto *",
};

interface ExtraPhotoConfig { label: string; display: string; required: boolean }
const EXTRA_PHOTO_CONFIGS: Partial<Record<StepType, ExtraPhotoConfig[]>> = {
  LOAD:     [{ label: "kantar_fisi",  display: "Kantar Fisi *",       required: true }],
  UNLOAD:   [{ label: "bosaltma_ani", display: "Bosaltma Ani Foto *", required: true }],
  DELIVERY: [
    { label: "masraf_fisi_1", display: "Masraf Fisi 1",  required: false },
    { label: "masraf_fisi_2", display: "Masraf Fisi 2",  required: false },
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
  onSubmitStep: (opts?: {
    phaseData?: Record<string, string | number>;
    extraPhotos?: Array<{ uri: string; label: string; note?: string }>;
    mainPhotoLabel?: string;
    photoNotes?: Record<string, string>;
  }) => Promise<string | null>;
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
  const [photoNotes, setPhotoNotes] = useState<Record<string, string>>({});
  const [viewingPhase, setViewingPhase] = useState<StepType | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => { setPhaseInputs({}); setExtraPhotos({}); setPhotoNotes({}); setViewingPhase(null); }, [stepType]);

  useEffect(() => {
    if (!selectedTaskId && activeJob?.id) onSelectTask(activeJob.id);
  }, [selectedTaskId, activeJob, onSelectTask]);

  const locationKey = activePhase?.locationKey as keyof DriverTask | undefined;
  const officeLocation = locationKey ? (currentTask?.[locationKey] as string | null | undefined) : null;

  const displayPhase: StepType = viewingPhase ?? stepType;
  const stepPhotoUri = stepPhotos[displayPhase] ?? null;
  const serverPhotoUrl = useMemo(() => {
    if (!currentTask?.driverEvents) return null;
    const event = currentTask.driverEvents.find((e) => e.type === displayPhase);
    return event?.photos?.[0]?.url ?? null;
  }, [currentTask?.driverEvents, displayPhase]);
  const displayPhotoUri = stepPhotoUri ?? serverPhotoUrl;
  const isViewingDone = viewingPhase !== null && doneTypes.has(viewingPhase);

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
      Alert.alert("Eksik Bilgi", "Lutfen zorunlu fotograflari ve alanlari doldurun.");
      return;
    }
    setSubmitting(true);
    try {
      const fields = PHASE_DATA_FIELDS[stepType] ?? [];
      const phaseData: Record<string, string | number> = {};
      for (const f of fields) {
        const val = phaseInputs[f.key];
        if (val) phaseData[f.key] = f.numeric ? Number(val) : val;
      }
      const extraPhotosList: Array<{ uri: string; label: string; note?: string }> = [];
      for (const cfg of (EXTRA_PHOTO_CONFIGS[stepType] ?? [])) {
        const uri = extraPhotos[cfg.label];
        if (uri) extraPhotosList.push({ uri, label: cfg.label, note: photoNotes[cfg.label] || undefined });
      }
      const err = await onSubmitStep({
        phaseData: Object.keys(phaseData).length > 0 ? phaseData : undefined,
        extraPhotos: extraPhotosList.length > 0 ? extraPhotosList : undefined,
        mainPhotoLabel: MAIN_PHOTO_LABEL[stepType] ?? "genel",
        photoNotes,
      });
      if (err) Alert.alert("Asama Hatasi", err);
      else Alert.alert("Basarili", `${STEP_LABELS[stepType]} kaydedildi`);
    } finally {
      setSubmitting(false);
    }
  }

  const c = darkMode;

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await onRefresh(); setRefreshing(false); }} />}
    >
      {/* Task selector */}
      {tasks.filter(t => t.status === "PLANNED" || t.status === "IN_PROGRESS").length > 1 && (
        <View style={[styles.card, c && styles.cardDark]}>
          <Text style={[styles.cardTitle, c && styles.cardTitleDark]}>
            Isler ({tasks.filter(t => t.status === "PLANNED" || t.status === "IN_PROGRESS").length})
          </Text>
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

      {/* Active task info */}
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
        {currentTask?.vehicle?.plateNumber ? (
          <Text style={[styles.cardLine, c && styles.cardLineDark]}>🚛  {currentTask.vehicle.plateNumber}</Text>
        ) : null}
        {currentTask?.routeText ? (
          <Text style={[styles.cardLine, c && styles.cardLineDark]}>📍  {currentTask.routeText}</Text>
        ) : null}
        {!currentTask && <Text style={[styles.cardLine, c && styles.cardLineDark]}>Aktif is bulunamadi.</Text>}
      </View>

      {/* Phase stepper */}
      {currentTask ? (
        <View style={[styles.card, c && styles.cardDark]}>
          <Text style={[styles.cardTitle, c && styles.cardTitleDark]}>Is Akisi</Text>
          <View style={local.stepperRow}>
            {phases.map((phase, idx) => {
              const done = doneTypes.has(phase.type);
              const isActive = activePhase?.type === phase.type;
              const isViewing = viewingPhase === phase.type || (viewingPhase === null && isActive);
              const tappable = done || isActive;
              const isLast = idx === phases.length - 1;
              return (
                <View key={phase.type} style={[local.stepperItem, { flex: 1 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Pressable
                      style={[
                        local.stepCircle,
                        done ? local.stepCircleDone : isActive ? local.stepCircleActive : local.stepCircleWaiting,
                        isViewing ? local.stepCircleViewing : null,
                      ]}
                      onPress={() => tappable ? setViewingPhase(done ? phase.type : null) : undefined}
                    >
                      <Text style={[local.stepCircleText, (done || isActive) ? { color: "#fff" } : { color: "#94a3b8" }]}>
                        {done ? "✓" : String(idx + 1)}
                      </Text>
                    </Pressable>
                    {!isLast && (
                      <View style={[local.stepConnector, done ? local.stepConnectorDone : local.stepConnectorWait]} />
                    )}
                  </View>
                  <Text
                    style={[
                      local.stepLabel,
                      done ? local.stepLabelDone : isActive ? local.stepLabelActive : local.stepLabelWait,
                    ]}
                    numberOfLines={2}
                  >
                    {phase.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Phase form */}
      {currentTask && (viewingPhase !== null || activePhase) ? (
        <View style={[styles.card, c && styles.cardDark]}>
          <View style={local.rowBetween}>
            <View>
              <Text style={[styles.cardTitle, c && styles.cardTitleDark]}>
                {phases.find((p) => p.type === displayPhase)?.label ?? STEP_LABELS[displayPhase]}
              </Text>
              {isViewingDone && <Text style={local.donePhaseMeta}>Tamamlandi ✓</Text>}
            </View>
            {isViewingDone && (
              <Pressable onPress={() => setViewingPhase(null)} style={local.backBtn}>
                <Text style={local.backBtnText}>Aktif Asama →</Text>
              </Pressable>
            )}
          </View>

          {/* Office location */}
          {!isViewingDone && (officeLocation ? (
            <View style={local.locationBox}>
              <Text style={local.locationLabel}>📍  Varis Konumu (Ofisten)</Text>
              <Text style={[local.locationText, c && { color: "#bae6fd" }]}>{officeLocation}</Text>
            </View>
          ) : (
            <View style={[local.locationBox, { borderColor: "#94a3b820", backgroundColor: "transparent" }]}>
              <Text style={{ fontSize: 12, color: "#94a3b8" }}>📍  Konum henuz girilmedi</Text>
            </View>
          ))}

          {/* Main photo */}
          <PhotoPicker
            darkMode={c}
            label={MAIN_PHOTO_DISPLAY[displayPhase] ?? "Ana Fotograf *"}
            photoUri={displayPhotoUri}
            noteKey={MAIN_PHOTO_LABEL[displayPhase] ?? "genel"}
            note={photoNotes[MAIN_PHOTO_LABEL[displayPhase] ?? "genel"] ?? ""}
            onPickPhoto={isViewingDone ? undefined : () => onPickStepPhoto(displayPhase)}
            onNoteChange={(key, val) => setPhotoNotes((prev) => ({ ...prev, [key]: val }))}
            isViewOnly={isViewingDone}
          />

          {/* Extra photos */}
          {!isViewingDone && (EXTRA_PHOTO_CONFIGS[displayPhase] ?? []).map((cfg) => (
            <PhotoPicker
              key={cfg.label}
              darkMode={c}
              label={cfg.display}
              photoUri={extraPhotos[cfg.label] ?? null}
              noteKey={cfg.label}
              note={photoNotes[cfg.label] ?? ""}
              onPickPhoto={() => onPickExtraPhoto(cfg.label, (uri) => setExtraPhotos((prev) => ({ ...prev, [cfg.label]: uri })))}
              onNoteChange={(key, val) => setPhotoNotes((prev) => ({ ...prev, [key]: val }))}
              isViewOnly={false}
            />
          ))}

          {/* Phase data fields */}
          {!isViewingDone && (PHASE_DATA_FIELDS[displayPhase] ?? []).map((f) => (
            <View key={f.key} style={local.inputGroup}>
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

          {/* Km + general notes + submit */}
          {!isViewingDone && (
            <>
              <View style={local.inputGroup}>
                <Text style={[local.fieldLabel, c && { color: "#94a3b8" }]}>Kilometre</Text>
                <TextInput
                  style={[styles.input, c && styles.inputDark]}
                  value={stepKm}
                  onChangeText={onStepKmChange}
                  placeholder="opsiyonel"
                  placeholderTextColor={c ? "#94a3b8" : "#64748b"}
                  keyboardType="numeric"
                />
              </View>
              <View style={local.inputGroup}>
                <Text style={[local.fieldLabel, c && { color: "#94a3b8" }]}>Genel Aciklama</Text>
                <TextInput
                  style={[styles.input, styles.textArea, c && styles.inputDark]}
                  value={stepNotes}
                  onChangeText={onStepNotesChange}
                  placeholder="opsiyonel"
                  placeholderTextColor={c ? "#94a3b8" : "#64748b"}
                  multiline
                />
              </View>

              <Pressable
                style={[local.submitBtn, !canSubmit && local.submitBtnDisabled, submitting && local.submitBtnLoading]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={local.submitBtnText}>
                    {canSubmit ? `${activePhase?.label ?? ""} Kaydet` : `${activePhase?.label ?? ""} Kaydet`}
                  </Text>
                )}
              </Pressable>

              {!canSubmit && (
                <Text style={local.validationHint}>⚠  Zorunlu (*) fotograflari ve alanlari doldurun</Text>
              )}
            </>
          )}
        </View>
      ) : null}

      {/* All done */}
      {currentTask && !activePhase ? (
        <View style={[styles.card, c && styles.cardDark, local.completedCard]}>
          <Text style={local.completedTitle}>✓  Tum Asamalar Tamamlandi</Text>
          <Text style={[styles.cardLine, c && styles.cardLineDark]}>Bu is basariyla tamamlandi.</Text>
        </View>
      ) : null}

      {/* Documents */}
      {currentTask ? (
        <View style={[styles.card, c && styles.cardDark]}>
          <View style={styles.sectionHead}>
            <Text style={[styles.cardTitle, c && styles.cardTitleDark]}>Is Dokumanlari</Text>
            <Pressable onPress={onUploadJobDocument} style={local.addDocBtn}>
              <Text style={local.addDocBtnText}>+ Ekle</Text>
            </Pressable>
          </View>
          {currentTaskAttachments.length === 0 ? (
            <Text style={[styles.cardLine, c && styles.cardLineDark]}>Henuz dokuman eklenmedi.</Text>
          ) : (
            currentTaskAttachments.map((a) => (
              <View key={a.id} style={[local.docRow, c && local.docRowDark]}>
                <Text style={local.docIcon}>📄</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[local.docLabel, c && { color: "#f1f5f9" }]}>{a.label ?? "Dokuman"}</Text>
                  <Text style={styles.meta}>{new Date(a.createdAt).toLocaleString("tr-TR")}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

// ─── Photo picker sub-component ───────────────────────────────────────────────

interface PhotoPickerProps {
  darkMode: boolean;
  label: string;
  photoUri: string | null;
  noteKey: string;
  note: string;
  onPickPhoto?: () => void;
  onNoteChange: (key: string, val: string) => void;
  isViewOnly: boolean;
}

function PhotoPicker({ darkMode: c, label, photoUri, noteKey, note, onPickPhoto, onNoteChange, isViewOnly }: PhotoPickerProps) {
  const picked = !!photoUri && !photoUri.startsWith("https://");
  return (
    <View style={local.photoBlock}>
      <Text style={[local.fieldLabel, c && { color: "#94a3b8" }]}>{label}</Text>

      {!isViewOnly && (
        <Pressable
          style={[local.photoPickerBtn, picked ? local.photoPickerBtnDone : null]}
          onPress={onPickPhoto}
        >
          <Text style={[local.photoPickerBtnText, picked && { color: "#22c55e" }]}>
            {picked ? "📷  Degistir" : "📷  Fotograf Sec"}
          </Text>
        </Pressable>
      )}

      {photoUri ? (
        <Image source={{ uri: photoUri }} style={local.photoPreview} />
      ) : null}

      {!isViewOnly && (
        <TextInput
          style={[local.noteInput, c && { backgroundColor: "#1e293b", color: "#f1f5f9", borderColor: "#334155" }]}
          value={note}
          onChangeText={(v) => onNoteChange(noteKey, v)}
          placeholder="Bu fotograf icin not ekle (opsiyonel)"
          placeholderTextColor={c ? "#64748b" : "#94a3b8"}
          multiline
          numberOfLines={2}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const local = StyleSheet.create({
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeActive: { backgroundColor: "#0ea5e920" },
  badgePlanned: { backgroundColor: "#64748b20" },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#0ea5e9" },
  jobTypeBadgeBase: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, marginBottom: 6, fontSize: 11, fontWeight: "700" },
  jobTypeLoad: { backgroundColor: "#f9731615", color: "#f97316" },
  jobTypeUnload: { backgroundColor: "#3b82f615", color: "#3b82f6" },

  stepperRow: { flexDirection: "row", marginTop: 12 },
  stepperItem: { alignItems: "center" },
  stepCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  stepCircleDone: { backgroundColor: "#22c55e" },
  stepCircleActive: { backgroundColor: "#0ea5e9" },
  stepCircleWaiting: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "#cbd5e1" },
  stepCircleViewing: { borderWidth: 2.5, borderColor: "#f59e0b" },
  stepCircleText: { fontSize: 13, fontWeight: "700" },
  stepConnector: { flex: 1, height: 2.5, borderRadius: 1.5 },
  stepConnectorDone: { backgroundColor: "#22c55e" },
  stepConnectorWait: { backgroundColor: "#e2e8f0" },
  stepLabel: { fontSize: 10, textAlign: "center", marginTop: 5, maxWidth: 70 },
  stepLabelDone: { color: "#22c55e", fontWeight: "600" },
  stepLabelActive: { color: "#0ea5e9", fontWeight: "700" },
  stepLabelWait: { color: "#94a3b8" },

  donePhaseMeta: { fontSize: 11, color: "#22c55e", marginTop: 1 },
  backBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "#0ea5e910", borderWidth: 1, borderColor: "#0ea5e930" },
  backBtnText: { fontSize: 12, color: "#0ea5e9", fontWeight: "600" },

  locationBox: { backgroundColor: "#0ea5e908", borderRadius: 10, padding: 10, marginVertical: 8, borderWidth: 1, borderColor: "#0ea5e925" },
  locationLabel: { fontSize: 11, fontWeight: "700", color: "#0ea5e9", marginBottom: 3 },
  locationText: { fontSize: 13, fontWeight: "500", color: "#0f172a" },

  photoBlock: { marginTop: 14 },
  photoPickerBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#94a3b8",
    marginTop: 4,
    backgroundColor: "transparent",
  },
  photoPickerBtnDone: { borderStyle: "solid", borderColor: "#22c55e", backgroundColor: "#22c55e08" },
  photoPickerBtnText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  photoPreview: { width: "100%", height: 220, borderRadius: 10, marginTop: 8, resizeMode: "cover" } as const,
  noteInput: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#334155",
    backgroundColor: "#f8fafc",
    minHeight: 42,
  },

  inputGroup: { marginTop: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 3, color: "#475569" },
  inputRequired: { borderColor: "#f97316", borderWidth: 1.5 },

  submitBtn: {
    marginTop: 16,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnDisabled: { backgroundColor: "#94a3b8", shadowOpacity: 0, elevation: 0 },
  submitBtnLoading: { backgroundColor: "#0284c7" },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "#fff", letterSpacing: 0.2 },
  validationHint: { fontSize: 11.5, color: "#f97316", textAlign: "center", marginTop: 8 },

  completedCard: { borderColor: "#22c55e", borderWidth: 1.5 },
  completedTitle: { fontSize: 16, fontWeight: "700", color: "#22c55e", marginBottom: 6 },

  addDocBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "#0ea5e910", borderWidth: 1, borderColor: "#0ea5e930" },
  addDocBtnText: { fontSize: 12, color: "#0ea5e9", fontWeight: "700" },
  docRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 9, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  docRowDark: { borderBottomColor: "#1e293b" },
  docIcon: { fontSize: 17, marginTop: 1 },
  docLabel: { fontSize: 13, fontWeight: "600", color: "#0f172a" },

  taskRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8, marginTop: 4 },
  taskRowSelected: { backgroundColor: "#0ea5e910", borderWidth: 1, borderColor: "#0ea5e935" },
  taskRowText: { fontSize: 13, fontWeight: "600", color: "#0f172a", flex: 1, marginRight: 8 },
  taskRowTextDark: { color: "#f1f5f9" },
});
