import { useTheme } from "../../theme/useTheme";

function SunIcon() {
  return (
    <svg
      data-testid="theme-icon-sun"
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      data-testid="theme-icon-moon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.7 15.1A8.7 8.7 0 1 1 8.9 3.3a7 7 0 0 0 11.8 11.8Z" />
    </svg>
  );
}

export default function ThemeToggle() {
  const { effectiveTheme, toggleTheme } = useTheme();
  const isDark = effectiveTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-label="Toggle color theme"
      aria-checked={isDark}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-500 px-2.5 text-slate-100 transition hover:bg-slate-800 dark:border-slate-500 dark:text-slate-100 dark:hover:bg-slate-800"
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition ${
          isDark ? "bg-slate-100 text-slate-900" : "bg-amber-300 text-amber-900"
        }`}
      >
        {isDark ? <MoonIcon /> : <SunIcon />}
      </span>
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-300 dark:text-slate-300">
        {isDark ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );
}
