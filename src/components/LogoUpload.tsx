import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface LogoUploadProps {
  onLogoChange: (file: File | null, url: string | null) => void;
}

export function LogoUpload({ onLogoChange }: LogoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [cloudUrl, setCloudUrl] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
      onLogoChange(file, url);
      setUploading(true);
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: { file: base64, fileType: file.type } }),
          });
          const data = await res.json();
          if (data.results && data.results.image && data.results.image.secure_url) {
            setCloudUrl(data.results.image.secure_url);
          }
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setLogoUrl(null);
      setCloudUrl(null);
      onLogoChange(null, null);
    }
  };

  return (
    <div className="space-y-2">
      <input
        placeholder="Upload your logo"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
      >
        Upload Institution Logo
      </Button>
      {logoUrl && (
        <div className="mt-2">
          <Image src={logoUrl} alt="Institution Logo Preview" width={64} height={64} className="h-16 w-auto rounded border" />
          {uploading && <div className="text-xs text-muted-foreground mt-1">Uploading...</div>}
          {cloudUrl && (
            <div className="text-xs text-green-600 mt-1">Logo uploaded! Cloud URL: <span className="break-all">{cloudUrl}</span></div>
          )}
        </div>
      )}
    </div>
  );
}
