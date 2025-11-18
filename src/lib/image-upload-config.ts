/**
 * Image Upload Configuration
 * 
 * Default allowed image types: PNG and JPG/JPEG only
 * Can be extended by setting environment variable ALLOWED_IMAGE_TYPES (comma-separated)
 */

// Default allowed image MIME types (PNG and JPG/JPEG only)
export const DEFAULT_ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'] as const;

// Maximum allowed file size: 5 MB
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// Get allowed image types from config or use defaults
export function getAllowedImageTypes(): string[] {
  // Check if custom types are configured via environment variable
  const customTypes = process.env.ALLOWED_IMAGE_TYPES;
  if (customTypes) {
    return customTypes.split(',').map(type => type.trim()).filter(Boolean);
  }
  // Return default: PNG and JPG/JPEG only
  return [...DEFAULT_ALLOWED_IMAGE_TYPES];
}

// Get human-readable format names for display
export function getAllowedImageFormats(): string[] {
  const types = getAllowedImageTypes();
  return types.map(type => {
    if (type === 'image/jpeg' || type === 'image/jpg') return 'JPG';
    if (type === 'image/png') return 'PNG';
    if (type === 'image/webp') return 'WEBP';
    if (type === 'image/gif') return 'GIF';
    return type.split('/')[1]?.toUpperCase() || type;
  });
}

// Validate file type
export function isValidImageType(fileType: string): boolean {
  return getAllowedImageTypes().includes(fileType);
}

// Validate file size
export function isValidImageSize(fileSize: number): boolean {
  return fileSize <= MAX_IMAGE_SIZE_BYTES;
}

// Get human-readable max size
export function getMaxImageSizeDisplay(): string {
  return '5 MB';
}

