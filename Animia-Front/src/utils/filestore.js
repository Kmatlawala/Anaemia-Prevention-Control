
import RNFS from 'react-native-fs';
import RNBlobUtil from 'react-native-blob-util';

export async function saveDocumentFile(uniqueId, srcUri, which = 'front') {
  if (!srcUri) return null;
  try {
    
    const baseDir = `${RNFS.DocumentDirectoryPath}/beneficiaries/${uniqueId}`;
    await RNFS.mkdir(baseDir).catch(()=>{});
    
    const extMatch = (srcUri.match(/\.(\w+)(?:\?|$)/) || [])[1];
    const ext = extMatch || 'jpg';
    const destPath = `${baseDir}/${which}.${ext}`;
    const destFileUri = `file:

    if (srcUri.startsWith('content:
      
      const destPathNoPrefix = destPath; 
      const res = await RNBlobUtil.fs.readFile(srcUri, 'base64')
        .then(base64Data => RNFS.writeFile(destPathNoPrefix, base64Data, 'base64'));
      
      const exists = await RNFS.exists(destPath);
      return exists ? destFileUri : null;
    }

    if (srcUri.startsWith('file:
      const srcPath = srcUri.replace('file:
      await RNFS.copyFile(srcPath, destPath);
      const exists = await RNFS.exists(destPath);
      return exists ? destFileUri : null;
    }

    if (srcUri.startsWith('http')) {
      const res = await RNBlobUtil.config({ fileCache: true, path: destPath }).fetch('GET', srcUri);
      
      const exists = await RNFS.exists(destPath);
      return exists ? `file:
    }

    try {
      const srcPath = srcUri.startsWith('/') ? srcUri : srcUri.replace('file:
      await RNFS.copyFile(srcPath, destPath);
      const exists = await RNFS.exists(destPath);
      return exists ? destFileUri : null;
    } catch (err) {
      return null;
    }
  } catch (e) {
    return null;
  }
}
