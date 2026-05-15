"use client";

import { useState } from "react";
import { Loader2, Lock, User, Building2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccessGateFormProps {
  onVerify: (password: string, name: string, company: string, email: string) => Promise<void>;
  error: string | null;
  clientName: string;
}

export function AccessGateForm({
  onVerify,
  error,
  clientName,
}: AccessGateFormProps) {
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (!password.trim()) {
      setLocalError("Please enter the demo password.");
      return;
    }
    if (!name.trim()) {
      setLocalError("Please enter your name.");
      return;
    }
    if (!company.trim()) {
      setLocalError("Please enter your company.");
      return;
    }
    if (!email.trim()) {
      setLocalError("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      await onVerify(password, name.trim(), company.trim(), email.trim());
    } finally {
      setLoading(false);
      if (error) {
        setCooldown(true);
        setTimeout(() => setCooldown(false), 2000);
      }
    }
  }

  const displayError = localError ?? error;

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
        <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Demo Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`Enter ${clientName} demo password`}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm text-foreground placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoComplete="off"
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-400">
          Provided by Lumox Technologies for {clientName}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Name
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm text-foreground placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Company
          </label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm text-foreground placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm text-foreground placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {displayError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {displayError}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading || cooldown}
        className="mt-1 h-12 w-full text-base"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : cooldown ? (
          "Please wait before retrying..."
        ) : (
          "Unlock preview"
        )}
      </Button>
    </form>
  );
}
