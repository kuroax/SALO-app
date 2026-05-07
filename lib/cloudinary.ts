// Cloudinary upload helper.
//
// Requires EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and
// EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET to be set in .env.development and
// .env.production. Config.ts throws at startup if they are missing — image
// uploads will fail loudly rather than silently posting to undefined.

import { Config } from "@/constants/Config";

type FilePart = { uri: string; name: string; type: string };

export async function uploadToCloudinary(uri: string): Promise<string> {
  const filename = uri.split("/").pop() ?? "image.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  const filePart: FilePart = { uri, name: filename, type };

  const formData = new FormData();
  // React Native FormData accepts the { uri, name, type } shape for file
  // uploads, but its TS lib type only declares Blob | string. Cast through
  // unknown to satisfy the type checker without using `any` or `as never`.
  formData.append("file", filePart as unknown as Blob);
  formData.append("upload_preset", Config.CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${Config.CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );
  if (!res.ok) throw new Error("Image upload failed");
  const data = await res.json();
  if (!data.secure_url || typeof data.secure_url !== "string") {
    throw new Error("Image upload failed: invalid response from server");
  }
  return data.secure_url;
}
