import "server-only";
import { cache } from "react";
import { getApiClient } from "@/lib/api/client";
import { errorFromResponse } from "@/lib/api/errors";
import { feeOverrideListSchema, feeSettingsSchema } from "./schemas";

export const OVERRIDE_LIMIT = 50; // API maximum; it returns no next cursor

export const getFeeSettings = cache(async () => {
  const api = await getApiClient();
  const { data, error, response } = await api.GET("/v1/admin/fees");
  if (!data) throw errorFromResponse(response, error, response.headers.get("x-request-id"));
  return feeSettingsSchema.parse(data);
});

export const getFeeOverrides = cache(async () => {
  const api = await getApiClient();
  const { data, error, response } = await api.GET("/v1/admin/fees/overrides", {
    params: { query: { limit: OVERRIDE_LIMIT } },
  });
  if (!data) throw errorFromResponse(response, error, response.headers.get("x-request-id"));
  return feeOverrideListSchema.parse(data).items;
});
