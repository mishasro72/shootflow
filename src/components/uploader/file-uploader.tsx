"use client";

import { CheckCircle2, CircleAlert, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState, type DragEvent } from "react";

import { runPool, PermanentError, withRetry } from "@/lib/storage/upload-queue";
import { checkFile, MAX_FILES_PER_SIGN, type SignedFile } from "@/lib/storage/upload-rules";
import { cn } from "@/lib/utils";

type ItemStatus = "waiting" | "uploading" | "done" | "error";
type ItemError = "empty" | "tooLarge" | "type" | "quota" | "failed";
type Item = { key: string; name: string; status: ItemStatus; progress: number; error?: ItemError };

/** Files sent at the same time. More does not make a phone connection faster. */
const PARALLEL_UPLOADS = 4;

/**
 * PUTs one file to its signed R2 URL and reports progress. XMLHttpRequest is used instead
 * of fetch because only it tells how many bytes have been sent so far.
 */
function putFile(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      // 4xx will not change on a retry (e.g. an expired or wrong signature); 5xx might.
      else if (xhr.status >= 400 && xhr.status < 500) reject(new PermanentError(`PUT ${xhr.status}`));
      else reject(new Error(`PUT ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = response.status >= 500 ? Error : PermanentError;
    throw new error(`${url} ${response.status}`);
  }
  return (await response.json()) as T;
}

/**
 * Drag-and-drop uploader for one project. For every drop: check the files here, ask the
 * server to sign them (in groups), send the bytes straight to R2 four at a time with
 * retries, confirm each one, then refresh the page so the new files show up.
 */
export function FileUploader({ projectId }: { projectId: string }) {
  const t = useTranslations("Uploader");
  const router = useRouter();
  const inputId = useId();
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const update = (key: string, patch: Partial<Item>) =>
    setItems((list) => list.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  async function upload(files: File[]) {
    if (files.length === 0) return;
    setBusy(true);

    const batch = files.map((file, index) => ({ file, key: `${Date.now()}-${index}-${file.name}` }));
    setItems((list) => [
      ...batch.map(({ file, key }) => {
        const problem = checkFile(file);
        return problem
          ? { key, name: file.name, status: "error" as const, progress: 0, error: problem }
          : { key, name: file.name, status: "waiting" as const, progress: 0 };
      }),
      ...list,
    ]);

    const accepted = batch.filter(({ file }) => checkFile(file) === null);
    const tasks: { key: string; file: File; id: string; url: string }[] = [];

    // 1. Signing, MAX_FILES_PER_SIGN files per request.
    for (let start = 0; start < accepted.length; start += MAX_FILES_PER_SIGN) {
      const group = accepted.slice(start, start + MAX_FILES_PER_SIGN);
      try {
        const { files: signed } = await postJson<{ files: SignedFile[] }>("/api/uploads/sign", {
          projectId,
          files: group.map(({ file }) => ({ name: file.name, type: file.type, size: file.size })),
        });
        group.forEach(({ key, file }, index) => {
          const result = signed[index];
          if (result && "url" in result) tasks.push({ key, file, ...result });
          else update(key, { status: "error", error: result?.error ?? "failed" });
        });
      } catch {
        for (const { key } of group) update(key, { status: "error", error: "failed" });
      }
    }

    // 2. Upload and confirm, a few at a time.
    await runPool(
      tasks,
      async ({ key, file, id, url }) => {
        update(key, { status: "uploading" });
        try {
          await withRetry(() => putFile(url, file, (progress) => update(key, { progress })));
          await withRetry(() => postJson("/api/uploads/complete", { id }));
          update(key, { status: "done", progress: 100 });
        } catch {
          update(key, { status: "error", error: "failed" });
        }
      },
      PARALLEL_UPLOADS,
    );

    setBusy(false);
    router.refresh();
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (!busy) void upload(Array.from(event.dataTransfer.files));
  }

  return (
    <div className="flex flex-col gap-3">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center text-sm transition-colors",
          "hover:border-ring focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          dragging && "border-ring bg-accent",
          busy && "pointer-events-none opacity-60",
        )}
      >
        <Upload className="size-6 text-muted-foreground" aria-hidden />
        <span className="font-medium">{t("drop")}</span>
        <span className="text-muted-foreground">{t("hint")}</span>
        <input
          id={inputId}
          type="file"
          multiple
          accept="image/*,application/pdf"
          disabled={busy}
          className="sr-only"
          data-testid="file-input"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = ""; // the same file can be chosen again later
            void upload(files);
          }}
        />
      </label>

      {items.length > 0 && (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {items.map((item) => (
            <li key={item.key} data-testid="upload-item" className="flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-2">
                {item.status === "done" && <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />}
                {item.status === "error" && <CircleAlert className="size-4 shrink-0 text-destructive" aria-hidden />}
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span
                  className={cn(
                    "shrink-0 text-xs",
                    item.status === "error" ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {item.status === "error" && item.error ? t(`errors.${item.error}`) : t(`status.${item.status}`)}
                </span>
              </div>
              {item.status === "uploading" && (
                <progress
                  value={item.progress}
                  max={100}
                  aria-label={item.name}
                  className="h-1.5 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
