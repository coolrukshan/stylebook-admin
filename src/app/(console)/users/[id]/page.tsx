import Link from "next/link";
import { TopBar } from "@/components/sb/top-bar";
import { UserDetail } from "@/features/users/components/user-detail";
import { getUser } from "@/features/users/queries";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-role";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePermission("users.view");
  const { id } = await params;
  const user = await getUser(id);
  return (
    <>
      <TopBar title="User" subtitle="Profile, activity and status" />
      <Link href="/users" className="mb-4 inline-block text-sm font-semibold text-amber underline-offset-4 hover:underline">
        All users
      </Link>
      <UserDetail user={user} canSuspend={hasPermission(me, "user.suspend")} />
    </>
  );
}
