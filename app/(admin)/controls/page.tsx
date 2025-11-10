import { getDashboardStats } from "@/app/actions/dashboard";
import { DashboardOverview } from "../components/dashboard-overview";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <main className="container px-2 md:px-4 py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">
          Analytics Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor your audio transcription progress and performance
        </p>
      </div>
      <DashboardOverview stats={stats} />
    </main>
  );
}
