import imageCompression from "browser-image-compression";

interface UploadResponse {
  url: string;       // presigned upload URL
  publicUrl: string; // permanent public URL for displaying the media
  key: string;
  error?: string;
}

export const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.5, // 512KB
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp' as const,
  };
  try {
    const compressedBlob = await imageCompression(file, options);
    // browser-image-compression returns a Blob, we convert it back to a File
    return new File([compressedBlob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error("Error compressing image:", error);
    throw new Error("Failed to compress image");
  }
};

export const uploadMedia = async (file: File): Promise<{ url: string; key: string }> => {
  // 1. Get Presigned URL
  const response = await fetch("/api/upload/url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });

  const data: UploadResponse = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || "Failed to get upload URL");
  }

  // 2. Upload to Cloudflare R2
  const uploadResponse = await fetch(data.url, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload file to storage");
  }

  return { url: data.publicUrl, key: data.key }; // Store the permanent public URL, not the presigned one
};
