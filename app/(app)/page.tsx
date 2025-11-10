import { getGroups } from "@/app/actions";
import { GroupsListClient } from "@/components/groups-list-client";
import { currentUser } from "@clerk/nextjs/server";

export default async function Home() {
  const user = await currentUser();
  const groups = await getGroups();

  return (
    <div className="h-screen flex flex-col ">
      <div className="text-center p-4">
        <h1 className="text-3xl font-bold">
          Welcome {user?.firstName} {user?.lastName}!
        </h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <GroupsListClient initialGroups={groups} />
      </div>
    </div>
  );
}
