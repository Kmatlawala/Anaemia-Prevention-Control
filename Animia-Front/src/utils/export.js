// src/utils/export.js
import * as XLSX from 'xlsx';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Platform, Alert, PermissionsAndroid } from 'react-native';

async function ensureWritePermission() {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission',
        message: 'Allow saving reports to your Downloads folder.',
        buttonPositive: 'Allow'
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED || granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
  } catch (_) { return false; }
}

// Simple text export method (most reliable)
export const exportJsonToText = async (rows, filenamePrefix = 'Animia') => {
  const fileName = `${filenamePrefix}_${new Date().toISOString().replace(/[:.]/g,'-')}.txt`;
  
  if (!rows || rows.length === 0) {
    Alert.alert('No Data', 'No data available to export');
    return;
  }
  
  try {
    // Create text content
    let textContent = '';
    
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      textContent += headers.join('\t') + '\n';
      
      rows.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          return String(value);
        });
        textContent += values.join('\t') + '\n';
      });
    }
    
    // Save to multiple locations to ensure file is accessible
    const savedPaths = [];
    const errors = [];
    
    // Try multiple locations
    const locations = [
      {
        name: 'Downloads',
        path: RNFS.DownloadDirectoryPath,
        fallback: `${RNFS.ExternalStorageDirectoryPath}/Download`
      },
      {
        name: 'Documents',
        path: RNFS.DocumentDirectoryPath
      },
      {
        name: 'External Storage',
        path: `${RNFS.ExternalStorageDirectoryPath}/Animia`
      }
    ];
    
    for (const location of locations) {
      try {
        let targetPath = location.path;
        
        // Use fallback if primary path is not available
        if (!targetPath && location.fallback) {
          targetPath = location.fallback;
        }
        
        if (targetPath) {
          // Create directory if it doesn't exist
          const dirExists = await RNFS.exists(targetPath);
          if (!dirExists) {
            await RNFS.mkdir(targetPath);
          }
          
          const filePath = `${targetPath}/${fileName}`;
          await RNFS.writeFile(filePath, textContent, 'utf8');
          
          // Verify file was actually written
          const fileExists = await RNFS.exists(filePath);
          if (fileExists) {
            const stats = await RNFS.stat(filePath);
            if (stats.size > 0) {
              savedPaths.push({ location: location.name, path: filePath });
              console.log(`[Export] Successfully saved text to ${location.name}:`, filePath, `Size: ${stats.size} bytes`);
            }
          }
        }
      } catch (error) {
        errors.push({ location: location.name, error: error.message });
        console.warn(`[Export] Failed to save text to ${location.name}:`, error);
      }
    }
    
    // Try to copy to accessible location
    if (savedPaths.length > 0) {
      try {
        // Try to copy to a more accessible location
        const accessiblePath = `${RNFS.ExternalStorageDirectoryPath}/Download/Animia_Reports`;
        await RNFS.mkdir(accessiblePath);
        
        const accessibleFilePath = `${accessiblePath}/${fileName}`;
        await RNFS.copyFile(savedPaths[0].path, accessibleFilePath);
        
        const accessibleFileExists = await RNFS.exists(accessibleFilePath);
        if (accessibleFileExists) {
          const stats = await RNFS.stat(accessibleFilePath);
          if (stats.size > 0) {
            savedPaths.push({ location: 'Accessible Downloads', path: accessibleFilePath });
            console.log(`[Export] Successfully copied text to accessible location:`, accessibleFilePath, `Size: ${stats.size} bytes`);
          }
        }
      } catch (copyError) {
        console.warn('[Export] Failed to copy text to accessible location:', copyError);
      }
    }
    
    // Show results
    if (savedPaths.length > 0) {
      const successMessage = savedPaths.map(p => `${p.location}: ${p.path}`).join('\n\n');
      Alert.alert('Export Successful', `Text file saved to ${savedPaths.length} location(s):\n\n${successMessage}\n\nYou can find the files in your device's file manager.`);
      return savedPaths[0].path; // Return first successful path
    } else {
      const errorMessage = errors.map(e => `${e.location}: ${e.error}`).join('\n');
      Alert.alert('Export Failed', `Could not save text file to any location:\n\n${errorMessage}`);
      throw new Error('All save locations failed');
    }
  } catch (error) {
    console.error('[Export] Text export error:', error);
    Alert.alert('Export Error', `Failed to export text: ${error.message}`);
    throw error;
  }
};

