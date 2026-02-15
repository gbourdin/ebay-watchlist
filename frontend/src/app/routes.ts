export type AppRoutePath = "/" | "/favorites" | "/manage" | "/analytics";

export function normalizeRoutePath(pathname: string): AppRoutePath {
  const normalized = pathname.replace(/\/+$|^$/g, "") || "/";
  if (normalized === "/manage") {
    return "/manage";
  }
  if (normalized === "/analytics") {
    return "/analytics";
  }
  if (normalized === "/favorites") {
    return "/favorites";
  }
  return "/";
}

export function isItemsRoute(pathname: AppRoutePath): boolean {
  return pathname === "/" || pathname === "/favorites";
}
