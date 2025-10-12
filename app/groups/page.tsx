import { getGroups } from "@/app/actions"
import { GroupsListClient } from "@/components/groups-list-client"

export default async function GroupsPage() {
  const groups = await getGroups()

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b bg-background p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Audio Annotation System</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organize your audio files into groups of up to 100 files each
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <GroupsListClient initialGroups={groups} />
      </div>
    </div>
  )
}
