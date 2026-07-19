import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSession } from "@/lib/session";
import { newId } from "@/lib/id";
import { MAX_PHOTO_BYTES, MAX_PHOTO_MB } from "@/lib/upload-limits";
import { sniffImage } from "@/lib/image-sniff";

export const runtime = "nodejs";

const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user_role !== "Volunteer") {
    return NextResponse.json(
      { error: "Only volunteers can upload photo evidence." },
      { status: 403 }
    );
  }
  if (session.status !== "approved") {
    return NextResponse.json(
      { error: "Account must be approved before uploading." },
      { status: 403 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (!ALLOWED.has(file.type) && !file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image files are allowed (JPEG, PNG, WebP, GIF)." },
      { status: 400 }
    );
  }

  if (file.size <= 0 || file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json(
      {
        error: `Image must be under ${MAX_PHOTO_MB} MB (phone photos are fine — no resize needed).`,
      },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Magic-byte sniff (do not trust client MIME alone)
  const kind = sniffImage(buffer);
  if (!kind) {
    return NextResponse.json(
      { error: "File content is not a recognized image (JPEG/PNG/WebP/GIF)." },
      { status: 400 }
    );
  }

  const safeStadium = session.stadium_id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileId = newId("img");
  const filename = `${fileId}${kind.ext}`;
  const relDir = path.join("uploads", safeStadium);
  const absDir = path.join(process.cwd(), "public", relDir);
  await fs.mkdir(absDir, { recursive: true });

  await fs.writeFile(path.join(absDir, filename), buffer);

  const url = `/${relDir.replace(/\\/g, "/")}/${filename}`;

  return NextResponse.json({
    attachment: {
      id: fileId,
      url,
      name: file.name || filename,
      mime: kind.mime,
      size: file.size,
    },
  });
}
