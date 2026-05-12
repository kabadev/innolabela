import { getGlossary } from "@/app/actions/glossary";
import { GlossaryClient } from "./glossary-client";

export const dynamic = "force-dynamic";

export default async function GlossaryPage() {
  const initialEntries = await getGlossary();

  return (
    <div className="container mx-auto">
      <GlossaryClient initialEntries={initialEntries} />
    </div>
  );
}
