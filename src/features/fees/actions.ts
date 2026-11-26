"use server";

import { revalidatePath } from "next/cache";
import { runAdminAction } from "@/lib/actions/run-admin-action";
import { ApiError, failure, unwrap, type ActionResult } from "@/lib/api/errors";
import { feeSettingsSchema, feeUpdateSchema, idSchema, overrideInputSchema, salonQuerySchema, type FeeSettings } from "./schemas";

const invalid = () => failure(new ApiError({ status: 422, code: "VALIDATION_ERROR" }));

/** Applies immediately; the API records old and new values. It takes no reason. */
export async function saveFees(changes: unknown, idempotencyKey?: string): Promise<ActionResult<FeeSettings>> {
  const parsed = feeUpdateSchema.safeParse(changes);
  if (!parsed.success) return invalid();
  const result = await runAdminAction({
    permission: "fees.change",
    idempotencyKey,
    name: "fees.update",
    call: async (api) => feeSettingsSchema.parse(await unwrap(api.PUT("/v1/admin/fees", { body: parsed.data }))),
  });
  if (result.ok) revalidatePath("/fees");
  return result;
}

export async function saveOverride(input: unknown, idempotencyKey?: string): Promise<ActionResult<{ salonId: string }>> {
  const parsed = overrideInputSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const { salonId, service, product } = parsed.data;
  const result = await runAdminAction({
    permission: "fees.change",
    idempotencyKey,
    name: "fees.override",
    call: async (api) => {
      await unwrap(
        api.POST("/v1/admin/fees/overrides", {
          body: { salon_id: salonId, service_commission_percent: service, product_commission_percent: product },
        }),
      );
      return { salonId };
    },
  });
  if (result.ok) revalidatePath("/fees");
  return result;
}

export async function removeOverride(id: string, idempotencyKey?: string): Promise<ActionResult<{ id: string }>> {
  if (!idSchema.safeParse(id).success) return invalid();
  const result = await runAdminAction({
    permission: "fees.change",
    idempotencyKey,
    name: "fees.override.delete",
    call: async (api) => {
      const { error, response } = await api.DELETE("/v1/admin/fees/overrides/{override_id}", {
        params: { path: { override_id: id } },
      });
      // 204 has no body, so check the status rather than `data`.
      if (!response.ok) await unwrap(Promise.resolve({ error, response }));
      return { id };
    },
  });
  if (result.ok) revalidatePath("/fees");
  return result;
}

export type SalonOption = { id: string; name: string; city: string | null };

/** Salon picker for "Add override". Needs `salons.read`. */
export async function searchSalons(q: string): Promise<ActionResult<SalonOption[]>> {
  const parsed = salonQuerySchema.safeParse(q);
  if (!parsed.success) return invalid();
  return runAdminAction({
    permission: "salons.view",
    name: "fees.salon_search",
    call: async (api) => {
      const out = await unwrap(api.GET("/v1/admin/salons", { params: { query: { q: parsed.data, limit: 8 } } }));
      return (out.items ?? []).map((s) => ({ id: s.id, name: s.name, city: s.city ?? null }));
    },
  });
}
