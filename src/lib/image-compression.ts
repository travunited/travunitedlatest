import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
}

/**
 * Compresses an image file using browser-image-compression
 */
export async function compressImage(
    file: File,
    options: CompressionOptions = {}
): Promise<File> {
    // Default options: max 1MB (to be safe for Nginx defaults), max 1920px dimensions
    const defaultOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: file.type || 'image/jpeg',
    };

    const compressionConfig = {
        ...defaultOptions,
        ...options,
    };

    try {
        console.log(`Compressing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        const compressedFile = await imageCompression(file, compressionConfig);
        console.log(`Compression result: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
        return compressedFile;
    } catch (error) {
        console.error("Image compression failed:", error);
        // Return original file if compression fails, to attempt upload anyway
        return file;
    }
}
