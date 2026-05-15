"use client";

import Image from "next/image";

interface AccessGateBrandingProps {
  projectName: string;
}

export function AccessGateBranding({ projectName }: AccessGateBrandingProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-16 w-16 overflow-hidden rounded-2xl shadow-glow">
        <Image
          src="/brand/lumox-icon-blue.png"
          alt="Lumox Technologies"
          fill
          className="object-contain"
          priority
        />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {projectName} Preview
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Private Lumox Technologies client demo
        </p>
      </div>
    </div>
  );
}
