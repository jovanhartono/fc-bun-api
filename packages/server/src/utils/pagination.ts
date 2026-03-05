export interface PaginationOptions {
  defaultPage?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
}

export interface PaginationInput {
  page?: number;
  page_size?: number;
  limit?: number;
  offset?: number;
}

export interface NormalizedPagination {
  page: number;
  pageSize: number;
  offset: number;
}

export interface PaginationMeta extends NormalizedPagination {
  total: number;
  totalPages: number;
}

export function normalizePagination(
  input: PaginationInput | undefined,
  options: PaginationOptions = {}
): NormalizedPagination {
  const defaultPage = options.defaultPage ?? 1;
  const defaultPageSize = options.defaultPageSize ?? 25;
  const maxPageSize = options.maxPageSize ?? 100;

  const rawPageSize = input?.limit ?? input?.page_size ?? defaultPageSize;
  const pageSize = clampInt(rawPageSize, 1, maxPageSize, defaultPageSize);

  const hasOffset = input?.offset !== undefined;
  const offset = hasOffset
    ? clampInt(input.offset, 0, Number.MAX_SAFE_INTEGER, 0)
    : clampInt(
        ((input?.page ?? defaultPage) - 1) * pageSize,
        0,
        Number.MAX_SAFE_INTEGER,
        0
      );

  const page = Math.floor(offset / pageSize) + 1;

  return {
    page,
    pageSize,
    offset,
  };
}

export function buildPaginationMeta(
  total: number,
  pagination: NormalizedPagination
): PaginationMeta {
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    offset: pagination.offset,
    total,
    totalPages: Math.ceil(total / pagination.pageSize),
  };
}

function clampInt(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
) {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(value)));
}
