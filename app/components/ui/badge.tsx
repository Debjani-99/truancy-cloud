import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        // Upload statuses
        pending: "border-yellow-200 bg-yellow-50 text-yellow-700",
        processing: "border-blue-200 bg-blue-50 text-blue-700",
        parsed: "border-green-200 bg-green-50 text-green-700",
        failed: "border-red-200 bg-red-50 text-red-700",
        review: "border-purple-200 bg-purple-50 text-purple-700",
        // Risk levels
        normal: "border-emerald-200 bg-emerald-50 text-emerald-700",
        watch: "border-yellow-200 bg-yellow-50 text-yellow-700",
        warning: "border-orange-200 bg-orange-50 text-orange-700",
        atrisk: "border-red-200 bg-red-50 text-red-700",
        // Neutral default
        default: "border-gray-200 bg-gray-100 text-gray-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

// Helpers to map status strings to Badge variants
export function uploadStatusVariant(
  status: string
): VariantProps<typeof badgeVariants>["variant"] {
  switch (status) {
    case "PENDING": return "pending";
    case "PROCESSING": return "processing";
    case "PARSED": return "parsed";
    case "FAILED": return "failed";
    case "REVIEW": return "review";
    default: return "default";
  }
}

export function riskVariant(
  label: string
): VariantProps<typeof badgeVariants>["variant"] {
  switch (label) {
    case "At Risk": return "atrisk";
    case "Court Warning": return "warning";
    case "At Watch": return "watch";
    case "Normal": return "normal";
    default: return "default";
  }
}
