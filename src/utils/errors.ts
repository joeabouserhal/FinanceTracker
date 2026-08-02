/** Safely extract a message from anything thrown. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

/**
 * True for failures caused by the network itself (fetch rejects with a
 * TypeError when there is no connection). Server rejections (PostgrestError)
 * are NOT network errors and must not be re-routed to the offline queue.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  const message = getErrorMessage(error).toLowerCase();
  return /network request failed|failed to fetch|fetch failed|socket|timed? out|network error/i.test(
    message,
  );
}
