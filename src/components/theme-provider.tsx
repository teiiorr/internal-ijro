"use client";
import * as React from "react";

type Theme = "light" | "dark" | "system";
type Ctx = { theme: Theme; setTheme: (t: Theme) => void; resolved: "light" | "dark" };

const ThemeContext = React.createContext<Ctx | null>(null);

// Night = BIIB tungi, Day = yangi kunduzgi. Ikkalasi bir vaqtda ham `.dark` klassi
// (eski uslublar va `dark:` utilitalari), ham `data-theme` (BIIB tokenlari) orqali yoqiladi.
const THEME_COLOR = { dark: "#0a1026", light: "#f4f2ed" } as const;

function applyTheme(t: Theme) {
  const root = document.documentElement;
  const resolved = t === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : t;
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = THEME_COLOR[resolved];
  });
  return resolved;
}

export function ThemeProvider({ children, initial = "system" as Theme }: { children: React.ReactNode; initial?: Theme }) {
  const [theme, setThemeState] = React.useState<Theme>(initial);
  const [resolved, setResolved] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme | null) ?? initial;
    setThemeState(stored);
    setResolved(applyTheme(stored));
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => stored === "system" && setResolved(applyTheme("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [initial]);

  const setTheme = React.useCallback((t: Theme) => {
    localStorage.setItem("theme", t);
    setThemeState(t);
    setResolved(applyTheme(t));
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme, resolved }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme outside ThemeProvider");
  return ctx;
}
