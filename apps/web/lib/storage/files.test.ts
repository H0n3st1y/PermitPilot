import { describe, expect, it } from "vitest";
import { checkUpload, safeFileName, validateUpload } from "@/lib/storage/files";

const file = (bytes: number[], name: string, type: string) => new File([new Uint8Array(bytes)], name, { type });

describe("upload validation", () => {
  it("accepts files whose bytes match their type", async () => {
    expect(await checkUpload(file([0x25, 0x50, 0x44, 0x46, 0x2d], "a.pdf", "application/pdf"))).toBeNull();
    expect(await checkUpload(file([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "a.png", "image/png"))).toBeNull();
    expect(await checkUpload(file([0xff, 0xd8, 0xff, 0xe0], "a.jpg", "image/jpeg"))).toBeNull();
    const webp = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
    expect(await checkUpload(file(webp, "a.webp", "image/webp"))).toBeNull();
  });

  it("rejects disguised, empty, oversized, and unsupported files", async () => {
    expect(await checkUpload(file([0x4d, 0x5a, 0x90, 0x00], "invoice.pdf", "application/pdf"))).toMatch(/contents don't match/);
    expect(validateUpload(file([], "empty.pdf", "application/pdf"))).toMatch(/empty/);
    expect(validateUpload(file([1], "run.exe", "application/x-msdownload"))).toMatch(/PDF, PNG/);
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.pdf", { type: "application/pdf" });
    expect(validateUpload(big)).toMatch(/10 MB/);
  });

  it("sanitizes file names", () => {
    expect(safeFileName("my plan (v2)<script>.pdf")).toBe("my_plan__v2__script_.pdf");
    expect(safeFileName("")).toBe("document");
  });
});
