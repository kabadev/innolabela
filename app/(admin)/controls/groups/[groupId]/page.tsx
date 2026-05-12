import { getGroup } from "@/app/actions";
import { getGlossary } from "@/app/actions/glossary";
import { GroupDetailClient } from "@/components/group-detail-client";
import { notFound } from "next/navigation";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const [group, glossary] = await Promise.all([
    getGroup(groupId),
    getGlossary()
  ]);

  if (!group) {
    notFound();
  }

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col">
      <div className="flex-1 overflow-hidden">
        <GroupDetailClient initialGroup={group} initialGlossary={glossary} />
      </div>
    </div>
  );
}
