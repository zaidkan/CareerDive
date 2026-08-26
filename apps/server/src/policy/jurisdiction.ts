export type JurisdictionPolicy = {
  minimumUserAge: number;
  adultAge: number;
  guardianConsentUnderAdultAge: boolean;
  institutionalUseAllowed: boolean;
};

export const DEFAULT_JURISDICTION_POLICIES: Record<string, JurisdictionPolicy> =
  {
    "US-NY": {
      minimumUserAge: 13,
      adultAge: 18,
      guardianConsentUnderAdultAge: true,
      institutionalUseAllowed: false,
    },
    "US-DEFAULT": {
      minimumUserAge: 13,
      adultAge: 18,
      guardianConsentUnderAdultAge: true,
      institutionalUseAllowed: false,
    },
  };

export function resolveConsentRequirement(
  policies: Record<string, JurisdictionPolicy>,
  jurisdiction: string,
  age: number,
): {
  ageTier: "teen" | "adult";
  guardianConsentRequired: boolean;
  institutionalUseAllowed: boolean;
} {
  const policy = policies[jurisdiction] ?? policies["US-DEFAULT"];
  if (!policy) {
    throw new Error("No jurisdiction policy is configured");
  }
  if (age < policy.minimumUserAge) {
    throw new Error("User is below the configured minimum age");
  }
  const ageTier = age < policy.adultAge ? "teen" : "adult";
  return {
    ageTier,
    guardianConsentRequired:
      ageTier === "teen" && policy.guardianConsentUnderAdultAge,
    institutionalUseAllowed: policy.institutionalUseAllowed,
  };
}
