import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_SIZE_BYTES = 3 * 512 * 1024; // 1.5 MB

function getBase64Size(base64String: string): number {
  const cleaned = base64String.split(",")[1] || base64String;
  return Math.ceil((cleaned.length * 3) / 4);
}

type UploadInput = {
  image?: { file: string; fileType: string };
  pdf?: { file: string; fileType: string };
};

export async function POST(request: NextRequest) {
  const { image, pdf } = (await request.json()) as UploadInput;

  if (!image && !pdf) {
    return NextResponse.json(
      { error: "At least one file (image or pdf) is required" },
      { status: 400 },
    );
  }

  const results: Record<"image" | "pdf", unknown> = {
    image: undefined,
    pdf: undefined,
  };
  const errors: Record<string, string> = {};

  async function handleUpload(
    key: "image" | "pdf",
    fileObj: { file: string; fileType: string },
  ) {
    const { file, fileType } = fileObj;

    if (!file || !fileType) {
      errors[key] = "File and fileType are required";
      return;
    }

    const size = getBase64Size(file);
    if (size > MAX_SIZE_BYTES) {
      errors[key] = "File size exceeds 1.5 MB limit";
      return;
    }

    if (
      (key === "image" && !/^image\//.test(fileType)) ||
      (key === "pdf" && fileType !== "application/pdf")
    ) {
      errors[key] =
        key === "image"
          ? "Only image files are allowed"
          : "Only PDF files are allowed";
      return;
    }

    try {
      const uploadResult = await cloudinary.uploader.upload(file, {
        folder: "products",
        resource_type: key === "pdf" ? "raw" : "image",
      });
      results[key] = uploadResult;
    } catch (err) {
      errors[key] = (err as Error).message || "Upload failed";
    }
  }

  const promises = [];
  if (image) promises.push(handleUpload("image", image));
  if (pdf) promises.push(handleUpload("pdf", pdf));
  await Promise.all(promises);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  return NextResponse.json({ results });
}
