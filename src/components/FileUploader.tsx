import React, { useRef, useState } from "react";

type FileUploaderProps = {
  onUploaded: (url: string) => void;
  label?: string;
  accept?: string;
};

export function FileUploader({
  onUploaded,
  label = "Upload File",
  accept = "image/*,application/pdf",
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional: Validate file type and size here if needed

    setUploading(true);
    try {
      // Convert file to base64 for API
      const base64 = await toBase64(file);

      // Prepare payload for /api/upload
      const payload = file.type.startsWith("image/")
        ? { image: { file: base64, fileType: file.type } }
        : { pdf: { file: base64, fileType: file.type } };

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        const url =
          data.results?.image?.secure_url ||
          data.results?.pdf?.secure_url ||
          "";
        if (url) {
          onUploaded(url);
        }
      } else {
        alert(data.errors?.image || data.errors?.pdf || "Upload failed");
      }
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <label>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleChange}
          />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : label}
        </button>
      </label>
    </div>
  );
}

// Helper to convert file to base64
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
