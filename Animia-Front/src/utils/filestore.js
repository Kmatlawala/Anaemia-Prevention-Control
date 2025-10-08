// src/utils/filestore.js
import RNFS from 'react-native-fs';
import RNBlobUtil from 'react-native-blob-util';

/**
 * Copy a source URI (content:// or file:// or http) into app's DocumentDirectory
 * Returns a file:// URI on success, or null on failure.
 *
 * uniqueId: string used to create folder per beneficiary
 * srcUri: URI returned by scanner (may be content:// or file://)
 * which: 'front'|'back' or custom name
 */
export async function saveDocumentFile(uniqueId, srcUri, which = 'front') {
  if (!srcUri) return null;
  try {
    // Prepare destination path
    const baseDir = `${RNFS.DocumentDirectoryPath}/beneficiaries/${uniqueId}`;
    await RNFS.mkdir(baseDir).catch(()=>{});
    // try to infer extension
    const extMatch = (srcUri.match(/\.(\w+)(?:\?|$)/) || [])[1];
    const ext = extMatch || 'jpg';
    const destPath = `${baseDir}/${which}.${ext}`;
    const destFileUri = `file://${destPath}`;

    // If src is content:// (Android) use RNBlobUtil to copy
    if (srcUri.startsWith('content://')) {
      // read stream and write to dest
      const destPathNoPrefix = destPath; // RNFS expects no file:// prefix for copy/write
      const res = await RNBlobUtil.fs.readFile(srcUri, 'base64')
        .then(base64Data => RNFS.writeFile(destPathNoPrefix, base64Data, 'base64'));
      // verify
      const exists = await RNFS.exists(destPath);
      return exists ? destFileUri : null;
    }

    // If src is file://, remove prefix and copy
    if (srcUri.startsWith('file://')) {
      const srcPath = srcUri.replace('file://', '');
      await RNFS.copyFile(srcPath, destPath);
      const exists = await RNFS.exists(destPath);
      return exists ? destFileUri : null;
    }

    // If src is http(s) - download with RNBlobUtil
    if (srcUri.startsWith('http')) {
      const res = await RNBlobUtil.config({ fileCache: true, path: destPath }).fetch('GET', srcUri);
      // res.path() returns absolute path (no file://). Ensure file exists.
      const exists = await RNFS.exists(destPath);
      return exists ? `file://${destPath}` : null;
    }

    // fallback: try RNFS copy with src as-is (may fail)
    try {
      const srcPath = srcUri.startsWith('/') ? srcUri : srcUri.replace('file://','');
      await RNFS.copyFile(srcPath, destPath);
      const exists = await RNFS.exists(destPath);
      return exists ? destFileUri : null;
    } catch (err) {
      console.warn('[filestore] fallback copy failed', err);
      return null;
    }
  } catch (e) {
    console.warn('[filestore] saveDocumentFile error', e);
    return null;
  }
}
