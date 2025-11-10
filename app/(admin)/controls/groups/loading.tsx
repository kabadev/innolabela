import { Loader2 } from "lucide-react"

export default function GroupsLoading() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b bg-background p-4 shadow-sm">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded mt-2" />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading groups...</p>
        </div>
      </div>
    </div>
  )
}
