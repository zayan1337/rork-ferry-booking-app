// Using legacy FileSystem API for compatibility with Expo SDK 54
// Reference: https://docs.expo.dev/versions/v54.0.0/sdk/filesystem/
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { FileType } from '@/components/admin/ExportModal';
import { formatDateInMaldives } from '@/utils/timezoneUtils';

/**
 * Format date for export
 */
export const formatExportDate = (date: Date | string | null): string => {
  if (!date) return '';
  return formatDateInMaldives(date, 'short-date');
};

/**
 * Format timestamp for export
 */
export const formatExportDateTime = (date: Date | string | null): string => {
  if (!date) return '';
  return formatDateInMaldives(date, 'datetime');
};

/**
 * Generate CSV content from data
 */
export const generateCSV = (headers: string[], rows: string[][]): string => {
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const csvHeaders = headers.map(escapeCSV).join(',');
  const csvRows = rows.map(row => row.map(escapeCSV).join(',')).join('\n');

  return `${csvHeaders}\n${csvRows}`;
};

/**
 * Generate simple HTML table for PDF/HTML export
 */
export const generateHTMLTable = (
  title: string,
  headers: string[],
  rows: string[][],
  metadata?: Record<string, string>
): string => {
  const metadataHTML = metadata
    ? `
    <div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
      ${Object.entries(metadata)
        .map(
          ([key, value]) => `
        <div style="margin-bottom: 8px;">
          <strong style="color: #495057;">${key}:</strong>
          <span style="color: #6c757d; margin-left: 8px;">${value}</span>
        </div>
      `
        )
        .join('')}
    </div>
  `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      padding: 30px;
      background-color: #ffffff;
      color: #212529;
    }
    
    .header {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #007bff;
    }
    
    h1 {
      font-size: 28px;
      color: #212529;
      margin-bottom: 8px;
      font-weight: 700;
    }
    
    .generated-date {
      color: #6c757d;
      font-size: 14px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      background-color: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    
    thead {
      background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
    }
    
    th {
      padding: 14px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #e9ecef;
      font-size: 14px;
      color: #495057;
    }
    
    tbody tr:last-child td {
      border-bottom: none;
    }
    
    tbody tr:hover {
      background-color: #f8f9fa;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
      text-align: center;
      color: #6c757d;
      font-size: 12px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      table {
        box-shadow: none;
      }
      
      tbody tr:hover {
        background-color: transparent;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <p class="generated-date">Generated on ${formatDateInMaldives(new Date(), 'datetime')}</p>
  </div>
  
  ${metadataHTML}
  
  <table>
    <thead>
      <tr>
        ${headers.map(header => `<th>${header}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          row => `
        <tr>
          ${row.map(cell => `<td>${cell || '—'}</td>`).join('')}
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Total Records: ${rows.length}</p>
  </div>
</body>
</html>
  `;
};

/**
 * Generate Excel-compatible HTML (can be opened in Excel)
 */
export const generateExcelHTML = (
  title: string,
  headers: string[],
  rows: string[][]
): string => {
  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <style>
    table { border-collapse: collapse; width: 100%; }
    th { background-color: #4472C4; color: white; font-weight: bold; padding: 10px; border: 1px solid #ddd; }
    td { padding: 8px; border: 1px solid #ddd; }
    tr:nth-child(even) { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h2>${title}</h2>
  <p>Generated: ${formatDateInMaldives(new Date(), 'datetime')}</p>
  <table>
    <thead>
      <tr>
        ${headers.map(h => `<th>${h}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${rows.map(row => `<tr>${row.map(cell => `<td>${cell || ''}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>
</body>
</html>
  `;
};

/**
 * Save file to device storage and share
 */
export const saveAndShareFile = async (
  content: string,
  fileName: string,
  mimeType: string
): Promise<void> => {
  try {
    // Save to cache directory
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    // Write file
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();

    if (!isAvailable) {
      // Error will be handled by calling component
      throw new Error('Sharing is not available on this device.');
    }

    // Directly open share sheet - this allows users to save to device storage
    // On Android: User can select Files app or file manager to save
    // On iOS: User can select "Save to Files" to save to device
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: 'Save to device or share',
      UTI: mimeType,
    });
  } catch (error) {
    console.error('Error saving file:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to save file';
    throw new Error(`Export failed: ${errorMessage}`);
  }
};

/**
 * Get MIME type for file type
 */
export const getMimeType = (fileType: FileType): string => {
  switch (fileType) {
    case 'excel':
      return 'application/vnd.ms-excel';
    case 'pdf':
      return 'application/pdf';
    case 'csv':
      return 'text/csv';
    default:
      return 'text/plain';
  }
};

/**
 * Get file extension for file type
 */
export const getFileExtension = (fileType: FileType): string => {
  switch (fileType) {
    case 'excel':
      return 'xls';
    case 'pdf':
      return 'html'; // HTML format that can be printed as PDF
    case 'csv':
      return 'csv';
    default:
      return 'txt';
  }
};

/**
 * Filter data by date range
 */
export const filterByDateRange = <T extends Record<string, any>>(
  data: T[],
  dateField: keyof T,
  dateFrom: Date | null,
  dateTo: Date | null
): T[] => {
  if (!dateFrom && !dateTo) return data;

  return data.filter(item => {
    const itemDate = item[dateField];
    if (!itemDate) return false;

    const date = new Date(itemDate);

    if (dateFrom && date < dateFrom) return false;
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      if (date > endOfDay) return false;
    }

    return true;
  });
};

/**
 * Filter data by roles
 */
export const filterByRoles = <T extends { role?: string }>(
  data: T[],
  selectedRoles: string[]
): T[] => {
  if (selectedRoles.includes('all')) return data;
  return data.filter(item => item.role && selectedRoles.includes(item.role));
};

/**
 * Generate filename with timestamp
 */
export const generateFileName = (
  prefix: string,
  fileType: FileType
): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const extension = getFileExtension(fileType);
  return `${prefix}_${timestamp}.${extension}`;
};
