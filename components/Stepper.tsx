import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = ["Find location", "Select block", "View designs"];

export function Stepper({
  activeStep,
  selected
}: {
  activeStep: 1 | 2 | 3;
  selected: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {steps.map((step, index) => {
        const stepNumber = (index + 1) as 1 | 2 | 3;
        const complete = selected ? stepNumber < 3 : stepNumber < activeStep;
        const active = stepNumber === activeStep;

        return (
          <div
            key={step}
            className={cn(
              "rounded-xl border px-3 py-3 transition",
              active
                ? "border-sky-300/40 bg-sky-400/15"
                : "border-white/10 bg-white/[0.04]"
            )}
          >
            <div
              className={cn(
                "mb-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                complete
                  ? "bg-sky-400 text-slate-950"
                  : active
                    ? "bg-white text-slate-950"
                    : "bg-white/10 text-slate-300"
              )}
            >
              {complete ? <Check className="h-3.5 w-3.5" /> : stepNumber}
            </div>
            <div className="text-xs font-medium leading-tight text-slate-200">
              {step}
            </div>
          </div>
        );
      })}
    </div>
  );
}
