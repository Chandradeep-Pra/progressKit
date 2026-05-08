import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-black bg-black text-white shadow-[0_16px_34px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 hover:bg-neutral-800",
  secondary:
    "border-neutral-200 bg-white/70 text-black shadow-[0_12px_30px_rgba(20,20,20,0.06)] hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-white",
  ghost: "border-transparent bg-transparent text-neutral-600 hover:bg-neutral-100",
};

export function Button({
  children,
  className = "",
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border px-5 text-sm font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
