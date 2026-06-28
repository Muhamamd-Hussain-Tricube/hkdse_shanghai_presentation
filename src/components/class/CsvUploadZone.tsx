import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  accept?: string;
  hint: string;
  sampleLabel?: string;
  onSampleDownload?: () => void;
  onFileParsed: (text: string) => void;
  disabled?: boolean;
};

export function CsvUploadZone({
  accept = ".csv,text/csv",
  hint,
  sampleLabel,
  onSampleDownload,
  onFileParsed,
  disabled,
}: Props) {
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        onFileParsed(text);
      };
      reader.readAsText(file);
    },
    [onFileParsed],
  );

  return (
    <div
      className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        dragOver ? "border-primary bg-primary/5" : "border-border bg-surface/50"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">{hint}</p>
      <label className="mt-4 inline-block">
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" asChild>
          <span>Choose CSV file</span>
        </Button>
      </label>
      {onSampleDownload && sampleLabel && (
        <button
          type="button"
          className="mt-3 block w-full text-xs text-primary hover:underline"
          onClick={onSampleDownload}
        >
          {sampleLabel}
        </button>
      )}
    </div>
  );
}
