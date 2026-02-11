/**
 * Utility functions for handling image URLs
 * Ensures Cloudinary URLs are used directly without local path resolution
 */

/**
 * Gets the full image URL from Cloudinary or local path
 * @param imageUrl - Image URL from database (could be Cloudinary URL or relative path)
 * @param baseUrl - API base URL (optional, for constructing local paths)
 * @returns Full URL to the image
 */
export function getImageUrl(imageUrl: string | null | undefined, baseUrl?: string): string | null {
  if (!imageUrl) return null;
  
  // If it's already a full HTTP/HTTPS URL (Cloudinary or external), use it directly
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If it's a relative path starting with /uploads, construct full URL
  if (imageUrl.startsWith('/uploads')) {
    const apiBase = baseUrl || '';
    // Remove /api from base URL if present, then append image path
    const cleanBase = apiBase.replace(/\/api$/, '');
    return `${cleanBase}${imageUrl}`;
  }
  
  // If it's a Cloudinary path without protocol (e.g., "res.cloudinary.com/...")
  if (imageUrl.includes('cloudinary.com')) {
    return `https://${imageUrl}`;
  }
  
  // For profiles folder path (Cloudinary format)
  if (imageUrl.includes('profiles/')) {
    // If it looks like a Cloudinary public ID, construct the URL
    // Format: profiles/SCHOOLCODE/FILENAME
    // This should already be a full URL from backend, but handle edge cases
    if (!imageUrl.startsWith('http')) {
      // Assume it's a Cloudinary public ID and needs to be constructed
      // But typically backend should return full URL
      console.warn('[IMAGE UTILS] Profile image path without full URL:', imageUrl);
    }
  }
  
  // Return as-is if it's already a valid format
  return imageUrl;
}

/**
 * Gets profile image URL from user data
 * Checks multiple possible locations for profileImage
 * @param userData - User data object
 * @param baseUrl - API base URL (optional)
 * @returns Profile image URL or null
 */
export function getProfileImageUrl(userData: any, baseUrl?: string): string | null {
  if (!userData) {
    console.log('[IMAGE UTILS] No userData provided');
    return null;
  }
  
  // Check multiple possible locations for profile image
  const imageUrl = 
    userData.identity?.profileImage || 
    userData.profileImage || 
    userData.profilePicture ||
    userData.avatarUrl ||
    null;
  
  if (!imageUrl) {
    console.log('[IMAGE UTILS] No profile image found in userData');
    return null;
  }
  
  console.log('[IMAGE UTILS] Found profile image URL:', imageUrl.substring(0, 100) + '...');
  
  const finalUrl = getImageUrl(imageUrl, baseUrl);
  console.log('[IMAGE UTILS] Final profile image URL:', finalUrl?.substring(0, 100) + '...');
  
  return finalUrl;
}

/**
 * Gets school logo URL from school data
 * Checks multiple possible locations for logo
 * @param schoolData - School data object
 * @param baseUrl - API base URL (optional)
 * @returns School logo URL or null
 */
export function getSchoolLogoUrl(schoolData: any, baseUrl?: string): string | null {
  if (!schoolData) {
    return null;
  }
  
  // Check multiple possible locations for logo
  const logoUrl = 
    schoolData.logoUrl || 
    schoolData.logo ||
    null;
  
  if (!logoUrl) {
    return null;
  }
  
  // Use the same image URL processing logic
  return getImageUrl(logoUrl, baseUrl);
}

