import React, { useRef } from "react";

const MAX_SIZE = 1.5 * 1024 * 1024; // 1.5 MB

type Props = {
  onUpload: (url: string, file: File) => void;
  uploadPreset: string;
  cloudName: string;
};

export function CloudinaryUploader({
  onUpload,
  uploadPreset,
  cloudName,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf";

      if (!isImage && !isPDF) {
        alert(`File "${file.name}" is not an image or PDF.`);
        continue;
      }

      if (file.size > MAX_SIZE) {
        alert(`File "${file.name}" must be under 1.5 MB.`);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      try {
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
          {
            method: "POST",
            body: formData,
          }
        );
        const data = await res.json();
        if (data.secure_url) {
          onUpload(data.secure_url, file);
        } else {
          alert(`Upload failed for "${file.name}".`);
        }
      } catch {
        alert(`Upload failed for "${file.name}".`);
      }
    }
    // Optionally reset input after upload
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <input
      ref={inputRef}
      type="file"
      accept="image/*,application/pdf"
      multiple
      onChange={handleFileChange}
    />
  );
}
