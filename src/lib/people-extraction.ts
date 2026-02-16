import { prisma } from "@/lib/prisma";

export async function upsertPersonInProject(params: {
  projectId: string;
  name: string;
  email?: string;
  organization?: string;
  role?: string;
  autoExtracted?: boolean;
}): Promise<void> {
  const { projectId, name, email, organization, role, autoExtracted = false } = params;

  const trimmedName = name.trim();
  if (!trimmedName) return;

  // Try to find existing person by email first, then by name within project
  let person = email
    ? await prisma.person.findFirst({ where: { email } })
    : null;

  if (!person) {
    // Check if a person with this exact name is already linked to this project
    const existingLink = await prisma.projectPerson.findFirst({
      where: {
        projectId,
        person: { name: { equals: trimmedName, mode: "insensitive" } },
      },
      include: { person: true },
    });

    if (existingLink) {
      person = existingLink.person;
      // Update email/org if we now have them and didn't before
      if ((email && !person.email) || (organization && !person.organization)) {
        await prisma.person.update({
          where: { id: person.id },
          data: {
            ...(email && !person.email ? { email } : {}),
            ...(organization && !person.organization ? { organization } : {}),
          },
        });
      }
      return; // Already linked
    }
  }

  if (!person) {
    person = await prisma.person.create({
      data: { name: trimmedName, email, organization, role },
    });
  }

  // Link to project (upsert to handle race conditions)
  await prisma.projectPerson.upsert({
    where: {
      projectId_personId: { projectId, personId: person.id },
    },
    create: {
      projectId,
      personId: person.id,
      role,
      autoExtracted,
    },
    update: {},
  });
}

/** Parse "Display Name <email@example.com>" or plain email strings */
export function parseEmailAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^["']|["']$/g, ""), email: match[2].trim() };
  }
  // Plain email
  const emailOnly = raw.trim();
  const namePart = emailOnly.split("@")[0].replace(/[._-]/g, " ");
  return { name: namePart, email: emailOnly };
}

/** Extract speaker name from transcript lines like "Speaker Name:" or "SPEAKER_00:" */
export function parseSpeakerLabel(line: string): string | null {
  const match = line.match(/^([A-Za-z][A-Za-z0-9_ ]+?):\s/);
  if (!match) return null;
  const label = match[1].trim();
  // Skip generic labels like SPEAKER_00
  if (/^SPEAKER_\d+$/i.test(label)) return null;
  return label;
}
