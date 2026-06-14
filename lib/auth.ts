import { timingSafeEqual } from "crypto";

export function verifyPassword(submitted: string, stored: string): boolean {
  const a = Buffer.from(submitted, "utf8");
  const b = Buffer.from(stored, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function getBearer(authHeader: string | null): string {
  if (!authHeader) return "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

export function checkAdminAuth(
  authHeader: string | null,
  storedPassword: string | undefined
): boolean {
  if (!storedPassword) return false;
  return verifyPassword(getBearer(authHeader), storedPassword);
}
