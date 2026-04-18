import { ActivityIndicator, Alert, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { FULL_PHASES, LOADING_PHASES, SIMPLE_PHASES, UNLOADING_PHASES, STEP_LABELS, type PhaseStep, type StepType } from "../constants";
import { styles } from "../styles";
import type { AttachmentItem, DriverTask } from "../types";
import { API_BASE_URL } from "../config";

type JobType = "LOADING" | "UNLOADING" | "FULL" | null | undefined;

const STATUS_TR: Record<string, string> = {
  PENDING: "Beklemede", PLANNED: "Planli", IN_PROGRESS: "Devam Ediyor", COMPLETED: "Tamamlandi", CANCELLED: "Iptal",
};

const PHASE_ICONS: Partial<Record<StepType, string>> = {
  START_JOB: "🚛",
  LOAD:      "📦",
  UNLOAD:    "🔄",
  DELIVERY:  "📬",
  END_JOB:   "🏁",
};

// Job type meta
const JOB_TYPE_LABEL: Record<string, string> = {
  LOADING:  "Yukleme Is",
  UNLOADING: "Bosaltma Is",
  FULL:     "Yukleme + Bosaltma",
};
const JOB_TYPE_FLOW: Record<string, string> = {
  LOADING:  "Basla  →  Yukle  →  Bitir",
  UNLOADING: "Basla  →  Bosalt  →  Bitir",
  FULL:     "Basla  →  Yukle  →  Bosalt  →  Bitir",
};

// ─── Photo / form configuration per job type ──────────────────────────────────

interface DataField { key: string; label: string; numeric?: boolean; required?: boolean }
interface ExtraPhotoConfig { label: string; display: string; required: boolean }

// Main phase photo labels – same per phase 
const MAIN_PHOTO_LABEL: Partial<Record<StepType, string>> = {
  START_JOB: "baslangic",
  LOAD:      "yukleme",
  UNLOAD:    "smr",
  DELIVERY:  "teslim",
  END_JOB:   "bitis",
};

function getMainPhotoDisplay(phase: StepType, jobType: JobType): string {
  switch (phase) {
    case "START_JOB": return "Arac Foto";
    case "LOAD":      return "Yukleme Foto";
    case "UNLOAD":    return "SMR Foto";
    case "DELIVERY":  return "Teslim Foto";
    case "END_JOB":
      if (jobType === "LOADING") return "Son Durum Foto";
      if (jobType === "UNLOADING") return "Bosaltma Bitis Foto";
      return "Bitis Foto";
    default: return "Foto";
  }
}

function getExtraPhotos(phase: StepType, jobType: JobType): ExtraPhotoConfig[] {
  if (phase === "START_JOB") {
    if (jobType === "LOADING" || jobType === "FULL") {
      return [{ label: "arac_on", display: "Arac On Foto", required: false }];
    }
    if (jobType === "UNLOADING") {
      return [
        { label: "arac_on",    display: "Arac On Foto",    required: false },
        { label: "bosaltma_belge", display: "Bosaltma Belgesi", required: false },
      ];
    }
    return [{ label: "arac_on", display: "Arac On Foto", required: false }];
  }
  if (phase === "LOAD") {
    return [
      { label: "kantar_fisi",   display: "Kantar Fisi",    required: false },
      { label: "yukleme_belge", display: "Yukleme Belgesi",required: false },
    ];
  }
  if (phase === "UNLOAD") {
    return [
      { label: "bosaltma_ani",  display: "Bosaltma Ani Foto",  required: false },
      { label: "smr_detay",     display: "SMR Detay Foto",     required: false },
    ];
  }
  if (phase === "END_JOB") {
    if (jobType === "LOADING" || jobType === "FULL") {
      return [
        { label: "spanzet_cikis", display: "Spanzet Cikis Foto", required: false },
        { label: "masraf_fisi",   display: "Masraf Fisi",         required: false },
      ];
    }
    if (jobType === "UNLOADING") {
      return [
        { label: "bos_dorsie",  display: "Bos Dorse Foto",  required: false },
        { label: "masraf_fisi", display: "Masraf Fisi",      required: false },
      ];
    }
    return [{ label: "masraf_fisi", display: "Masraf Fisi", required: false }];
  }
  return [];
}

function getDataFields(phase: StepType, jobType: JobType): DataField[] {
  if (phase === "LOAD") {
    return [
      { key: "spanzet_count",  label: "Spanzet Sayisi", numeric: true },
      { key: "stanga_count",   label: "Stanga Sayisi",  numeric: true },
      { key: "cita_count",     label: "Cita Sayisi",    numeric: true },
      { key: "equipment_note", label: "Ekipman Notu" },
    ];
  }
  if (phase === "UNLOAD") {
    return [
      { key: "outgoing_spanzet",  label: "Cikan Spanzet",       numeric: true },
      { key: "tension_rod_count", label: "Gergi Cubugu Sayisi", numeric: true },
    ];
  }
  if (phase === "END_JOB" && (jobType === "LOADING" || jobType === "FULL")) {
    return [
      { key: "return_spanzet", label: "Iade Spanzet Sayisi", numeric: true },
    ];
  }
  return [];
}

// Helper to open address in maps
function openMaps(address: string) {
  const encoded = encodeURIComponent(address);
  const mapsUrl = `maps://?q=${encoded}`;
  Linking.canOpenURL(mapsUrl).then(ok => Linking.openURL(ok ? mapsUrl : `https://maps.apple.com/?q=${encoded}`));
}

interface TasksScreenProps {
  darkMode: boolean;
  tasks: DriverTask[];
  assignedVehicle?: string;
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
    onUploadJobDocument, onSubmitStep, assignedVehicle,
  } = props;

  const [phaseInputs, setPhaseInputs] = useState<Record<string, string>>({});
  const [extraPhotos, setExtraPhotos] = useState<Record<string, string | null>>({});
  const [photoNotes, setPhotoNotes] = useState<Record<string, string>>({});
  const [viewingPhase, setViewingPhase] = useState<StepType | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeTasks = useMemo(() => tasks.filter((t) => t.status === "PENDING" || t.status === "PLANNED" || t.status === "IN_PROGRESS"), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.status === "COMPLETED" || t.status === "CANCELLED"), [tasks]);
  const activeJob = useMemo(
    () => activeTasks.find((t) => t.status === "IN_PROGRESS") ?? activeTasks.find((t) => t.status === "PLANNED") ?? activeTasks[0] ?? null,
    [activeTasks]
  );
  const currentTask = selectedTask ?? activeJob;
  const phases: PhaseStep[] = useMemo(() => {
    if (currentTask?.jobType === "FULL") return FULL_PHASES;
    if (currentTask?.jobType === "UNLOADING") return UNLOADING_PHASES;
    if (currentTask?.jobType === "LOADING") return LOADING_PHASES;
    return SIMPLE_PHASES;
  }, [currentTask?.jobType]);
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
  const phaseLocation = locationKey ? (currentTask?.[locationKey] as string | null | undefined) : null;
  // Fall back to order-level addresses when no phase-specific location is set
  const officeLocation = phaseLocation || (() => {
    const type = activePhase?.type;
    if (!currentTask) return null;
    if (type === "LOAD") return currentTask.loadingAddress ?? null;
    if (type === "UNLOAD" || type === "DELIVERY" || type === "END_JOB") return currentTask.deliveryAddress ?? null;
    if (type === "START_JOB") {
      // For UNLOADING jobs go to unload/delivery, others go to loading point
      return currentTask.jobType === "UNLOADING"
        ? currentTask.deliveryAddress ?? null
        : currentTask.loadingAddress ?? currentTask.deliveryAddress ?? null;
    }
    return null;
  })();

  const displayPhase: StepType = viewingPhase ?? stepType;
  const stepPhotoUri = stepPhotos[displayPhase] ?? null;
  const serverPhotoUrl = useMemo(() => {
    if (!currentTask?.driverEvents) return null;
    const event = currentTask.driverEvents.find((e) => e.type === displayPhase);
    const rawUrl = event?.photos?.[0]?.url ?? null;
    if (!rawUrl) return null;
    // Proxy R2 public URLs through the API server (direct r2.dev access is unreliable from most networks)
    const r2Pattern = /^https:\/\/pub-[a-f0-9]+\.r2\.dev\//;
    if (r2Pattern.test(rawUrl)) {
      const key = rawUrl.replace(/^https:\/\/pub-[a-f0-9]+\.r2\.dev\//, "");
      return `${API_BASE_URL}/api/r2-image?key=${encodeURIComponent(key)}`;
    }
    return rawUrl;
  }, [currentTask?.driverEvents, displayPhase]);
  const displayPhotoUri = stepPhotoUri ?? serverPhotoUrl;
  const isViewingDone = viewingPhase !== null && doneTypes.has(viewingPhase);

  const canSubmit = true;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const fields = getDataFields(stepType, currentTask?.jobType);
      const phaseData: Record<string, string | number> = {};
      for (const f of fields) {
        const val = phaseInputs[f.key];
        if (val) phaseData[f.key] = f.numeric ? Number(val) : val;
      }
      const extraPhotosList: Array<{ uri: string; label: string; note?: string }> = [];
      for (const cfg of getExtraPhotos(stepType, currentTask?.jobType)) {
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
    <View style={{ flex: 1 }}>
    <ScrollView
      contentContainerStyle={{ paddingBottom: currentTask ? 100 : 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await onRefresh(); setRefreshing(false); }} />}
    >
      {/* Task selector – ALL jobs */}
      {tasks.length > 0 && (
        <View style={[styles.card, c && styles.cardDark]}>
          <Text style={[styles.cardTitle, c && styles.cardTitleDark]}>Isler ({tasks.length})</Text>
          {/* Active jobs first */}
          {activeTasks.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => onSelectTask(t.id)}
              style={[local.taskRow, (currentTask?.id === t.id) && local.taskRowSelected]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[local.taskRowText, c && local.taskRowTextDark]} numberOfLines={1}>
                  {t.cargoNumber ?? t.tripNumber ?? t.id.slice(0, 8)}
                </Text>
                {t.routeText ? <Text style={[local.historyMeta, c && { color: "#94a3b8" }]} numberOfLines={1}>{t.routeText}</Text> : null}
              </View>
              <View style={[local.badge, t.status === "IN_PROGRESS" ? local.badgeActive : local.badgePlanned]}>
                <Text style={local.badgeText}>{STATUS_TR[t.status] ?? t.status}</Text>
              </View>
            </Pressable>
          ))}
          {/* Completed / Cancelled jobs */}
          {completedTasks.length > 0 && (
            <>
              {activeTasks.length > 0 && <View style={[local.sectionDivider, c && local.sectionDividerDark]} />}
              {completedTasks.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => onSelectTask(t.id)}
                  style={[local.taskRow, (currentTask?.id === t.id) && local.taskRowSelected]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[local.taskRowText, c && local.taskRowTextDark, { opacity: 0.65 }]} numberOfLines={1}>
                      {t.cargoNumber ?? t.tripNumber ?? t.id.slice(0, 8)}
                    </Text>
                    {t.routeText ? <Text style={[local.historyMeta, c && { color: "#94a3b8" }]} numberOfLines={1}>{t.routeText}</Text> : null}
                    {t.updatedAt ? <Text style={[local.historyMeta, c && { color: "#64748b" }]}>{new Date(t.updatedAt).toLocaleDateString("tr-TR")}</Text> : null}
                  </View>
                  <View style={[local.badge, t.status === "COMPLETED" ? local.badgeCompleted : local.badgeCancelled]}>
                    <Text style={[local.badgeText, t.status === "COMPLETED" ? { color: "#22c55e" } : { color: "#94a3b8" }]}>
                      {STATUS_TR[t.status] ?? t.status}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </>
          )}
        </View>
      )}

      {/* Active task info */}
      <View style={[styles.card, c && styles.cardDark]}>
        {/* Header row */}
        <View style={local.rowBetween}>
          <Text style={[styles.cardTitle, c && styles.cardTitleDark]}>
            {currentTask?.cargoNumber ?? currentTask?.tripNumber ?? "Aktif Is"}
          </Text>
          <View style={[local.badge, currentTask?.status === "IN_PROGRESS" ? local.badgeActive : local.badgePlanned]}>
            <Text style={local.badgeText}>{STATUS_TR[currentTask?.status ?? ""] ?? (currentTask?.status ?? "?")}</Text>
          </View>
        </View>

        {/* Job type section */}
        {currentTask?.jobType ? (
          <View style={local.jobTypeSection}>
            <View style={[local.jobTypePill,
              currentTask.jobType === "UNLOADING" ? local.jobTypeUnload :
              currentTask.jobType === "FULL"      ? local.jobTypeFull :
              local.jobTypeLoad]}>
              <Text style={local.jobTypePillText}>{JOB_TYPE_LABEL[currentTask.jobType] ?? currentTask.jobType}</Text>
            </View>
            <Text style={[local.flowText, c && { color: "#94a3b8" }]}>{JOB_TYPE_FLOW[currentTask.jobType] ?? ""}</Text>
          </View>
        ) : null}

        {/* Vehicle / route */}
        {currentTask?.vehicle?.plateNumber ? (
          <Text style={[styles.cardLine, c && styles.cardLineDark]}>🚛  {currentTask.vehicle.plateNumber}</Text>
        ) : null}
        {currentTask?.routeText ? (
          <Text style={[styles.cardLine, c && styles.cardLineDark]}>🗺  {currentTask.routeText}</Text>
        ) : null}

        {/* Address for current phase – use phase-specific location key */}
        {currentTask && officeLocation ? (
          <View style={local.addressSection}>
            <Pressable style={local.addressRow} onPress={() => openMaps(officeLocation)}>
              <View style={local.addressIconWrap}>
                <Text style={local.addressIcon}>📍</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={local.addressTypeLabel}>
                  {activePhase?.type === "LOAD" ? "Yukleme Konumu" :
                   activePhase?.type === "UNLOAD" ? "Bosaltma Konumu" :
                   activePhase?.type === "START_JOB" ? "Baslangic Konumu" :
                   activePhase?.type === "END_JOB" ? "Teslim Konumu" : "Konum"}
                </Text>
                <Text style={[local.addressText, c && { color: "#bae6fd" }]}>{officeLocation}</Text>
              </View>
              <Text style={local.navHint}>Aç →</Text>
            </Pressable>
          </View>
        ) : null}

        {!currentTask && assignedVehicle && assignedVehicle !== "-" && assignedVehicle !== "Atanmamis" ? (
          <Text style={[styles.cardLine, c && styles.cardLineDark]}>🚛  Atanan Arac: {assignedVehicle}</Text>
        ) : null}
        {!currentTask && <Text style={[styles.cardLine, c && styles.cardLineDark]}>Aktif is bulunamadi.</Text>}
      </View>




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
            <Pressable
              style={local.locationBox}
              onPress={() => openMaps(officeLocation)}
            >
              <Text style={local.locationLabel}>📍  Varis Konumu (Ofisten)  <Text style={{ fontSize: 11, color: "#0ea5e9" }}>Navigasyonda Aç →</Text></Text>
              <Text style={[local.locationText, c && { color: "#bae6fd" }]}>{officeLocation}</Text>
            </Pressable>
          ) : (
            <View style={[local.locationBox, { borderColor: "#94a3b820", backgroundColor: "transparent" }]}>
              <Text style={{ fontSize: 12, color: "#94a3b8" }}>📍  Konum henuz girilmedi</Text>
            </View>
          ))}

          {/* Main photo */}
          <PhotoPicker
            darkMode={c}
            label={getMainPhotoDisplay(displayPhase, currentTask?.jobType)}
            photoUri={displayPhotoUri}
            noteKey={MAIN_PHOTO_LABEL[displayPhase] ?? "genel"}
            note={photoNotes[MAIN_PHOTO_LABEL[displayPhase] ?? "genel"] ?? ""}
            onPickPhoto={isViewingDone ? undefined : () => onPickStepPhoto(displayPhase)}
            onNoteChange={(key, val) => setPhotoNotes((prev) => ({ ...prev, [key]: val }))}
            isViewOnly={isViewingDone}
          />

          {/* Extra photos */}
          {!isViewingDone && getExtraPhotos(displayPhase, currentTask?.jobType).map((cfg) => (
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
          {!isViewingDone && getDataFields(displayPhase, currentTask?.jobType).map((f) => (
            <View key={f.key} style={local.inputGroup}>
              <Text style={[local.fieldLabel, c && { color: "#94a3b8" }]}>{f.label}</Text>
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
                style={[local.submitBtn, submitting && local.submitBtnLoading]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={local.submitBtnText}>{activePhase?.label ?? ""} Kaydet</Text>
                )}
              </Pressable>


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

      {/* Documents – only when active job selected */}
      {currentTask && (currentTask.status === "PLANNED" || currentTask.status === "IN_PROGRESS") ? (
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
      ) : currentTask ? (
        <View style={[styles.card, c && styles.cardDark]}>
          <Text style={[styles.cardTitle, c && styles.cardTitleDark]}>Is Dokumanlari</Text>
          {currentTaskAttachments.length === 0 ? (
            <Text style={[styles.cardLine, c && styles.cardLineDark]}>Dokuman bulunmuyor.</Text>
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

    {/* Bottom phase bar */}
    {currentTask ? (
      <View style={[local.bottomBar, c && local.bottomBarDark]}>
        {phases.map((phase) => {
          const done = doneTypes.has(phase.type);
          const isActive = activePhase?.type === phase.type;
          const isViewing = viewingPhase === phase.type || (viewingPhase === null && isActive);
          const tappable = done || isActive;
          return (
            <Pressable
              key={phase.type}
              style={[local.bottomTab, isViewing && local.bottomTabActive]}
              onPress={() => tappable ? setViewingPhase(done ? phase.type : null) : undefined}
            >
              <View style={[local.bottomTabIconWrap, done && local.bottomTabIconDone, isViewing && !done && local.bottomTabIconActiveWrap]}>
                <Text style={local.bottomTabIcon}>{PHASE_ICONS[phase.type] ?? "●"}</Text>
                {done && <Text style={local.bottomTabDoneCheck}>✓</Text>}
              </View>
              <Text style={[
                local.bottomTabLabel,
                done ? local.bottomTabLabelDone : isViewing ? local.bottomTabLabelActive : local.bottomTabLabelWait,
              ]}>
                {phase.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    ) : null}
    </View>
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

  // Job type section
  jobTypeSection: { marginTop: 6, marginBottom: 8 },
  jobTypePill: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 4 },
  jobTypePillText: { fontSize: 12, fontWeight: "700" },
  jobTypeLoad: { backgroundColor: "#f9731615", color: "#f97316" },
  jobTypeUnload: { backgroundColor: "#3b82f615", color: "#3b82f6" },
  jobTypeFull: { backgroundColor: "#8b5cf615", color: "#8b5cf6" },
  flowText: { fontSize: 11, color: "#64748b", fontWeight: "500", letterSpacing: 0.2 },

  // Address section
  addressSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: "#e2e8f015", paddingTop: 10 },
  addressRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  addressIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", marginRight: 10 },
  addressIcon: { fontSize: 16 },
  addressTypeLabel: { fontSize: 10, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 1 },
  addressText: { fontSize: 13, fontWeight: "500", color: "#0f172a", flexShrink: 1 },
  navHint: { fontSize: 11, color: "#0ea5e9", fontWeight: "600", marginLeft: 8 },

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

  sectionDivider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 6 },
  sectionDividerDark: { backgroundColor: "#1e293b" },
  taskRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8, marginTop: 4 },
  taskRowSelected: { backgroundColor: "#0ea5e910", borderWidth: 1, borderColor: "#0ea5e935" },
  taskRowText: { fontSize: 13, fontWeight: "600", color: "#0f172a", flex: 1, marginRight: 8 },
  taskRowTextDark: { color: "#f1f5f9" },

  historyRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", gap: 8 },
  historyRowDark: { borderBottomColor: "#1e293b" },
  historyTitle: { fontSize: 13, fontWeight: "700", color: "#0f172a", marginBottom: 2 },
  historyMeta: { fontSize: 11, color: "#64748b", marginTop: 1 },
  badgeCompleted: { backgroundColor: "#22c55e15" },
  badgeCancelled: { backgroundColor: "#94a3b815" },

  bottomBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    paddingBottom: 28,
    paddingTop: 6,
  },
  bottomBarDark: { backgroundColor: "#0f172a", borderTopColor: "#1e293b" },
  bottomTab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  bottomTabActive: {},
  bottomTabIconWrap: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#f1f5f9",
    marginBottom: 3,
  },
  bottomTabIconActiveWrap: { backgroundColor: "#0ea5e915", borderWidth: 2, borderColor: "#0ea5e9" },
  bottomTabIconDone: { backgroundColor: "#22c55e15", borderWidth: 2, borderColor: "#22c55e" },
  bottomTabIcon: { fontSize: 22 },
  bottomTabDoneCheck: { position: "absolute", bottom: -2, right: -2, fontSize: 11, fontWeight: "800", color: "#22c55e", backgroundColor: "#fff", borderRadius: 6, paddingHorizontal: 1 },
  bottomTabLabel: { fontSize: 11, fontWeight: "600" },
  bottomTabLabelActive: { color: "#0ea5e9" },
  bottomTabLabelDone: { color: "#22c55e" },
  bottomTabLabelWait: { color: "#94a3b8" },
});
