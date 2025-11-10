import { getGroups } from "@/app/actions";
import { getUsers } from "@/app/actions/user";
import { GroupsListClient } from "@/components/groups-list-client";

export default async function GroupsPage() {
  const groups = await getGroups();
  const users = await getUsers();
  return (
    <div className="h-screen flex flex-col ">
      <div className="flex-1 overflow-hidden">
        <GroupsListClient initialGroups={groups} users={users.users!} />
      </div>
    </div>
  );
}
