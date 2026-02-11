import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform, Linking } from 'react-native';

/**
 * Opens a file from a Cloudinary URL directly in the browser
 * This allows viewing images, PDFs, and other files without downloading
 * @param url - The Cloudinary URL of the file to view
 * @param filename - The filename (used for logging purposes)
 */
export async function downloadFile(url: string, filename: string): Promise<boolean> {
  try {
    // Ensure filename has proper extension
    const extension = filename.split('.').pop()?.toLowerCase() || 'pdf';
    
    console.log(`[FILE VIEWER] Opening ${filename} (extension: ${extension})`);
    console.log(`[FILE VIEWER] URL: ${url}`);

    // For all platforms, just open the Cloudinary URL directly in browser
    // This allows viewing images, PDFs, and other files without downloading
    console.log(`[FILE VIEWER] Opening Cloudinary URL in browser`);
    
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      console.log(`[FILE VIEWER] Successfully opened ${filename}`);
      return true;
    } else {
      throw new Error('Cannot open URL');
    }
  } catch (error) {
    console.error('[FILE VIEWER] Error opening file:', error);
    throw error;
  }
}

/**
 * Gets the MIME type based on file extension
 */
function getMimeType(extension: string): string {
  const mimeTypes: { [key: string]: string } = {
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    rtf: 'application/rtf',
    odt: 'application/vnd.oasis.opendocument.text',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    odp: 'application/vnd.oasis.opendocument.presentation',
    
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    bmp: 'image/bmp',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    
    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    
    // Video
    mp4: 'video/mp4',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    webm: 'video/webm',
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Gets the UTI (Uniform Type Identifier) for iOS based on file extension
 */
function getUTI(extension: string): string {
  const utiTypes: { [key: string]: string } = {
    // Documents
    pdf: 'com.adobe.pdf',
    doc: 'com.microsoft.word.doc',
    docx: 'org.openxmlformats.wordprocessingml.document',
    xls: 'com.microsoft.excel.xls',
    xlsx: 'org.openxmlformats.spreadsheetml.sheet',
    ppt: 'com.microsoft.powerpoint.ppt',
    pptx: 'org.openxmlformats.presentationml.presentation',
    txt: 'public.plain-text',
    rtf: 'public.rtf',
    
    // Images
    jpg: 'public.jpeg',
    jpeg: 'public.jpeg',
    png: 'public.png',
    gif: 'com.compuserve.gif',
    bmp: 'com.microsoft.bmp',
    
    // Archives
    zip: 'public.zip-archive',
    rar: 'com.rarlab.rar-archive',
    
    // Audio
    mp3: 'public.mp3',
    wav: 'com.microsoft.waveform-audio',
    m4a: 'public.mpeg-4-audio',
    
    // Video
    mp4: 'public.mpeg-4',
    mov: 'com.apple.quicktime-movie',
  };

  return utiTypes[extension.toLowerCase()] || 'public.data';
}

/**
 * Formats file size in bytes to human-readable format
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown size';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

