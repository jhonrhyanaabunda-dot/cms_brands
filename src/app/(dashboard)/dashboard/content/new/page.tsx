import { NewContentForm } from "./new-content-form";

export const metadata = { title: "New content" };

export default function NewContent() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New content</h1>
        <p className="text-sm text-muted-foreground">Start blank, or hop over to AI Studio to generate from a prompt.</p>
      </div>
      <NewContentForm />
    </div>
  );
}