// Alternative CSV export method
export const exportJsonToCSV = async (rows, filenamePrefix = 'Animia') => {
  const fileName = `${filenamePrefix}_${new Date().toISOString().replace(/[:.]/g,'-')}.csv`;
  
  if (!rows || rows.length === 0) {
    Alert.alert('No Data', 'No data available to export');
    return;
  }
  
  try {
    // Create completely new data structure to avoid any references
    const safeRows = [];
    
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      console.log('[Export] CSV Headers:', headers);
      
      // Create each row with only primitive values
      rows.forEach((row, index) => {
        const safeRow = {};
        headers.forEach(header => {
          const value = row[header];
          
          // Convert everything to string safely
          if (value === null || value === undefined) {
            safeRow[header] = '';
          } else if (typeof value === 'string') {
            safeRow[header] = value;
          } else if (typeof value === 'number') {
            safeRow[header] = isNaN(value) ? '' : value.toString();
          } else if (typeof value === 'boolean') {
            safeRow[header] = value ? 'Yes' : 'No';
          } else if (Array.isArray(value)) {
            safeRow[header] = value.length > 0 ? value.join(', ') : '';
          } else if (typeof value === 'object') {
            try {
              safeRow[header] = JSON.stringify(value);
            } catch (e) {
              safeRow[header] = '[Object]';
            }
          } else {
            safeRow[header] = String(value);
          }
        });
        safeRows.push(safeRow);
      });
    }
    
    console.log('[Export] CSV Safe rows created:', safeRows.length);
    
    // Create CSV content with safe data
    let csvContent = '';
    
    if (safeRows.length > 0) {
      const headers = Object.keys(safeRows[0]);
      csvContent += headers.join(',') + '\n';
      
      safeRows.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        });
        csvContent += values.join(',') + '\n';
      });
    }
    
    // Save to multiple locations to ensure file is accessible
    const savedPaths = [];
    const errors = [];
    
    // Try multiple locations
    const locations = [
      {
        name: 'Downloads',
        path: RNFS.DownloadDirectoryPath,
        fallback: `${RNFS.ExternalStorageDirectoryPath}/Download`
      },
      {
        name: 'Documents',
        path: RNFS.DocumentDirectoryPath
      },
      {
        name: 'External Storage',
        path: `${RNFS.ExternalStorageDirectoryPath}/Animia`
      }
    ];
    
    for (const location of locations) {
      try {
        let targetPath = location.path;
        
        // Use fallback if primary path is not available
        if (!targetPath && location.fallback) {
          targetPath = location.fallback;
        }
        
        if (targetPath) {
          // Create directory if it doesn't exist
          const dirExists = await RNFS.exists(targetPath);
          if (!dirExists) {
            await RNFS.mkdir(targetPath);
          }
          
          const filePath = `${targetPath}/${fileName}`;
          await RNFS.writeFile(filePath, csvContent, 'utf8');
          
          // Verify file was actually written
          const fileExists = await RNFS.exists(filePath);
          if (fileExists) {
            const stats = await RNFS.stat(filePath);
            if (stats.size > 0) {
              savedPaths.push({ location: location.name, path: filePath });
              console.log(`[Export] Successfully saved to ${location.name}:`, filePath, `Size: ${stats.size} bytes`);
            }
          }
        }
      } catch (error) {
        errors.push({ location: location.name, error: error.message });
        console.warn(`[Export] Failed to save to ${location.name}:`, error);
      }
    }
    
    // Try to copy to accessible location
    if (savedPaths.length > 0) {
      try {
        // Try to copy to a more accessible location
        const accessiblePath = `${RNFS.ExternalStorageDirectoryPath}/Download/Animia_Reports`;
        await RNFS.mkdir(accessiblePath);
        
        const accessibleFilePath = `${accessiblePath}/${fileName}`;
        await RNFS.copyFile(savedPaths[0].path, accessibleFilePath);
        
        const accessibleFileExists = await RNFS.exists(accessibleFilePath);
        if (accessibleFileExists) {
          const stats = await RNFS.stat(accessibleFilePath);
          if (stats.size > 0) {
            savedPaths.push({ location: 'Accessible Downloads', path: accessibleFilePath });
            console.log(`[Export] Successfully copied to accessible location:`, accessibleFilePath, `Size: ${stats.size} bytes`);
          }
        }
      } catch (copyError) {
        console.warn('[Export] Failed to copy to accessible location:', copyError);
      }
    }
    
    // Show results
    if (savedPaths.length > 0) {
      const successMessage = savedPaths.map(p => `${p.location}: ${p.path}`).join('\n\n');
      Alert.alert('Export Successful', `CSV file saved to ${savedPaths.length} location(s):\n\n${successMessage}\n\nYou can find the files in your device's file manager.`);
      return savedPaths[0].path; // Return first successful path
    } else {
      const errorMessage = errors.map(e => `${e.location}: ${e.error}`).join('\n');
      Alert.alert('Export Failed', `Could not save CSV file to any location:\n\n${errorMessage}`);
      throw new Error('All save locations failed');
    }
  } catch (error) {
    console.error('[Export] CSV export error:', error);
    Alert.alert('Export Error', `Failed to export CSV: ${error.message}`);
    throw error;
  }
};

export const exportJsonToXlsx = async (rows, filenamePrefix = 'Animia') => {
  // Skip Excel export completely and use CSV instead
  console.log('[Export] Skipping Excel export, using CSV instead');
  return await exportJsonToCSV(rows, filenamePrefix);
};
