import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { getSiteConfig, serializeSiteConfig } from "@/lib/site-config";
import type { SiteConfig } from "@/lib/site-config";

const GITHUB_API = "https://api.github.com";
const CONFIG_FILE = "content/site-config.md";

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req.headers.get("authorization"), process.env.ADMIN_PASSWORD)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const config = getSiteConfig();
  return NextResponse.json({ ok: true, config });
}

export async function PUT(req: NextRequest) {
  if (!checkAdminAuth(req.headers.get("authorization"), process.env.ADMIN_PASSWORD)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { config?: SiteConfig };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const { config } = body;
  if (!config || typeof config !== "object") {
    return NextResponse.json({ ok: false, error: "config is required" }, { status: 400 });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";

  if (!token || !repo) {
    return NextResponse.json({ ok: false, error: "github env vars not configured" }, { status: 500 });
  }

  const content = serializeSiteConfig(config);
  const encodedContent = Buffer.from(content, "utf8").toString("base64");
  const apiUrl = `${GITHUB_API}/repos/${repo}/contents/${CONFIG_FILE}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  let existingSha: string | undefined;
  const checkRes = await fetch(`${apiUrl}?ref=${branch}`, { headers: ghHeaders });
  if (checkRes.ok) {
    const existing = await checkRes.json() as { sha: string };
    existingSha = existing.sha;
  }

  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers: ghHeaders,
    body: JSON.stringify({
      message: "config: update site content and colors",
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

  const putData = await putRes.json() as { content: { sha: string } };
  return NextResponse.json({ ok: true, sha: putData.content.sha });
}
