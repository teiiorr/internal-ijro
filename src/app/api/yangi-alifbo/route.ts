import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { contentDisposition } from "@/lib/internal-docs/logic";
import { convertDocx, DocxError } from "@/lib/alphabet/docx";
import { toNewLatin } from "@/lib/alphabet/new-latin";

export const runtime = "nodejs";

const MAX_BYTES = 30 * 1024 * 1024;
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * "Yangi alifbo": Word (DOCX) faylni qabul qilib, uning aynan özini yangi lotin alifbosida
 * (ö, ğ, ş, ç) qaytaradi. Fayl serverda saqlanmaydi. Query: name=<asl fayl nomi>.
 * Natija sarlavhalarda: X-Alifbo-Changed (ögirilgan harflar), X-Alifbo-Source (cyrl|latn|mixed|none).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.position === "kontragent") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const name = (new URL(req.url).searchParams.get("name") ?? "hujjat.docx").replace(/[\r\n]+/g, " ").trim();
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 400 });

  const input = Buffer.from(await req.arrayBuffer());
  if (input.length === 0) return NextResponse.json({ error: "file_empty" }, { status: 400 });
  if (input.length > MAX_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 400 });

  let result;
  try {
    result = convertDocx(input);
  } catch (e) {
    const code = e instanceof DocxError ? e.message : "convert_failed";
    return NextResponse.json({ error: code }, { status: e instanceof DocxError ? 400 : 500 });
  }

  const { changed, cyrillic, latin } = result.stats;
  const source = cyrillic && latin ? "mixed" : cyrillic ? "cyrl" : latin ? "latn" : "none";
  const base = name.replace(/\.docx$/i, "");
  const converted = toNewLatin(base);
  const outName = `${converted === base ? `${base} (yangi alifbo)` : converted}.docx`;

  const headers = new Headers();
  headers.set("Content-Type", DOCX_MIME);
  headers.set("Content-Length", String(result.buffer.length));
  headers.set("Content-Disposition", contentDisposition("attachment", outName));
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Alifbo-Changed", String(changed));
  headers.set("X-Alifbo-Source", source);
  headers.set("X-Alifbo-Name", encodeURIComponent(outName));
  return new NextResponse(new Uint8Array(result.buffer), { headers });
}
