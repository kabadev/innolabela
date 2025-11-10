import { AudioFilesTable } from "../../components/audio-groups-table";

export default function Home() {
  // Replace with actual user ID from your auth system
  const userId = "user123";

  return (
    <main className="container mx-auto py-10">
      <AudioFilesTable />
    </main>
  );
}
