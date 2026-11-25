"use client";

import { LayoutGrid } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

import { BoardImageUploadError, uploadBoardImage, type BoardImageError } from "@/lib/board/upload-image";

import { createImageCard } from "./board/actions";

type State = "idle" | "working" | "done" | "invalid" | "badLink" | BoardImageError;

/**
 * "To board" next to an image in the Files folder. The file stays in Files; the board
 * gets its own copy, made the same way as a photo added on the board: the browser reads
 * the file through its signed link, makes the 2048 px and 400 px copies and uploads them.
 * While a live card made from this file is on the board, the button is a link to the board.
 */
export function ToBoardButton({
  projectId,
  fileId,
  url,
  name,
  onBoard,
}: {
  projectId: string;
  fileId: string;
  url: string;
  name: string;
  onBoard: boolean;
}) {
  const t = useTranslations("Files");
  const tBoard = useTranslations("Board");
  const [state, setState] = useState<State>("idle");

  async function copyToBoard() {
    setState("working");
    try {
      // Past the cache: the preview <img> fetched this URL without CORS, and R2's answer to
      // that request, kept in the cache, would be refused for a CORS fetch.
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new BoardImageUploadError("failed");
      const blob = await response.blob();
      const image = await uploadBoardImage(projectId, new File([blob], name, { type: blob.type }));
      const result = await createImageCard({ projectId, parentId: null, ...image, sourceFileId: fileId });
      setState(result.ok ? "done" : result.error);
    } catch (caught) {
      setState(caught instanceof BoardImageUploadError ? caught.reason : "failed");
    }
  }

  if (state === "done" || (onBoard && state === "idle")) {
    return (
      <Link
        href={`/dashboard/projects/${projectId}/board`}
        className="inline-flex items-center gap-1 text-success underline-offset-4 hover:underline"
        data-testid="on-board-link"
      >
        <LayoutGrid className="size-3.5" aria-hidden />
        {t("onBoard")}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={copyToBoard}
        disabled={state === "working"}
        aria-label={t("toBoardFile", { name })}
        className="inline-flex items-center gap-1 underline-offset-4 hover:underline disabled:opacity-60"
      >
        <LayoutGrid className="size-3.5" aria-hidden />
        {state === "working" ? t("toBoardWorking") : t("toBoard")}
      </button>
      {state !== "idle" && state !== "working" && (
        <span role="alert" className="text-xs text-destructive">
          {tBoard(`errors.${state}`)}
        </span>
      )}
    </>
  );
}
