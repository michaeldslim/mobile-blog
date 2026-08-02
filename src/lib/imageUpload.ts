import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.85;

/**
 * Picks an image from the device library and compresses it.
 * Returns null if the user cancels.
 */
export async function pickAndCompressImage(): Promise<ImageManipulator.ImageResult | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Camera roll permission denied');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    quality: 1,
    // Force legacy ACTION_GET_CONTENT intent on Android — the new Photo Picker
    // (android.provider.action.PICK_IMAGES) requires Google Photos which is
    // unavailable on emulators and some non-Play devices.
    legacy: true,
  });

  if (result.canceled || !result.assets[0]) return null;
  return compressAsset(result.assets[0]);
}

/**
 * Opens the device camera, captures a photo, and compresses it.
 * Returns null if the user cancels.
 */
export async function captureAndCompressImage(): Promise<ImageManipulator.ImageResult | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Camera permission denied');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) return null;
  return compressAsset(result.assets[0]);
}

async function compressAsset(asset: ImagePicker.ImagePickerAsset): Promise<ImageManipulator.ImageResult> {
  const { width, height } = asset;

  // Determine resize dimensions maintaining aspect ratio
  let resizeWidth = width;
  let resizeHeight = height;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width >= height) {
      resizeWidth = MAX_DIMENSION;
      resizeHeight = Math.round((height / width) * MAX_DIMENSION);
    } else {
      resizeHeight = MAX_DIMENSION;
      resizeWidth = Math.round((width / height) * MAX_DIMENSION);
    }
  }

  return ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: resizeWidth, height: resizeHeight } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );
}

/**
 * Uploads a local image URI to Supabase Storage and returns the public URL.
 */
export async function uploadBlogImage(localUri: string): Promise<string> {
  const objectPath = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  // Read as base64 via expo-file-system — avoids the "Network request failed"
  // error that occurs when fetching file:// URIs directly on Android.
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Decode base64 to a Uint8Array for the Supabase JS client upload
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const { error } = await supabase.storage
    .from('blog-images')
    .upload(objectPath, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data } = supabase.storage.from('blog-images').getPublicUrl(objectPath);
  return data.publicUrl;
}

/**
 * Extracts the storage object path from a Supabase public URL and deletes it.
 * Supports current keys (`filename.jpg`) and legacy double-prefix keys (`blog-images/filename.jpg`).
 */
export async function deleteBlogImage(publicUrl: string): Promise<void> {
  try {
    const match = publicUrl.match(/\/storage\/v1\/object\/public\/blog-images\/(.+)/);
    if (!match) return;
    const objectPath = match[1];
    await supabase.storage.from('blog-images').remove([objectPath]);
  } catch {
    // Non-fatal — image cleanup failure shouldn't block the operation
    if (__DEV__) console.warn('Failed to delete image from storage');
  }
}
