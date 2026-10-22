import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { validateSourcePath, validateGitUrl, isSafeZipEntryPath } from "@/lib/source-ingestion";
import path from "node:path";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user.authenticated) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";

  // 1. JSON Request: either local path or Git clone URL
  if (contentType.includes("application/json")) {
    try {
      const body = await req.json();
      const { type, path: inputPath, gitUrl } = body;

      if (type === "path") {
        const validation = validateSourcePath(inputPath);
        if (!validation.valid) {
          return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
        }

        return NextResponse.json({
          ok: true,
          type: "path",
          sourcePath: validation.resolvedPath,
          message: "پوشه پروژه با موفقیت تایید شد.",
        });
      }

      if (type === "git") {
        const validation = validateGitUrl(gitUrl);
        if (!validation.valid) {
          return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
        }

        const workspaceDir = path.resolve(process.cwd(), ".workspace", `git-${Date.now()}`);
        fs.mkdirSync(workspaceDir, { recursive: true });

        // Clone repository with argument array
        await execFileAsync("git", ["clone", "--depth", "1", gitUrl, workspaceDir]);

        return NextResponse.json({
          ok: true,
          type: "git",
          sourcePath: workspaceDir,
          message: "ریپازیتوری با موفقیت کلون شد.",
        });
      }

      return NextResponse.json({ ok: false, error: "نوع ورودی نامعتبر است." }, { status: 400 });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || "خطا در پردازش ورودی" }, { status: 500 });
    }
  }

  // 2. Multipart Form: ZIP file upload
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ ok: false, error: "فایل ZIP ارسال نشده است." }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const workspaceDir = path.resolve(process.cwd(), ".workspace", `zip-${Date.now()}`);
      fs.mkdirSync(workspaceDir, { recursive: true });

      // Save temporary zip file
      const tempZipPath = path.join(workspaceDir, "archive.zip");
      fs.writeFileSync(tempZipPath, buffer);

      // Unpack using system unzip with argument array
      await execFileAsync("unzip", ["-q", tempZipPath, "-d", workspaceDir]);
      fs.unlinkSync(tempZipPath);

      return NextResponse.json({
        ok: true,
        type: "zip",
        sourcePath: workspaceDir,
        message: "فایل ZIP با موفقیت استخراج شد.",
      });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || "خطا در استخراج فایل ZIP" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: false, error: "Content-Type نامعتبر است." }, { status: 400 });
}
