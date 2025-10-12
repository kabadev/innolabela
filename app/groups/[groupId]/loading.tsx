import { Loader2 } from "lucide-react"

export default function GroupLoading() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b bg-background p-4 shadow-sm">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded mt-2" />
      </div>
      <div className="flex-1 flex">
        <div className="w-80 border-r bg-muted/30 p-4">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading group...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
