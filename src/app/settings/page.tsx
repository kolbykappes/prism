import { prisma } from "@/lib/prisma";
import { CompanyLibrary } from "@/components/settings/company-library";

export const revalidate = 0;

export default async function SettingsPage() {
  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    include: {
      businessUnits: { orderBy: { name: "asc" } },
      _count: { select: { projects: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">Settings</h1>
      <p className="mb-8 text-muted-foreground">
        Manage reference data shared across projects.
      </p>

      <section>
        <h2 className="mb-1 text-xl font-semibold">Company Library</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Companies and business units can be linked to projects. Attach a markdown context document to make that information available in the knowledge base and compression step.
        </p>
        <CompanyLibrary initialCompanies={companies} />
      </section>
    </div>
  );
}
