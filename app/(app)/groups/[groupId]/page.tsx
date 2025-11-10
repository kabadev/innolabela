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
    // <div className="h-screen flex flex-col bg-background">
    //   {/* <div className="border-b bg-background p-4 shadow-sm">
    //     <div className="flex items-center justify-between">
    //       <div>
    //         <h1 className="text-2xl font-bold">Audio Annotation System</h1>
    //         <p className="text-sm text-muted-foreground mt-1">
    //           {group.name} • {group.audioFiles.length} / 100 files
    //         </p>
    //       </div>
    //       <div className="flex items-center gap-2 text-sm text-muted-foreground">
    //         <a
    //           href="/groups"
    //           className="hover:text-foreground transition-colors"
    //         >
    //           Groups
    //         </a>
    //         <span>/</span>
    //         <span className="text-foreground font-medium">{group.name}</span>
    //       </div>
    //     </div>
    //   </div> */}
    //   <div className="flex-1 overflow-hidden">
    //     <GroupDetailClient initialGroup={group} />
    //   </div>
    // </div>
    <div className="h-[calc(100vh-65px)] flex flex-col">
      <div className="flex-1 overflow-hidden">
        <GroupDetailClient initialGroup={group} />
      </div>
    </div>
  );
}
