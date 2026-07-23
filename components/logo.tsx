import Link from "next/link";

type LogoProps = {
  href?: string | null;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  variant?: "dark" | "light";
  className?: string;
};

const SIZES = {
  sm: { mark: 28, text: "text-base" },
  md: { mark: 36, text: "text-lg" },
  lg: { mark: 56, text: "text-3xl" },
} as const;

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <rect width="64" height="64" rx="14" fill="#2F5D46" />
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="11"
        stroke="#9A6B3F"
        strokeWidth="1.5"
        opacity="0.85"
      />
      <path
        d="M18 44V20h12.2c5.4 0 8.9 2.9 8.9 7.4 0 3.3-1.7 5.7-4.6 6.8L40.8 44h-6.2l-5.6-9.2H24V44H18zm6-14.4h5.8c2.4 0 3.7-1.2 3.7-3.1 0-1.9-1.3-3-3.7-3H24v6.1z"
        fill="#F4F1EA"
      />
      <path
        d="M42.2 44c-5.8 0-9.6-3.8-9.6-9.5S36.4 25 42.2 25c3.4 0 6.1 1.3 7.8 3.5l-3.5 2.6c-1-1.3-2.4-2-4.2-2-3.1 0-5.1 2.1-5.1 5.4s2 5.4 5.1 5.4c1.9 0 3.3-.8 4.3-2.1l3.5 2.5c-1.7 2.3-4.5 3.7-7.5 3.7z"
        fill="#F4F1EA"
      />
    </svg>
  );
}

export function Logo({
  href = "/",
  size = "md",
  showWordmark = true,
  variant = "dark",
  className = "",
}: LogoProps) {
  const s = SIZES[size];
  const titleColor = variant === "light" ? "text-[#F4F1EA]" : "text-ink";
  const subtitleColor =
    variant === "light" ? "text-[#c5d4cb]" : "text-muted";

  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={s.mark} />
      {showWordmark ? (
        <span className="leading-none">
          <span
            className={`font-display block font-bold tracking-tight ${titleColor} ${s.text}`}
          >
            RC-Gestion
          </span>
          {size === "lg" ? (
            <span
              className={`mt-1.5 block font-sans text-sm font-medium tracking-wide ${subtitleColor}`}
            >
              Gestion restaurant
            </span>
          ) : null}
        </span>
      ) : (
        <span className="sr-only">RC-Gestion</span>
      )}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="group inline-flex outline-none">
      {content}
    </Link>
  );
}
