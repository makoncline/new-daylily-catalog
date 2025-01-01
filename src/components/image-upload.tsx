"use client";

import { useCallback, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import ReactCrop, {
  type Crop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { getPresignedUrl } from "@/actions/images";
import { useToast } from "@/hooks/use-toast";
import { type ImageUploadProps } from "@/types/image";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

function getCroppedImg(
  image: HTMLImageElement,
  crop: Crop,
  mimeType: string,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  const pixelRatio = window.devicePixelRatio;
  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = "high";

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;

  ctx.save();

  // Move the crop origin to the canvas origin (0,0)
  ctx.translate(-cropX, -cropY);
  // Draw the cropped image at the correct position
  ctx.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
  );

  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create blob"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      1,
    );
  });
}

export function ImageUpload({
  type,
  listingId,
  userProfileId,
  onUploadComplete = (result: { url: string; success: boolean }) => {
    console.log("Upload complete:", result);
  },
  maxFiles = 1,
}: ImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [isUploading, setIsUploading] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
      setUploadedUrl(null); // Reset uploaded image when new file is selected

      // Create image object to get dimensions
      const img = new window.Image();
      img.onload = () => {
        const crop = centerAspectCrop(img.width, img.height, 1);
        setCrop(crop);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);

    setSelectedFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxSize: MAX_FILE_SIZE,
    maxFiles,
    multiple: maxFiles > 1,
  });

  const handleUpload = async () => {
    if (!selectedFile || !crop || !previewUrl || !imageRef.current) return;

    try {
      setIsUploading(true);

      // Get presigned URL with original content type
      const response = await getPresignedUrl({
        type,
        fileName: selectedFile.name,
        contentType: selectedFile.type,
        size: selectedFile.size,
        listingId,
        userProfileId,
      });

      // Create the cropped image blob with original mime type
      const croppedBlob = await getCroppedImg(
        imageRef.current,
        crop,
        selectedFile.type,
      );

      // Upload to S3 with original content type
      const uploadResult = await fetch(response.presignedUrl, {
        method: "PUT",
        body: croppedBlob,
        headers: {
          "Content-Type": selectedFile.type,
        },
      });

      if (!uploadResult.ok) {
        throw new Error("Failed to upload image");
      }

      // Wait a moment for S3 to process the upload
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify the image is accessible
      try {
        const verifyImage = new window.Image();
        await new Promise<void>((resolve, reject) => {
          verifyImage.onload = () => resolve();
          verifyImage.onerror = () =>
            reject(new Error("Failed to verify uploaded image"));
          verifyImage.src = response.url;
        });

        setUploadedUrl(response.url);
        onUploadComplete({ url: response.url, success: true });
        toast({
          title: "Image uploaded successfully",
        });

        // Reset state except for uploaded URL
        setSelectedFile(null);
        setPreviewUrl(null);
        setCrop(undefined);
      } catch {
        throw new Error("Failed to verify uploaded image");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        title: "Failed to upload image",
        variant: "destructive",
      });
      setUploadedUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!uploadedUrl && (
        <>
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center ${
              isDragActive ? "border-primary" : "border-muted"
            }`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the image here...</p>
            ) : (
              <p>Drag and drop an image here, or click to select one</p>
            )}
          </div>

          {previewUrl && (
            <div className="space-y-4">
              <div className="rounded-lg border">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  aspect={1}
                  className="max-w-full"
                >
                  <img ref={imageRef} src={previewUrl} alt="Preview" />
                </ReactCrop>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!crop || isUploading}
                className="w-full"
              >
                {isUploading ? "Uploading..." : "Upload Image"}
              </Button>
            </div>
          )}
        </>
      )}

      {uploadedUrl && (
        <div className="space-y-4">
          <div className="aspect-square w-full overflow-hidden rounded-lg">
            <img
              src={uploadedUrl}
              alt="Uploaded image"
              className="h-full w-full object-cover"
            />
          </div>
          <Button
            onClick={() => {
              setUploadedUrl(null);
              setSelectedFile(null);
              setPreviewUrl(null);
              setCrop(undefined);
            }}
            className="w-full"
          >
            Upload New Image
          </Button>
        </div>
      )}
    </div>
  );
}
