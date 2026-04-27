import { ReactNode } from "react";

type StatusVariant = "info" | "success" | "error";

type StatusBannerProps = {
  variant: StatusVariant;
  title: string;
  message: ReactNode;
  action?: ReactNode;
};

const variantStyles: Record<StatusVariant, { wrapper: string; badge: string; title: string; accent: string }> = {
  error: {
    wrapper: "border-red-300/80 bg-gradient-to-r from-red-50 to-rose-50 text-red-900 shadow-[0_12px_30px_rgba(127,29,29,0.10)]",
    badge: "bg-red-500 text-white shadow-[0_8px_16px_rgba(220,38,38,0.25)]",
    title: "text-red-700",
    accent: "bg-red-500/15"
  },
  success: {
    wrapper: "border-emerald-300/80 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-950 shadow-[0_12px_30px_rgba(6,95,70,0.10)]",
    badge: "bg-emerald-500 text-white shadow-[0_8px_16px_rgba(16,185,129,0.25)]",
    title: "text-emerald-700",
    accent: "bg-emerald-500/15"
  },
  info: {
    wrapper: "border-brand-300/80 bg-gradient-to-r from-brand-50 to-violet-50 text-brand-950 shadow-[0_12px_30px_rgba(120,36,240,0.08)]",
    badge: "bg-brand-600 text-white shadow-[0_8px_16px_rgba(120,36,240,0.22)]",
    title: "text-brand-800",
    accent: "bg-brand-600/15"
  }
};

const variantIcons: Record<StatusVariant, ReactNode> = {
  error: (
    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M10 1.75a8.25 8.25 0 1 0 0 16.5 8.25 8.25 0 0 0 0-16.5Zm0 11.5a1.125 1.125 0 1 1 0 2.25 1.125 1.125 0 0 1 0-2.25Zm0-8a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5a.75.75 0 0 1 .75-.75Z" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M7.6 13.4 4.7 10.5a1 1 0 1 0-1.4 1.4l3.6 3.6a1 1 0 0 0 1.4 0l8-8a1 1 0 1 0-1.4-1.4l-7.3 7.3Z" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M10 1.75a8.25 8.25 0 1 0 0 16.5 8.25 8.25 0 0 0 0-16.5Zm0 4.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm-1 4.5a1 1 0 0 1 1-1h.25a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-2.25H10a1 1 0 0 1-1-1Z" />
    </svg>
  )
};

export function StatusBanner({ variant, title, message, action }: StatusBannerProps) {
  const styles = variantStyles[variant];

  return (
    <div className={`mt-4 rounded-3xl border px-4 py-4 ${styles.wrapper}`}>
      <div className="flex items-start gap-3">
        <div className={`relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${styles.badge}`}>
          <span className={`absolute inset-0 rounded-2xl ${styles.accent} animate-pulse`} />
          <span className="relative">{variantIcons[variant]}</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-black ${styles.title}`}>{title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-current/85">{message}</p>
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}