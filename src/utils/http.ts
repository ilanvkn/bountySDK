import { BountyError, PaymentRequiredError } from "../types";

export interface HttpOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
}

/**
 * Make an HTTP request with error handling
 */
export async function httpRequest<T>(
  url: string,
  options: HttpOptions = {}
): Promise<T> {
  const { method = "GET", headers = {}, body } = options;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  // Handle 402 Payment Required
  if (response.status === 402) {
    const data = await response.json();
    throw new PaymentRequiredError(
      "Payment required to access this resource",
      data
    );
  }

  // Handle other errors
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorDetails: unknown;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
      errorDetails = errorData;
    } catch {
      // Response is not JSON
    }

    throw new BountyError(errorMessage, response.status, errorDetails);
  }

  return response.json();
}

/**
 * Build URL with query parameters
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | undefined>
): string {
  const url = new URL(path, baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}
