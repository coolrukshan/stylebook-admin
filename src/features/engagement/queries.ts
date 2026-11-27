import "server-only";
import { cache } from "react";
import { getApiClient } from "@/lib/api/client";
import { errorFromResponse } from "@/lib/api/errors";
import { statsSchema } from "./schemas";

export const getEngagementStats = cache(async () => {
  const api = await getApiClient();
  const { data, error, response } = await api.GET("/v1/admin/engagement/stats", { params: { query: { period: "30d" } } });
  if (!data) throw errorFromResponse(response, error, response.headers.get("x-request-id"));
  return statsSchema.parse(data);
});
