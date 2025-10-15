import { Alert } from 'react-native';
import type { UserProfile } from '@/types/userManagement';
import type { FileType, ExportFilter } from '@/components/admin/ExportModal';
import {
  generateCSV,
  generateHTMLTable,
  generateExcelHTML,
  saveAndShareFile,
  getMimeType,
  filterByDateRange,
  filterByRoles,
  generateFileName,
  formatExportDate,
  formatExportDateTime,
} from './exportUtils';

/**
 * Export users based on filters
 */
export const exportUsers = async (
  users: UserProfile[],
  filters: ExportFilter
): Promise<void> => {
  try {
    // Filter users by date range (using created_at field)
    let filteredUsers = filterByDateRange(
      users,
      'created_at',
      filters.dateFrom,
      filters.dateTo
    );

    // Filter by roles
    filteredUsers = filterByRoles(filteredUsers, filters.selectedRoles);

    if (filteredUsers.length === 0) {
      Alert.alert('No Data', 'No users found matching the selected filters.');
      return;
    }

    // Prepare headers
    const headers = [
      'Name',
      'Email',
      'Mobile',
      'Role',
      'Status',
      'Created Date',
      'Last Login',
      'Wallet Balance',
    ];

    // Prepare rows
    const rows = filteredUsers.map(user => [
      user.name || '',
      user.email || '',
      user.mobile_number || '',
      user.role || '',
      user.status || '',
      formatExportDate(user.created_at ?? null),
      formatExportDateTime(user.last_login ?? null),
      user.wallet_balance ? `$${user.wallet_balance.toFixed(2)}` : '$0.00',
    ]);

    // Generate metadata
    const metadata: Record<string, string> = {
      'Total Users': filteredUsers.length.toString(),
      'Export Date': new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };

    if (filters.dateFrom) {
      metadata['Date From'] = formatExportDate(filters.dateFrom);
    }
    if (filters.dateTo) {
      metadata['Date To'] = formatExportDate(filters.dateTo);
    }
    if (!filters.selectedRoles.includes('all')) {
      metadata['Roles'] = filters.selectedRoles.join(', ');
    }

    // Generate content based on file type
    let content: string;
    let fileName: string;

    switch (filters.fileType) {
      case 'csv':
        content = generateCSV(headers, rows);
        fileName = generateFileName('users_export', 'csv');
        break;

      case 'excel':
        content = generateExcelHTML('Users Export', headers, rows);
        fileName = generateFileName('users_export', 'excel');
        break;

      case 'pdf':
        content = generateHTMLTable('Users Export', headers, rows, metadata);
        fileName = generateFileName('users_export', 'pdf');
        break;

      default:
        throw new Error('Unsupported file type');
    }

    // Save and share file
    const mimeType = getMimeType(filters.fileType);
    await saveAndShareFile(content, fileName, mimeType);

    Alert.alert(
      'Export Successful',
      `Exported ${filteredUsers.length} user(s) successfully.`
    );
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};

/**
 * Export user statistics
 */
export const exportUserStats = async (
  stats: any,
  fileType: FileType = 'excel'
): Promise<void> => {
  try {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Users', stats.total_users?.toString() || '0'],
      ['Active Users', stats.active_users?.toString() || '0'],
      ['Suspended Users', stats.suspended_users?.toString() || '0'],
      ['Admin Count', stats.admin_count?.toString() || '0'],
      ['Agent Count', stats.agent_count?.toString() || '0'],
      ['Customer Count', stats.customer_count?.toString() || '0'],
      ['Passenger Count', stats.passenger_count?.toString() || '0'],
      ['Captain Count', stats.captain_count?.toString() || '0'],
      ['New Users This Month', stats.new_users_this_month?.toString() || '0'],
    ];

    let content: string;
    const fileName = generateFileName('user_statistics', fileType);

    switch (fileType) {
      case 'csv':
        content = generateCSV(headers, rows);
        break;

      case 'excel':
        content = generateExcelHTML('User Statistics', headers, rows);
        break;

      case 'pdf':
        content = generateHTMLTable('User Statistics', headers, rows);
        break;

      default:
        throw new Error('Unsupported file type');
    }

    const mimeType = getMimeType(fileType);
    await saveAndShareFile(content, fileName, mimeType);

    Alert.alert('Export Successful', 'User statistics exported successfully.');
  } catch (error) {
    console.error('Export stats error:', error);
    throw error;
  }
};
