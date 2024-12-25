"use client";

import { ImageUpload } from "@/components/ui/image-upload";
import { type ImageUploadResponse } from "@/types/image";
import { useState } from "react";

export default function Home() {
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const handleUploadComplete = (result: ImageUploadResponse) => {
    console.log("Upload complete:", result);
    setUploadedImageUrl(result.url);
  };

  return (
    <main className="container mx-auto p-8">
      <div className="max-w-xl">
        <h1 className="mb-8 text-2xl font-bold">Image Upload Test</h1>
        <ImageUpload type="listing" onUploadComplete={handleUploadComplete} />

        {uploadedImageUrl && (
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-semibold">Uploaded Image:</h2>
            <img
              src={uploadedImageUrl}
              alt="Uploaded image"
              className="rounded-lg border shadow-sm"
            />
            <p className="mt-2 text-sm text-gray-500">{uploadedImageUrl}</p>
          </div>
        )}
      </div>
    </main>
  );
}
