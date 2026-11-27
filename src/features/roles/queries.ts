import "server-only";
import { cache } from "react";
import { getApiClient } from "@/lib/api/client";
import { listAllAdmins } from "./list";

export const getAdmins = cache(async () => listAllAdmins(await getApiClient()));
