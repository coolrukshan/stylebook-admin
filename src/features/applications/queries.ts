import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getApiClient } from "@/lib/api/client";
import { ApiError, errorFromResponse } from "@/lib/api/errors";
import { applicationDetailSchema, applicationListSchema } from "./schemas";
import { ACTIONABLE_STATUS } from "./status";

/** One page (API max 50) of applications awaiting a decision. */
export const getApplicationQueue = cache(async (cursor?: string) => {
  const api = await getApiClient();
  const { data, error, response } = await api.GET("/v1/admin/applications", {
    params: { query: { status: ACTIONABLE_STATUS, limit: 50, cursor: cursor ?? null } },
  });
  if (!data) throw errorFromResponse(response, error, response.headers.get("x-request-id"));
  return applicationListSchema.parse(data);
});

export const getApplication = cache(async (id: string) => {
  const api = await getApiClient();
  const { data, error, response } = await api.GET("/v1/admin/applications/{application_id}", {
    params: { path: { application_id: id } },
  });
  if (!data) {
    const err = errorFromResponse(response, error, response.headers.get("x-request-id"));
    if (err.status === 404 || err.status === 422) notFound();
    throw err;
  }
  return applicationDetailSchema.parse(data);
});

export { ApiError };
