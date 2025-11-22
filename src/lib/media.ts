const MEDIA_PROXY_BASE =
  (process.env.NEXT_PUBLIC_MEDIA_PROXY_BASE ||
    process.env.MEDIA_PROXY_BASE ||
    "/api/media").replace(/\/$/, "");

const MINIO_BUCKET_NAME =
  process.env.NEXT_PUBLIC_MINIO_BUCKET ||
  process.env.MINIO_BUCKET ||
  "visa-documents";

const MINIO_HOST_HINT = (() => {
  const hint =
    process.env.NEXT_PUBLIC_MINIO_PUBLIC_ENDPOINT ||
    process.env.MINIO_PUBLIC_ENDPOINT ||
    process.env.NEXT_PUBLIC_MINIO_ENDPOINT ||
    process.env.MINIO_ENDPOINT ||
    "";

  if (!hint) {
    return "";
  }

  try {
    const parsed = new URL(hint);
    return parsed.host;
  } catch {
    return hint.replace(/^https?:\/\//, "");
  }
})();

const MINIO_PORT_HINT = (() => {
  if (!MINIO_HOST_HINT) {
    return "9000";
  }

  const portMatch = MINIO_HOST_HINT.split(":")[1];
  return portMatch || "";
})();

function encodeKey(key: string) {
  return key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function isIpAddress(value: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(value);
}

function isLikelyMinioHost(url: URL) {
  if (MINIO_HOST_HINT && url.host === MINIO_HOST_HINT) {
    return true;
  }

  if (MINIO_PORT_HINT && url.port && url.port === MINIO_PORT_HINT) {
    return true;
  }

  if (url.port === "9000") {
    return true;
  }

  if (isIpAddress(url.hostname)) {
    return true;
  }

  return false;
}

export function buildMediaProxyUrlFromKey(key: string) {
  const normalized = key.replace(/^\/+/, "");
  if (!normalized) {
    return "";
  }

  return `${MEDIA_PROXY_BASE}/${encodeKey(normalized)}`;
}

export function extractMediaKeyFromUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith(MEDIA_PROXY_BASE)) {
    const proxyPath = trimmed.slice(MEDIA_PROXY_BASE.length).replace(/^\/+/, "");
    return decodeURIComponent(proxyPath);
  }

  if (!trimmed.startsWith("http")) {
    const rawPath = trimmed.replace(/^\/+/, "");
    if (rawPath.startsWith(`${MINIO_BUCKET_NAME}/`)) {
      return rawPath.slice(MINIO_BUCKET_NAME.length + 1);
    }
    return rawPath;
  }

  try {
    const parsed = new URL(trimmed);
    if (!isLikelyMinioHost(parsed)) {
      return null;
    }
    const path = parsed.pathname.replace(/^\/+/, "");
    if (path.startsWith(`${MINIO_BUCKET_NAME}/`)) {
      return path.slice(MINIO_BUCKET_NAME.length + 1);
    }
    return path;
  } catch {
    return null;
  }
}

export function getMediaProxyUrl(value?: string | null) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  // If it's already a media proxy URL, return as-is
  if (trimmed.startsWith(MEDIA_PROXY_BASE)) {
    return trimmed;
  }

  // Try to extract MinIO/storage key from URL
  const key = extractMediaKeyFromUrl(trimmed);
  if (key) {
    return buildMediaProxyUrlFromKey(key);
  }

  // For external URLs (http/https), return as-is
  // Next.js Image will handle these with remotePatterns
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // For relative paths or other URLs, return as-is
  return trimmed;
}

export function normalizeMediaInput(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith(MEDIA_PROXY_BASE)) {
    return trimmed;
  }

  const key = extractMediaKeyFromUrl(trimmed);
  if (key) {
    return buildMediaProxyUrlFromKey(key);
  }

  return trimmed;
}

