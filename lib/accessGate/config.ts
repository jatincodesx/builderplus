import type { AccessGateConfig } from "@/types/accessGate";

export function getAccessGateConfig(): AccessGateConfig {
  const enabled =
    (process.env.NEXT_PUBLIC_DEMO_ACCESS_ENABLED ?? "true") === "true";

  return {
    enabled,
    passwordLabel:
      process.env.NEXT_PUBLIC_DEMO_ACCESS_PASSWORD_LABEL ??
      "demo-001",
    clientName:
      process.env.NEXT_PUBLIC_DEMO_ACCESS_CLIENT_NAME ?? "Client",
    termsVersion:
      process.env.NEXT_PUBLIC_DEMO_ACCESS_TERMS_VERSION ??
      "2026-05-15-v1",
    sessionKey: "lumox_access_gate_builderplus",
    projectName: "BuilderPlus",
    identityFieldsRequired: true,
  };
}
