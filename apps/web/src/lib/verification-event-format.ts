import type { Dictionary } from "./i18n-dictionary";

export type VerificationLookupType = "QR" | "ID" | "DOCUMENT";

export function formatLookupType(
  lookupType: VerificationLookupType | string | null | undefined,
  t: Dictionary,
) {
  switch (lookupType) {
    case "QR":
      return {
        shortLabel: t.auditComponents.lookupTypes.qrShort,
        actionLabel: t.auditComponents.lookupTypes.qrAction,
      };
    case "DOCUMENT":
      return {
        shortLabel: t.auditComponents.lookupTypes.documentShort,
        actionLabel: t.auditComponents.lookupTypes.documentAction,
      };
    case "ID":
    default:
      return {
        shortLabel: t.auditComponents.lookupTypes.idShort,
        actionLabel: t.auditComponents.lookupTypes.idAction,
      };
  }
}

export function formatVerificationAction(
  lookupType: VerificationLookupType | string | null | undefined,
  status: string,
  t: Dictionary,
) {
  if ((status === "NOT_FOUND" || status === "INVALID") && lookupType === "ID") {
    return t.auditComponents.lookupTypes.invalidIdAction;
  }

  return formatLookupType(lookupType, t).actionLabel;
}
