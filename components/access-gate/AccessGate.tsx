"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { AccessGateBranding } from "./AccessGateBranding";
import { AccessGateForm } from "./AccessGateForm";
import { AccessTermsModal } from "./AccessTermsModal";
import { Badge } from "@/components/ui/badge";
import { getAccessGateConfig } from "@/lib/accessGate/config";
import type {
  AccessGateSessionState,
  AccessGateStep,
} from "@/types/accessGate";

/**
 * Lightweight demo access gate.
 *
 * This is NOT enterprise-grade authentication.
 * For high-stakes production access, replace with proper auth,
 * signed tokens, database-backed audit logging, and rate limiting.
 */

interface AccessGateProps {
  children: React.ReactNode;
}

interface IdentityData {
  name: string;
  company: string;
  email: string;
}

export function AccessGate({ children }: AccessGateProps) {
  const config = getAccessGateConfig();
  const [step, setStep] = useState<AccessGateStep>("password");
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<IdentityData>({
    name: "",
    company: "",
    email: "",
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !config.enabled) return;

    try {
      const raw = sessionStorage.getItem(config.sessionKey);
      if (raw) {
        const session = JSON.parse(raw) as AccessGateSessionState;
        if (session.verified && session.termsAccepted) {
          setStep("unlocked");
        } else if (session.verified) {
          setStep("terms");
        }
      }
    } catch {
      sessionStorage.removeItem(config.sessionKey);
    }
  }, [mounted, config.enabled, config.sessionKey]);

  const handleVerify = useCallback(
    async (password: string, name: string, company: string, email: string) => {
      setError(null);

      try {
        const response = await fetch("/api/access/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });

        const data = await response.json();

        if (!data.ok) {
          setError(data.error ?? "Invalid password.");
          return;
        }

        setIdentity({ name, company, email });

        const session: AccessGateSessionState = {
          verified: true,
          termsAccepted: false,
          termsVersion: config.termsVersion,
          timestamp: new Date().toISOString(),
        };
        sessionStorage.setItem(config.sessionKey, JSON.stringify(session));
        setStep("terms");
      } catch {
        setError("Verification failed. Please try again.");
      }
    },
    [config.sessionKey, config.termsVersion]
  );

  const handleAcceptTerms = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch("/api/access/agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: identity.name,
          company: identity.company,
          email: identity.email,
          accepted: true,
          termsVersion: config.termsVersion,
          clientName: config.clientName,
          passwordLabel: config.passwordLabel,
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        setError(data.error ?? "Agreement processing failed.");
        return;
      }

      const session: AccessGateSessionState = {
        verified: true,
        termsAccepted: true,
        termsVersion: config.termsVersion,
        timestamp: new Date().toISOString(),
      };
      sessionStorage.setItem(config.sessionKey, JSON.stringify(session));
      setStep("unlocked");
    } catch {
      setError("Agreement processing failed. Please try again.");
    }
  }, [
    identity,
    config.termsVersion,
    config.clientName,
    config.passwordLabel,
    config.sessionKey,
  ]);

  if (!config.enabled) {
    return <>{children}</>;
  }

  if (!mounted) {
    return null;
  }

  if (step === "unlocked") {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-background to-background" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="glass-panel rounded-2xl p-8">
          <div className="flex flex-col items-center gap-6">
            <AccessGateBranding projectName={config.projectName} />

            <Badge className="gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Confidential preview
            </Badge>

            <p className="text-center text-sm text-gray-500">
              This preview is property of Lumox Technologies and is provided for
              private evaluation only.
            </p>

            <div className="w-full border-t border-gray-100" />

            <AnimatePresence mode="wait">
              {step === "password" && (
                <motion.div
                  key="password"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <AccessGateForm
                    onVerify={handleVerify}
                    error={error}
                    clientName={config.clientName}
                  />
                </motion.div>
              )}

              {step === "terms" && (
                <motion.div
                  key="terms"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <AccessTermsModal
                    termsVersion={config.termsVersion}
                    onAccept={handleAcceptTerms}
                    error={error}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          &copy; Lumox Technologies. Confidential preview.
        </p>
      </motion.div>
    </div>
  );
}
