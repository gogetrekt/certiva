import Link from "next/link";

interface AppLogoProps {
  href?: string;
}

export function AppLogo({ href = "/" }: AppLogoProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:ring-current rounded"
    >
      {/* Logotype mark */}
      <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[5px] bg-[hsl(var(--text-primary))]">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M7 1.5L11.5 4V7.5C11.5 10 9.5 12 7 12.5C4.5 12 2.5 10 2.5 7.5V4L7 1.5Z"
            stroke="hsl(var(--text-inverse))"
            strokeWidth="1.25"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M5 7L6.5 8.5L9.5 5.5"
            stroke="hsl(var(--text-inverse))"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Wordmark */}
      <div>
        <p className="text-[0.875rem] font-semibold tracking-[-0.03em] leading-none text-[hsl(var(--text-primary))]">
          Certiva
        </p>
      </div>
    </Link>
  );
}
