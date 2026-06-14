import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";

const GITHUB_API = "https://api.github.com";

function ghHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

type Params = Promise<{ slug: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  if (!checkAdminAuth(req.headers.get("authorization"), process.env.ADMIN_PASSWORD)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";

  if (!repo || !process.env.GITHUB_TOKEN) {
    return NextResponse.json({ ok: false, error: "github env vars not configured" }, { status: 500 });
  }

  const filename = `${slug}.md`;
  const url = `${GITHUB_API}/repos/${repo}/contents/content/posts/${filename}?ref=${branch}`;
  const res = await fetch(url, { headers: ghHeaders() });

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: "post not found" }, { status: 404 });
  }

  const data = await res.json() as { content: string; sha: string };
  const raw = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");

  return NextResponse.json({ ok: true, content: raw, sha: data.sha, filename });
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  if (!checkAdminAuth(req.headers.get("authorization"), process.env.ADMIN_PASSWORD)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";

  if (!repo || !process.env.GITHUB_TOKEN) {
    return NextResponse.json({ ok: false, error: "github env vars not configured" }, { status: 500 });
  }

  const filename = `${slug}.md`;
  const apiUrl = `${GITHUB_API}/repos/${repo}/contents/content/posts/${filename}`;

  // Fetch current sha before deleting.
  const getRes = await fetch(`${apiUrl}?ref=${branch}`, { headers: ghHeaders() });
  if (!getRes.ok) {
    return NextResponse.json({ ok: false, error: "post not found" }, { status: 404 });
  }
  const { sha } = await getRes.json() as { sha: string };

  const delRes = await fetch(apiUrl, {
    method: "DELETE",
    headers: ghHeaders(),
    body: JSON.stringify({ message: `delete: ${filename}`, sha, branch }),
  });

  if (!delRes.ok) {
    const errText = await delRes.text();
    return NextResponse.json(
      { ok: false, error: `github api error: ${delRes.status} ${errText}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
