import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAllPosts } from "@/lib/posts";

function verifyPassword(submitted: string, stored: string): boolean {
  const a = Buffer.from(submitted, "utf8");
  const b = Buffer.from(stored, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function getBearer(req: NextRequest): string {
  const h = req.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
}

export async function GET(req: NextRequest) {
  const stored = process.env.ADMIN_PASSWORD;
  if (!stored || !verifyPassword(getBearer(req), stored)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const posts = getAllPosts().map(
    ({ html: _h, content: _c, searchBlob: _s, ...p }) => p
  );

  return NextResponse.json({ ok: true, posts });
}
