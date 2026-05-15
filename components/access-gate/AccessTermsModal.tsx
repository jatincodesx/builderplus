"use client";

import { useState } from "react";
import { Loader2, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTermsContent } from "@/lib/accessGate/terms";

interface AccessTermsModalProps {
  termsVersion: string;
  onAccept: () => Promise<void>;
  error: string | null;
}

export function AccessTermsModal({
  termsVersion,
  onAccept,
  error,
}: AccessTermsModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const termsText = getTermsContent();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (!agreed) {
      setLocalError("Please accept the terms to continue.");
      return;
    }

    setLoading(true);
    try {
      await onAccept();
    } finally {
      setLoading(false);
    }
  }

  const displayError = localError ?? error;

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-1.5">
        <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5">
          <FileText className="h-4 w-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Demo Access Terms
          </span>
          <span className="ml-auto text-xs text-gray-400">{termsVersion}</span>
        </div>
        <div className="max-h-64 overflow-y-auto p-4 subtle-scrollbar">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700">
            {termsText}
          </pre>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-primary/30 hover:bg-blue-50/30">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm text-gray-700">
          I have read and agree to the demo access terms.
        </span>
        {agreed && (
          <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-primary" />
        )}
      </label>

      {displayError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {displayError}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading || !agreed}
        className="mt-1 h-12 w-full text-base"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Agree and continue"
        )}
      </Button>
    </form>
  );
}
