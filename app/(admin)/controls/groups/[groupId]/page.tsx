import { getGroup } from "@/app/actions";
import { GroupDetailClient } from "@/components/group-detail-client";
import { notFound } from "next/navigation";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const group: any = await getGroup(groupId);
  // console.log(group);
  if (!group) {
    notFound();
  }

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col">
      <div className="flex-1 overflow-hidden">
        <GroupDetailClient initialGroup={group} />
      </div>
    </div>
  );
}
