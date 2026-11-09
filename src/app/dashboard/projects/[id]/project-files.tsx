import { Download, FileText, Paperclip, Trash2 } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { ConfirmButton } from "@/components/confirm-button";
import { FileUploader } from "@/components/uploader/file-uploader";
import { formatBytes } from "@/lib/format/bytes";
import { uploadsEnabled } from "@/lib/storage/availability";
import { signDownload } from "@/lib/storage/r2";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { deleteProjectFile } from "../file-actions";

/**
 * The project's files: an uploader and the list of finished uploads. Links are signed
 * here, on every page view, and work for 30 minutes; the database stores only keys.
 */
export async function ProjectFiles({ projectId }: { projectId: string }) {
  const [t, locale] = await Promise.all([getTranslations("Files"), getLocale()]);
  const enabled = uploadsEnabled();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("media_files")
    .select("id, object_key, file_name, content_type, size_bytes")
    .eq("project_id", projectId)
    .eq("status", "READY")
    .order("created_at", { ascending: false });

  const files = enabled
    ? await Promise.all(
        (data ?? []).map(async (file) => ({
          ...file,
          isImage: file.content_type.startsWith("image/"),
          previewUrl: file.content_type.startsWith("image/") ? await signDownload(file.object_key) : null,
          downloadUrl: await signDownload(file.object_key, file.file_name),
        })),
      )
    : [];

  return (
    <section className="rounded-xl border bg-card p-4 text-sm" data-testid="project-files">
      <h2 className="mb-1 flex items-center gap-2 font-medium text-muted-foreground">
        <Paperclip className="size-4" aria-hidden />
        {t("title")}
      </h2>
      <p className="mb-3 text-muted-foreground">{t("lead")}</p>

      {enabled ? (
        <div className="flex flex-col gap-4">
          <FileUploader projectId={projectId} />
          {files.length === 0 ? (
            <p className="text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {files.map((file) => (
                <li key={file.id} data-testid="file-row" className="flex items-center gap-3 rounded-lg border p-2">
                  {file.previewUrl ? (
                    // A signed, expiring URL: next/image would cache it longer than it lives.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.previewUrl} alt="" className="size-14 shrink-0 rounded-md object-cover" />
                  ) : (
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted">
                      <FileText className="size-6 text-muted-foreground" aria-hidden />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size_bytes, locale)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <a
                        href={file.downloadUrl}
                        aria-label={t("downloadFile", { name: file.file_name })}
                        className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                      >
                        <Download className="size-3.5" aria-hidden />
                        {t("download")}
                      </a>
                      <ConfirmButton
                        action={deleteProjectFile.bind(null, file.id)}
                        label={t("delete")}
                        question={t("deleteConfirm")}
                        yes={t("deleteYes")}
                        no={t("deleteNo")}
                        icon={<Trash2 aria-hidden />}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("disabled")}</p>
      )}
    </section>
  );
}
