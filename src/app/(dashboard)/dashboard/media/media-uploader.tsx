"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { attachMediaAsset } from "@/server/media";

/**
 * Demo uploader — generates a data URL preview locally and registers the asset.
 * For production: swap the upload step with UploadThing or S3 presigned URLs.
 * The metadata flow (DB row + AI alt/tags) is wired and works either way.
 */
export function MediaUploader() {
  const ref = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    start(async () => {
      const t = toast.loading(`Uploading ${files.length} files…`);
      try {
        for (const file of Array.from(files)) {
          const reader = await fileToDataUrl(file);
          await attachMediaAsset({
            url: reader,
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
          });
        }
        toast.success("Uploaded", { id: t });
        router.refresh();
      } catch (e: any) { toast.error(e.message ?? "Upload failed", { id: t }); }
    });
  }

  return (
    <>
      <input ref={ref} type="file" hidden multiple onChange={(e) => onFiles(e.target.files)} />
      <Button variant="gradient" onClick={() => ref.current?.click()} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Upload />} Upload
      </Button>
    </>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
