/** Deteta ficheiros de FormData sem depender de `instanceof File` (falha em realms Node/Next). */
export function isUploadedFile(value: FormDataEntryValue): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "size" in value &&
    "name" in value &&
    Number((value as { size: number }).size) > 0
  );
}

export function formDataFiles(formData: FormData, field: string): File[] {
  return formData.getAll(field).filter(isUploadedFile);
}

const IMAGE_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
  "gif",
]);

export function fileExtension(nameOrPath: string) {
  const base = nameOrPath.split("/").pop() ?? nameOrPath;
  const i = base.lastIndexOf(".");
  return i >= 0 ? base.slice(i + 1).toLowerCase() : "";
}

export function isPdfFile(nameOrPath: string, mime?: string | null) {
  if (mime === "application/pdf") return true;
  return fileExtension(nameOrPath) === "pdf";
}

export function isImageFile(nameOrPath: string, mime?: string | null) {
  if (mime?.startsWith("image/")) return true;
  return IMAGE_EXT.has(fileExtension(nameOrPath));
}

export function isAllowedAttachment(file: File) {
  return isImageFile(file.name, file.type) || isPdfFile(file.name, file.type);
}

export function attachmentContentType(file: File) {
  if (file.type) return file.type;
  if (isPdfFile(file.name)) return "application/pdf";
  const ext = fileExtension(file.name);
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}
