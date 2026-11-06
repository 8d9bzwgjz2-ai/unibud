import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/logo";
import { passwordStrength } from "@/lib/account/domain";

export function AccountFrame({
  kicker,
  title,
  body,
  step,
  steps,
  children,
}: {
  kicker: string;
  title: string;
  body?: string;
  step?: number;
  steps?: number;
  children?: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-background px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-16">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <Link to="/start" aria-label="UNIBUD" className="w-fit">
          <Wordmark size="sm" />
        </Link>
        {step && steps ? (
          <p className="mt-8 text-xs tracking-wide text-muted-foreground">
            {step} of {steps}
          </p>
        ) : null}
        <p className="kicker mt-6">{kicker}</p>
        <h1 className="mt-2 font-display text-4xl">{title}</h1>
        {body ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p> : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </main>
  );
}

export function AccountField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        value={value}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-12 w-full rounded-2xl bg-card px-4 text-base ring-1 ring-border outline-none focus:ring-ink"
      />
    </label>
  );
}

export function AccountButton({
  children,
  disabled,
  type = "button",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="h-12 w-full rounded-full bg-ink text-sm font-medium text-paper disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function AccountAlert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm font-medium text-ink">
      {children}
    </p>
  );
}

export function PasswordHint({ password }: { password: string }) {
  const strength = passwordStrength(password);
  const width = strength === "strong" ? "w-full" : strength === "okay" ? "w-2/3" : strength === "weak" ? "w-1/3" : "w-0";
  return (
    <div className="mt-2">
      <div className="h-1 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full bg-ink ${width}`} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        At least 10 characters, with a letter and a number.
        {strength === "strong" ? " Strong password." : strength === "okay" ? " Acceptable password." : ""}
      </p>
    </div>
  );
}
