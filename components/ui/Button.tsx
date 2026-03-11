// components/ui/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "outline";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "h-14 w-full rounded-full px-10 text-sm font-semibold transition inline-flex items-center justify-center select-none";

  const styles =
    variant === "primary"
      ? "bg-[#111827] text-white hover:bg-[#1F2937] disabled:opacity-60"
      : "bg-white border border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white";

  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}
