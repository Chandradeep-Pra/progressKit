import { Button } from "./ui/button";

export function Navbar() {
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
    </header>
  );
}
