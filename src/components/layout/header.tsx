import Link from "next/link";
import { Lightbulb } from "lucide-react";

export function Header() {
  return (
    <header className="border-b bg-primary text-primary-foreground">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Lightbulb className="mr-2 h-6 w-6" />
        <Link href="/" className="cursor-pointer text-xl font-bold">
          PRISM
        </Link>
        <span className="ml-2 text-sm text-primary-foreground/70">
          Project Resource Ingestion &amp; Summary Manager
        </span>
        <nav className="ml-auto flex items-center gap-4">
          <Link
            href="/prompts"
            className="text-sm text-primary-foreground/70 hover:text-primary-foreground"
          >
            Prompts
          </Link>
        </nav>
      </div>
    </header>
  );
}
