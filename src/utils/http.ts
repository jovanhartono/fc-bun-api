interface Metadata {
  total?: number;
  page?: number;
  pageSize?: number;
  [key: string]: unknown;
}

interface SuccessResponse<T> {
  success: true;
  message?: string;
  data?: T;
  meta?: Metadata;
}

interface ErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
}

export function success<T>(data?: T, message?: string): SuccessResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}

export function failure(message: string, errors?: unknown): ErrorResponse {
  return {
    success: false,
    message,
    errors,
  };
}
