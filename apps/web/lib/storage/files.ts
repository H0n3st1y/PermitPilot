/**
 * Uploaded file bytes live in IndexedDB (localStorage is too small for files).
 * Metadata stays on the project record; this store is keyed by document id.
 * Files never leave this browser.
 */
const DB_NAME = "permitpilot-files";
const STORE = "files";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
export const UPLOAD_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp," + ALLOWED_UPLOAD_TYPES.join(",");

/** Returns a user-facing problem with the file, or null when it is acceptable. */
export function validateUpload(file: File): string | null {
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) return "Files must be 10 MB or smaller.";
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) return "Upload a PDF, PNG, JPEG, or WebP file.";
  return null;
}

/** Leading bytes that identify each accepted type. The declared MIME type must match the file's real content. */
function matchesSignature(bytes: Uint8Array, mimeType: string): boolean {
  const startsWith = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  switch (mimeType) {
    case "application/pdf":
      return startsWith(0x25, 0x50, 0x44, 0x46); // %PDF
    case "image/png":
      return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/jpeg":
      return startsWith(0xff, 0xd8, 0xff);
    case "image/webp":
      return startsWith(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50; // RIFF....WEBP
    default:
      return false;
  }
}

/** Full check: type, size, and that the file's bytes match its declared type. */
export async function checkUpload(file: File): Promise<string | null> {
  const problem = validateUpload(file);
  if (problem) return problem;
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return matchesSignature(head, file.type) ? null : "This file's contents don't match its type. Upload a real PDF, PNG, JPEG, or WebP file.";
}

export function safeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 150) || "document";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("File storage is not available in this browser."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open file storage."));
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error ?? request.error ?? new Error("File storage failed."));
      tx.onabort = () => reject(tx.error ?? new Error("File storage was aborted (the browser may be out of space)."));
    });
  } finally {
    db.close();
  }
}

export function putFile(id: string, file: Blob): Promise<IDBValidKey> {
  return run("readwrite", (store) => store.put(file, id));
}

export async function getFile(id: string): Promise<Blob | null> {
  const result = await run<Blob | undefined>("readonly", (store) => store.get(id) as IDBRequest<Blob | undefined>);
  return result ?? null;
}

export async function deleteFiles(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await run("readwrite", (store) => {
    let last: IDBRequest<undefined> = store.delete(ids[0]);
    for (const id of ids.slice(1)) last = store.delete(id);
    return last;
  });
}
