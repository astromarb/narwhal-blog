import { NextRequest, NextResponse } from "next/server";
import { getAllPosts } from "@/lib/posts";
import { checkAdminAuth, getBearer } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req.headers.get("authorization"), process.env.ADMIN_PASSWORD)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const posts = getAllPosts().map(
    ({ html: _h, content: _c, searchBlob: _s, ...p }) => p
  );

  return NextResponse.json({ ok: true, posts });
}
