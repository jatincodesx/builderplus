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
                ? "border-blue-200 bg-blue-50"
                : "border-gray-200 bg-white"
            )}
          >
            <div
              className={cn(
                "mb-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                complete
                  ? "bg-blue-500 text-white"
                  : active
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-400"
              )}
            >
              {complete ? <Check className="h-3.5 w-3.5" /> : stepNumber}
            </div>
            <div className={cn(
              "text-xs font-medium leading-tight",
              active ? "text-gray-900" : "text-gray-500"
            )}>
              {step}
            </div>
          </div>
        );
      })}
    </div>
  );
}
