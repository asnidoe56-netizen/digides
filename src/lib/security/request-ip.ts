// Behind a reverse proxy, the client IP only ever arrives via a forwarded
// header — there is no other source in a Next.js Route Handler. Takes the
// first hop in x-forwarded-for since that's the original client.
export function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim();
  }
  return request.headers.get("x-real-ip");
}
