import Link from "next/link";
import { TopBar } from "@/components/sb/top-bar";
import { DisputeDetail } from "@/features/disputes/components/dispute-detail";
import { getDispute, getParties } from "@/features/disputes/queries";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-role";

export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePermission("dispute.decide");
  const { id } = await params;
  const dispute = await getDispute(id);
  const parties = await getParties([dispute.user_id], [dispute.salon_id]);
  return (
    <>
      <TopBar title="Dispute" subtitle="Messages, evidence and decision" />
      <Link href="/disputes" className="mb-4 inline-block text-sm font-semibold text-amber underline-offset-4 hover:underline">
        All disputes
      </Link>
      <DisputeDetail
        dispute={dispute}
        client={parties.clients.get(dispute.user_id) ?? "Unknown"}
        salon={parties.salons.get(dispute.salon_id) ?? "Unknown salon"}
        canDecide={hasPermission(me, "dispute.decide")}
        now={new Date()}
      />
    </>
  );
}
