import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml",
  "text/plain", "text/html", "text/css", "text/javascript", "application/json",
  "application/pdf",
];

export interface UploadProgress {
  status: "idle" | "uploading" | "processing" | "done" | "error";
  progress: number;
  error?: string;
  fileId?: Id<"files">;
}

export function useFileUpload(projectId?: Id<"projects">) {
  const [uploads, setUploads] = useState<Record<string, UploadProgress>>({});

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createFile = useMutation(api.files.create);

  const upload = useCallback(
    async (file: File): Promise<Id<"files"> | null> => {
      const key = `${file.name}-${Date.now()}`;

      // Validate
      if (file.size > MAX_FILE_SIZE) {
        setUploads((prev) => ({
          ...prev,
          [key]: { status: "error", progress: 0, error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        }));
        return null;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploads((prev) => ({
          ...prev,
          [key]: { status: "error", progress: 0, error: `File type not allowed: ${file.type}` },
        }));
        return null;
      }

      setUploads((prev) => ({ ...prev, [key]: { status: "uploading", progress: 0 } }));

      try {
        // Step 1: Get signed upload URL from Convex
        const uploadUrl = await generateUploadUrl();

        // Step 2: Upload file directly to Convex Storage
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload failed: ${uploadRes.statusText}`);
        }

        const { storageId } = await uploadRes.json();

        setUploads((prev) => ({ ...prev, [key]: { status: "processing", progress: 80 } }));

        // Step 3: Record file metadata in the database
        const fileId = await createFile({
          projectId,
          storageId,
          name: file.name,
          type: file.type,
          size: file.size,
        });

        setUploads((prev) => ({ ...prev, [key]: { status: "done", progress: 100, fileId } }));

        // Clean up after a delay
        setTimeout(() => {
          setUploads((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }, 3000);

        return fileId;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setUploads((prev) => ({ ...prev, [key]: { status: "error", progress: 0, error: msg } }));
        return null;
      }
    },
    [generateUploadUrl, createFile, projectId]
  );

  const uploadMultiple = useCallback(
    async (files: File[]): Promise<(Id<"files"> | null)[]> => {
      return Promise.all(files.map((f) => upload(f)));
    },
    [upload]
  );

  return { upload, uploadMultiple, uploads };
}
