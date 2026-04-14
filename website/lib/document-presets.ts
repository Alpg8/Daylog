export type AttachmentLike = {
  id: string;
  label?: string | null;
  key?: string | null;
  url?: string | null;
};

export type DocumentVariant = "success" | "warning" | "destructive";

type DocumentDefinition = {
  label: string;
  keywords: string[];
  dateField?: "passportExpiryDate" | "licenseExpiryDate" | "psychotechnicExpiryDate";
};

export type DocumentStatus = {
  label: string;
  attachment: AttachmentLike | null;
  statusLabel: string;
  variant: DocumentVariant;
  toneClassName: string;
  meta: string;
};

export const DRIVER_DOCUMENT_DEFINITIONS: DocumentDefinition[] = [
  { label: "Pasaport", keywords: ["pasaport", "passport"], dateField: "passportExpiryDate" },
  { label: "Ehliyet", keywords: ["ehliyet", "license", "licence", "surucu belgesi"], dateField: "licenseExpiryDate" },
  { label: "Psikoteknik", keywords: ["psikoteknik", "psychotechnic"], dateField: "psychotechnicExpiryDate" },
  { label: "SRC", keywords: ["src"] },
  { label: "Vize", keywords: ["vize", "visa"] },
];

export const VEHICLE_DOCUMENT_DEFINITIONS: DocumentDefinition[] = [
  { label: "Kasko", keywords: ["kasko", "casko"] },
  { label: "Muayene", keywords: ["muayene", "inspection"] },
  { label: "Roder", keywords: ["roder", "ro-ro", "roro"] },
  { label: "Trafik Sigortasi", keywords: ["trafik sigortasi", "traffic insurance", "zorunlu trafik"] },
  { label: "Tako", keywords: ["tako", "takograf", "tachograph"] },
  { label: "Egzoz", keywords: ["egzoz", "emisyon", "exhaust"] },
];

export const TRAILER_DOCUMENT_DEFINITIONS: DocumentDefinition[] = [
  { label: "Ruhsat", keywords: ["ruhsat", "license"] },
  { label: "Muayene", keywords: ["muayene", "inspection"] },
  { label: "Kasko", keywords: ["kasko", "casko"] },
  { label: "Trafik Sigortasi", keywords: ["trafik sigortasi", "traffic insurance", "zorunlu trafik"] },
  { label: "Roder", keywords: ["roder", "ro-ro", "roro"] },
  { label: "Foto", keywords: ["foto", "fotograf", "photo"] },
];

export const DRIVER_ATTACHMENT_LABEL_OPTIONS = DRIVER_DOCUMENT_DEFINITIONS.map((item) => item.label);
export const VEHICLE_ATTACHMENT_LABEL_OPTIONS = VEHICLE_DOCUMENT_DEFINITIONS.map((item) => item.label);
export const TRAILER_ATTACHMENT_LABEL_OPTIONS = TRAILER_DOCUMENT_DEFINITIONS.map((item) => item.label);

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

export function formatDocumentDate(value: Date | string | null | undefined) {
  if (!value) return "Tarih yok";

  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getRelativeDayLabel(value: Date | string | null | undefined) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffInDays = Math.ceil((target.getTime() - current.getTime()) / 86400000);

  if (diffInDays < 0) return `${Math.abs(diffInDays)} gun gecmis`;
  if (diffInDays === 0) return "Bugun son gun";
  return `${diffInDays} gun kaldi`;
}

export function findMatchingAttachment(attachments: AttachmentLike[], keywords: string[]) {
  return attachments.find((attachment) => {
    const haystack = normalizeText([attachment.label, attachment.key, attachment.url].filter(Boolean).join(" "));
    return keywords.some((keyword) => haystack.includes(normalizeText(keyword)));
  }) ?? null;
}

export function buildDocumentStatuses<T extends Record<string, unknown>>(
  definitions: DocumentDefinition[],
  attachments: AttachmentLike[],
  entity?: T | null,
): DocumentStatus[] {
  return definitions.map((definition) => {
    const attachment = findMatchingAttachment(attachments, definition.keywords);
    const expiryValue = definition.dateField && entity ? entity[definition.dateField] : null;
    const relativeLabel = getRelativeDayLabel(expiryValue as Date | string | null | undefined);

    if (expiryValue) {
      const expiryDate = expiryValue instanceof Date ? expiryValue : new Date(String(expiryValue));
      const distance = Math.ceil((expiryDate.getTime() - Date.now()) / 86400000);

      if (distance < 0) {
        return {
          label: definition.label,
          attachment,
          statusLabel: "Suresi doldu",
          variant: "destructive",
          toneClassName: "border-red-500/20 bg-red-500/5",
          meta: relativeLabel ?? formatDocumentDate(expiryDate),
        };
      }

      if (distance <= 30) {
        return {
          label: definition.label,
          attachment,
          statusLabel: attachment ? "Yenileme yaklasti" : "Dosya eksik",
          variant: "warning",
          toneClassName: "border-amber-500/20 bg-amber-500/5",
          meta: `${formatDocumentDate(expiryDate)}${relativeLabel ? ` · ${relativeLabel}` : ""}`,
        };
      }

      if (!attachment) {
        return {
          label: definition.label,
          attachment,
          statusLabel: "Dosya yok",
          variant: "warning",
          toneClassName: "border-amber-500/20 bg-amber-500/5",
          meta: `${formatDocumentDate(expiryDate)}${relativeLabel ? ` · ${relativeLabel}` : ""}`,
        };
      }

      return {
        label: definition.label,
        attachment,
        statusLabel: "Hazir",
        variant: "success",
        toneClassName: "border-emerald-500/20 bg-emerald-500/5",
        meta: `${formatDocumentDate(expiryDate)}${relativeLabel ? ` · ${relativeLabel}` : ""}`,
      };
    }

    if (attachment) {
      return {
        label: definition.label,
        attachment,
        statusLabel: "Dosya var",
        variant: "success",
        toneClassName: "border-emerald-500/20 bg-emerald-500/5",
        meta: attachment.label ?? "Etiket yok",
      };
    }

    return {
      label: definition.label,
      attachment,
      statusLabel: "Eksik",
      variant: "destructive",
      toneClassName: "border-red-500/20 bg-red-500/5",
      meta: "Dosya yuklenmemis",
    };
  });
}