// Client-side config helper
export function shouldShowErrors() {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DISABLE_USER_ERRORS === "true") {
    return false;
  }
  return true;
}

