"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";

interface DropzoneProps {
  onFileSelected: (file: File) => void;
  isLoading?: boolean;
}

export default function Dropzone({ onFileSelected, isLoading }: DropzoneProps) {
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError("");
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      if (!file.name.endsWith(".xlsx")) {
        setError("Apenas arquivos .xlsx são aceitos");
        return;
      }

      setFileName(file.name);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
    disabled: isLoading,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all ${
          isDragActive
            ? "border-emerald-500 bg-emerald-500/5"
            : fileName
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.02]"
        } ${isLoading ? "pointer-events-none opacity-50" : ""}`}
      >
        <input {...getInputProps()} />
        {fileName ? (
          <>
            <FileSpreadsheet className="h-12 w-12 text-emerald-400" />
            <p className="mt-4 text-sm font-medium text-emerald-400">
              {fileName}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Clique ou arraste para trocar o arquivo
            </p>
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 text-zinc-500" />
            <p className="mt-4 text-sm font-medium text-zinc-300">
              {isDragActive
                ? "Solte o arquivo aqui"
                : "Arraste o arquivo Excel ou clique para selecionar"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Apenas arquivos .xlsx
            </p>
          </>
        )}
      </div>
      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}
