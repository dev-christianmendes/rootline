import { toast } from "sonner";

/**
 * Check if an error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
    return true;
  }

  if (error instanceof Error) {
    const networkErrors = [
      "NetworkError",
      "Failed to fetch",
      "Network request failed",
      "ERR_CONNECTION_REFUSED",
      "ERR_CONNECTION_RESET",
      "ERR_INTERNET_DISCONNECTED",
      "ERR_NETWORK_CHANGED",
      "ERR_TIMED_OUT",
      "ETIMEDOUT",
      "ECONNREFUSED",
      "ENOTFOUND",
    ];

    return networkErrors.some(
      (ne) =>
        error.message.includes(ne) ||
        (error.cause && String(error.cause).includes(ne)),
    );
  }

  return false;
}

/**
 * Handle API errors with appropriate user feedback
 */
export function handleApiError(error: unknown, context?: string): void {
  const prefix = context ? `${context}: ` : "";

  if (isNetworkError(error)) {
    toast.error(`${prefix}Network error`, {
      description:
        "Unable to connect to the server. Please check your internet connection.",
      action: {
        label: "Retry",
        onClick: () => window.location.reload(),
      },
      duration: Infinity,
    });
    return;
  }

  if (error instanceof Response) {
    // Handle HTTP error responses
    if (error.status === 401) {
      toast.error(`${prefix}Authentication required`, {
        description: "Please log in again.",
        action: {
          label: "Log in",
          onClick: () => (window.location.href = "/login"),
        },
      });
    } else if (error.status === 403) {
      toast.error(`${prefix}Access denied`, {
        description: "You don't have permission to perform this action.",
      });
    } else if (error.status === 404) {
      toast.error(`${prefix}Not found`, {
        description: "The requested resource was not found.",
      });
    } else if (error.status >= 500) {
      toast.error(`${prefix}Server error`, {
        description: "Something went wrong on our end. Please try again later.",
        action: {
          label: "Retry",
          onClick: () => window.location.reload(),
        },
      });
    } else {
      toast.error(`${prefix}Request failed`, {
        description: `HTTP ${error.status}: ${error.statusText}`,
      });
    }
    return;
  }

  if (error instanceof Error) {
    toast.error(`${prefix}${error.message}`, {
      description: error.stack,
    });
    return;
  }

  toast.error(`${prefix}Unknown error`, {
    description: String(error),
  });
}

/**
 * Wrapper for API calls with automatic error handling
 */
export async function withErrorHandling<T>(
  promise: Promise<T>,
  context?: string,
): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    handleApiError(error, context);
    return null;
  }
}

/**
 * Retry a failed operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 1000;

      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError!;
}
