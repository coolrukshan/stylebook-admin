import { TopBar } from "@/components/sb/top-bar";
import { requirePermission } from "@/lib/auth/require-role";

// Placeholder for A-03; the real dashboard is built in spec 01.
export default async function DashboardPage() {
  await requirePermission("dashboard.view");
  return <TopBar title="Platform overview" subtitle="Dashboard coming in the next build step" />;
}
