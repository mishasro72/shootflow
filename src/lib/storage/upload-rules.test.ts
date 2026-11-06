import { describe, expect, it } from "vitest";

import { checkFile, MAX_UPLOAD_BYTES, signRequestSchema } from "./upload-rules";

describe("checkFile", () => {
  it("accepts images and PDF files up to the limit", () => {
    expect(checkFile({ size: 1024, type: "image/jpeg" })).toBeNull();
    expect(checkFile({ size: MAX_UPLOAD_BYTES, type: "image/tiff" })).toBeNull();
    expect(checkFile({ size: 10, type: "application/pdf" })).toBeNull();
  });

  it("says why a file is refused", () => {
    expect(checkFile({ size: 0, type: "image/png" })).toBe("empty");
    expect(checkFile({ size: MAX_UPLOAD_BYTES + 1, type: "image/png" })).toBe("tooLarge");
    expect(checkFile({ size: 10, type: "application/x-msdownload" })).toBe("type");
    // Browsers report "" for types they do not know (e.g. HEIC on Windows).
    expect(checkFile({ size: 10, type: "" })).toBe("type");
  });
});

describe("signRequestSchema", () => {
  const projectId = "6f1c2a7d-3b8e-4f6a-9c5d-7e9b1a3c5e7f";

  it("accepts a batch of files for one project", () => {
    const parsed = signRequestSchema.safeParse({
      projectId,
      files: [{ name: " look.jpg ", type: "image/jpeg", size: 2048 }],
    });
    expect(parsed.success && parsed.data.files[0]?.name).toBe("look.jpg");
  });

  it("rejects empty, oversized or too many files", () => {
    const file = { name: "a.jpg", type: "image/jpeg", size: 10 };
    expect(signRequestSchema.safeParse({ projectId, files: [] }).success).toBe(false);
    expect(signRequestSchema.safeParse({ projectId, files: [{ ...file, size: MAX_UPLOAD_BYTES + 1 }] }).success).toBe(
      false,
    );
    expect(signRequestSchema.safeParse({ projectId, files: Array(21).fill(file) }).success).toBe(false);
  });
});
