"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";

interface IngestResponse {
  success?: boolean;
  error?: string;
  imported?: number;
  skipped?: number;
  count?: number;
  durationMs?: number;
}

export default function UploadPage() {
  const { language, t } = usePreferences();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadImportStatus() {
      try {
        const response = await fetch("/api/ingest", {
          signal: controller.signal,
        });
        const result = (await response.json()) as IngestResponse;

        if (!response.ok || typeof result.count !== "number") {
          throw new Error(result.error ?? t.statusUnavailable);
        }

        setImportedCount(result.count);
        setStatusError(null);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setStatusError(
          error instanceof Error
            ? error.message
            : t.statusUnavailable,
        );
      }
    }

    void loadImportStatus();
    return () => controller.abort();
  }, [t.statusUnavailable]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!file) {
      setMessage({ type: "error", text: t.selectCsv });
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);

    setIsUploading(true);

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as IngestResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? t.importFailed);
      }

      if (typeof result.count === "number") {
        setImportedCount(result.count);
      }
      setMessage({
        type: "success",
        text: `${result.imported ?? 0} ${
          result.imported === 1
            ? t.importedSuccessOne
            : t.importedSuccessMany
        }${result.skipped ? `; ${result.skipped} ${t.skipped}` : ""}.${
          typeof result.durationMs === "number"
            ? ` (${(result.durationMs / 1000).toFixed(1)}s)`
            : ""
        }`,
      });
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : t.uploadFailed,
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-[#f5f2ed] px-4 py-12 dark:bg-zinc-950">
      <section className="w-full max-w-lg rounded-2xl border border-[#e4e2db] bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            {t.uploadEyebrow}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t.uploadTitle}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {t.uploadDescription}
          </p>
        </div>

        <div
          aria-live="polite"
          className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 ${
            importedCount === null
              ? "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              : importedCount > 0
                ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
                : "border-slate-200 bg-slate-50 text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
          role={statusError ? "alert" : "status"}
        >
          {importedCount === null ? (
            <LoaderCircle className="mt-0.5 animate-spin" size={18} />
          ) : importedCount > 0 ? (
            <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
          ) : (
            <CircleAlert className="mt-0.5 shrink-0" size={18} />
          )}
          <div>
            <p className="text-sm font-semibold">
              {statusError
                ? t.statusUnavailable
                : importedCount === null
                  ? t.statusLoading
                  : importedCount > 0
                    ? `✓ ${t.activeBase}: ${importedCount} ${importedCount === 1 ? t.importedOne : t.importedMany} ${t.inAccount}`
                    : t.noImport}
            </p>
            {statusError && (
              <p className="mt-1 text-xs">{statusError}</p>
            )}
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
              htmlFor="file"
            >
              {t.csvLabel}
            </label>
            <input
              accept=".csv,text/csv"
              className="block w-full cursor-pointer rounded-lg border border-zinc-300 bg-white text-sm text-zinc-600 file:mr-4 file:border-0 file:bg-emerald-50 file:px-4 file:py-2.5 file:font-medium file:text-emerald-900 hover:file:bg-emerald-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:file:bg-zinc-800 dark:file:text-emerald-200 dark:hover:file:bg-zinc-700"
              id="file"
              name="file"
              ref={fileInputRef}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setMessage(null);
              }}
              required
              type="file"
            />
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              {t.csvHelp}
            </p>
          </div>

          <button
            className="flex w-full items-center justify-center rounded-lg bg-emerald-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isUploading}
            type="submit"
          >
            {isUploading
              ? t.importing
              : importedCount && importedCount > 0
                ? t.reimport
                : t.import}
          </button>

          {message && (
            <p
              aria-live="polite"
              className={`rounded-lg px-4 py-3 text-sm ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                  : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
              }`}
              role={message.type === "error" ? "alert" : "status"}
            >
              {message.text}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
