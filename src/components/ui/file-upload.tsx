"use client";
import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { cn } from "@/lib/utils";

const mainVariant = {
  initial: { x: 0, y: 0 },
  animate: { x: 20, y: -20, opacity: 0.9 },
};
const secondaryVariant = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// Aceternity UI'in FileUpload'undan uyarlandi: @tabler/icons-react yerine
// zaten kullandigimiz lucide-react, hardcoded neutral/white/black renkleri
// yerine tema token'lari (border-border, bg-muted, text-foreground vb.) - ve
// modal icine sigmasi icin orijinalden daha kompakt (p-10 -> p-6, onizleme
// kutusu daha kucuk).
export const FileUpload = ({
  onChange,
  multiple = false,
}: {
  onChange?: (files: File[]) => void;
  multiple?: boolean;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    setFiles((prev) => (multiple ? [...prev, ...newFiles] : newFiles));
    onChange?.(newFiles);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple,
    noClick: true,
    onDrop: handleFileChange,
  });

  return (
    <div className="w-full" {...getRootProps()}>
      <motion.div
        onClick={handleClick}
        whileHover="animate"
        className="group/file relative block w-full cursor-pointer overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 p-6"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          onChange={(e) => handleFileChange(Array.from(e.target.files ?? []))}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center">
          <p className="relative z-20 text-sm font-semibold text-foreground">Dosya yükle</p>
          <p className="relative z-20 mt-1 text-xs text-muted-foreground">
            Dosyanı buraya sürükle bırak ya da tıkla
          </p>
          <div className="relative mx-auto mt-4 w-full max-w-xs">
            {files.length > 0 &&
              files.map((file, idx) => (
                <motion.div
                  key={file.name + idx}
                  layoutId={idx === 0 ? "file-upload" : undefined}
                  className={cn(
                    "relative z-40 mt-2 flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 shadow-sm"
                  )}
                >
                  <p className="truncate text-xs text-foreground">{file.name}</p>
                  <p className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {formatBytes(file.size)}
                  </p>
                </motion.div>
              ))}
            {!files.length && (
              <motion.div
                layoutId="file-upload"
                variants={mainVariant}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative z-40 mx-auto flex h-16 w-16 items-center justify-center rounded-md border border-border bg-background shadow-sm group-hover/file:shadow-md"
              >
                {isDragActive ? (
                  <motion.p className="text-xs text-foreground">Bırak</motion.p>
                ) : (
                  <Upload className="size-4 text-muted-foreground" />
                )}
              </motion.div>
            )}
            {!files.length && (
              <motion.div
                variants={secondaryVariant}
                className="absolute inset-0 z-30 mx-auto h-16 w-16 rounded-md border border-dashed border-primary/50 bg-transparent opacity-0"
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
