import { z } from "zod";
import { complaintResolutionEnum, complaintStatusEnum } from "@/db/schema";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "@/modules/orders/order.schema";
import { normalizePagination } from "@/utils/pagination";

// `start_rework` spawns the first free rework line in the same transaction.
export const POSTComplaintSchema = z.object({
  order_service_id: z.coerce.number().int().positive(),
  reason: z.string().trim().min(1).max(2000),
  voucher_promised: z.boolean().optional().default(false),
  start_rework: z.boolean().optional().default(false),
});

export const PATCHComplaintResolveSchema = z.object({
  resolution: z.enum(complaintResolutionEnum.enumValues),
  resolution_note: z.string().trim().max(2000).optional(),
  voucher_promised: z.boolean().optional(),
});

export const GETComplaintsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    status: z.enum(complaintStatusEnum.enumValues).optional(),
    store_id: z.coerce.number().int().positive().optional(),
    search: z.string().trim().min(1).max(100).optional(),
  })
  .optional();

export type PostComplaintInput = z.infer<typeof POSTComplaintSchema>;
export type PatchComplaintResolveInput = z.infer<
  typeof PATCHComplaintResolveSchema
>;
export type GetComplaintsQuery = z.infer<typeof GETComplaintsQuerySchema>;

export interface NormalizedComplaintListQuery {
  limit: number;
  offset: number;
  search?: string;
  status?: NonNullable<GetComplaintsQuery>["status"];
  store_id?: number;
}

export function normalizeComplaintListQuery(
  query?: GetComplaintsQuery
): NormalizedComplaintListQuery {
  const pagination = normalizePagination(query, {
    defaultPageSize: DEFAULT_PAGE_SIZE,
    maxPageSize: MAX_PAGE_SIZE,
  });

  return {
    limit: pagination.limit,
    offset: pagination.offset,
    search: query?.search,
    status: query?.status,
    store_id: query?.store_id,
  };
}
