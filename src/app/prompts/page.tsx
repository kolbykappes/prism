import { PromptLibrary } from "@/components/prompts/prompt-library";

export default function PromptsPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Prompt Library</h1>
      <p className="mb-6 text-muted-foreground">
        Manage prompt templates used to generate summaries. The default template
        is used when processing new files.
      </p>
      <PromptLibrary />
    </div>
  );
}
