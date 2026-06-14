import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";

const GITHUB_API = "https://api.github.com";

function safeFilename(filename: string): boolean {
  return /^[\w.-]+\.md$/i.test(filename) && !filename.includes("..");
}

export async function POST(req: NextRequest) {
  const stored = process.env.ADMIN_PASSWORD;
  if (!stored) {
    return NextResponse.json({ ok: false, error: "server misconfigured" }, { status: 500 });
  }

  if (!checkAdminAuth(req.headers.get("authorization"), stored)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { filename?: string; content?: string; commitMessage?: string; sha?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const { filename, content, commitMessage, sha: providedSha } = body;

  if (!filename || !safeFilename(filename)) {
    return NextResponse.json(
      { ok: false, error: "filename must be a safe .md filename with no path separators" },
      { status: 400 }
    );
  }
  if (!content || typeof content !== "string") {
    return NextResponse.json({ ok: false, error: "content is required" }, { status: 400 });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";

  if (!token || !repo) {
    return NextResponse.json(
      { ok: false, error: "github env vars not configured" },
      { status: 500 }
    );
  }

  const filePath = `content/posts/${filename}`;
  const apiBase = `${GITHUB_API}/repos/${repo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  let existingSha: string | undefined = providedSha;
  if (!existingSha) {
    const checkRes = await fetch(`${apiBase}?ref=${branch}`, { headers: ghHeaders });
    if (checkRes.ok) {
      const existing = await checkRes.json() as { sha: string };
      return NextResponse.json(
        { ok: false, error: "file already exists", sha: existing.sha },
        { status: 409 }
      );
    }
  }

  const encodedContent = Buffer.from(content, "utf8").toString("base64");

  const putRes = await fetch(apiBase, {
    method: "PUT",
    headers: ghHeaders,
    body: JSON.stringify({
      message: commitMessage ?? `publish: ${filename}`,
      content: encodedContent,
      branch,
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    return NextResponse.json(
      { ok: false, error: `github api error: ${putRes.status} ${errText}` },
      { status: 500 }
    );
  }

  const putData = await putRes.json() as { content: { html_url: string; sha: string } };

  return NextResponse.json({
    ok: true,
    url: putData.content.html_url,
    sha: putData.content.sha,
    branch,
  });
}
