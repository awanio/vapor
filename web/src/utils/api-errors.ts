export interface ApiErrorDetails {
  code?: string;
  message?: string;
  details?: string;
}

export interface ApiErrorBody {
  status?: string;
  error?: ApiErrorDetails | null;
}

export function isVirtualizationDisabled(
  status: number,
  body: ApiErrorBody | null | undefined,
): boolean {
  return (
    status === 503 &&
    !!body &&
    body.status === 'error' &&
    !!body.error &&
    body.error.code === 'VIRTUALIZATION_DISABLED'
  );
}

export class VirtualizationDisabledError extends Error {
  public readonly details?: string;
  public readonly status?: number;

  constructor(message: string, details?: string, status?: number) {
    super(message);
    this.name = 'VirtualizationDisabledError';
    this.details = details;
    this.status = status;
  }
}
