import { describe, it, expect } from "vitest";
import { verifyPassword, getBearer, checkAdminAuth } from "@/lib/auth";

describe("verifyPassword", () => {
  it("returns true when passwords match", () => {
    expect(verifyPassword("correct-horse", "correct-horse")).toBe(true);
  });

  it("returns false when passwords differ", () => {
    expect(verifyPassword("wrong", "correct-horse")).toBe(false);
  });

  it("returns false when submitted is empty", () => {
    expect(verifyPassword("", "correct-horse")).toBe(false);
  });

  it("returns false when stored is empty string", () => {
    expect(verifyPassword("anything", "")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(verifyPassword("Secret", "secret")).toBe(false);
  });

  it("does not accept prefix match", () => {
    expect(verifyPassword("correct-hors", "correct-horse")).toBe(false);
  });
});

describe("getBearer", () => {
  it("extracts the token from a Bearer header", () => {
    expect(getBearer("Bearer my-token")).toBe("my-token");
  });

  it("returns empty string for null header", () => {
    expect(getBearer(null)).toBe("");
  });

  it("returns empty string when scheme is not Bearer", () => {
    expect(getBearer("Basic abc123")).toBe("");
  });

  it("returns empty string for empty string header", () => {
    expect(getBearer("")).toBe("");
  });

  it("handles token with special characters", () => {
    expect(getBearer("Bearer ghp_abc/xyz=123")).toBe("ghp_abc/xyz=123");
  });
});

describe("checkAdminAuth", () => {
  it("grants access with correct bearer token", () => {
    expect(checkAdminAuth("Bearer secretpass", "secretpass")).toBe(true);
  });

  it("denies access with wrong token", () => {
    expect(checkAdminAuth("Bearer wrongpass", "secretpass")).toBe(false);
  });

  it("denies access when ADMIN_PASSWORD env var is not set", () => {
    expect(checkAdminAuth("Bearer anything", undefined)).toBe(false);
  });

  it("denies access when ADMIN_PASSWORD is empty string", () => {
    expect(checkAdminAuth("Bearer ", "")).toBe(false);
  });

  it("denies access when auth header is null", () => {
    expect(checkAdminAuth(null, "secretpass")).toBe(false);
  });

  it("denies access when auth header is missing Bearer prefix", () => {
    expect(checkAdminAuth("secretpass", "secretpass")).toBe(false);
  });
});
