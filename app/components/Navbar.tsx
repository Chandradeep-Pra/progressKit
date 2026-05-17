import { Moon, Sun } from "lucide-react";

import { Button } from "./ui/button";

type NavbarProps = {
  onToggleTheme: () => void;
  theme: "dark" | "light";
};

export function Navbar({ onToggleTheme, theme }: NavbarProps) {
  const isDark = theme === "dark";

  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
      <div className="flex items-center gap-3">
        
        <span className="text-3xl font-semibold tracking-normal text-black">
          ProgressKit
        </span>
      </div>
      <nav className="hidden items-center gap-1 md:flex">
        {["Metrics", "Demo", "Docs"].map((item) => (
          <Button className="h-9 px-4" key={item} variant="ghost">
            {item}
          </Button>
        ))}
      </nav>
      <Button
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="h-10 w-10 px-0"
        onClick={onToggleTheme}
        title={isDark ? "Light mode" : "Dark mode"}
        variant="secondary"
      >
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
    </header>
  );
}
