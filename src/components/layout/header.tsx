import Link from "next/link";

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="cursor-pointer text-xl font-bold">
          PRISM
        </Link>
        <span className="ml-2 text-sm text-muted-foreground">
          Project Resource Ingestion &amp; Summary Manager
        </span>
        <nav className="ml-auto flex items-center gap-4">
          <Link
            href="/prompts"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Prompts
          </Link>
        </nav>
      </div>
    </header>
  );
}
