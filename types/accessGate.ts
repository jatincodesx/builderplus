/**
 * Lightweight demo access gate types.
 *
 * This is NOT enterprise-grade authentication.
 * For high-stakes production access, replace with proper auth,
 * signed tokens, database-backed audit logging, and rate limiting.
 */

export interface AccessGateConfig {
  enabled: boolean;
  passwordLabel: string;
  clientName: string;
  termsVersion: string;
  sessionKey: string;
  projectName: string;
  identityFieldsRequired: boolean;
}

export interface AccessGateVerifyPayload {
  password: string;
}

export interface AccessGateVerifyResponse {
  ok: boolean;
  error?: string;
}

export interface AccessGateAgreementPayload {
  name: string;
  company: string;
  email: string;
  accepted: boolean;
  termsVersion: string;
  clientName: string;
  passwordLabel: string;
  timestamp: string;
}

export interface AccessGateAgreementResponse {
  ok: boolean;
  logged: boolean;
  storage?: "d1" | "console-fallback" | "d1-error";
  error?: string;
}

export interface AccessGateSessionState {
  verified: boolean;
  termsAccepted: boolean;
  termsVersion: string;
  timestamp: string;
}

export type AccessGateStep = "password" | "terms" | "unlocked";

export type AccessAgreementPayload = {
  name?: string;
  company?: string;
  email?: string;
  accepted: boolean;
  termsVersion: string;
  clientName: string;
  passwordLabel: string;
};

export type AccessAgreementLog = AccessAgreementPayload & {
  ipAddress?: string;
  country?: string;
  userAgent?: string;
  createdAt?: string;
};

export type AgreementLogStorage = "d1" | "console-fallback" | "d1-error";
