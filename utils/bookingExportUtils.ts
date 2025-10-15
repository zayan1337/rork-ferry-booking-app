import { Alert } from 'react-native';
import type { AdminBooking } from '@/types/admin/management';
import type { FileType, ExportFilter } from '@/components/admin/ExportModal';
import {
  generateCSV,
  generateHTMLTable,
  generateExcelHTML,
  saveAndShareFile,
  getMimeType,
  filterByDateRange,
  generateFileName,
  formatExportDate,
  formatExportDateTime,
} from './exportUtils';

/**
 * Filter bookings by status
 */
const filterByStatus = (
  bookings: AdminBooking[],
  selectedRoles: string[]
): AdminBooking[] => {
  if (selectedRoles.includes('all')) return bookings;
  return bookings.filter(
    booking => booking.status && selectedRoles.includes(booking.status)
  );
};

/**
 * Export bookings based on filters
 */
export const exportBookings = async (
  bookings: AdminBooking[],
  filters: ExportFilter
): Promise<void> => {
  try {
    // Filter bookings by date range (using created_at field)
    let filteredBookings = filterByDateRange(
      bookings,
      'created_at',
      filters.dateFrom,
      filters.dateTo
    );

    // Filter by status (using selectedRoles as status filter)
    filteredBookings = filterByStatus(filteredBookings, filters.selectedRoles);

    if (filteredBookings.length === 0) {
      Alert.alert(
        'No Data',
        'No bookings found matching the selected filters.'
      );
      return;
    }

    // Prepare headers
    const headers = [
      'Booking Number',
      'Customer Name',
      'Customer Email',
      'Route',
      'From',
      'To',
      'Travel Date',
      'Departure Time',
      'Passengers',
      'Total Fare',
      'Status',
      'Payment Status',
      'Booking Date',
    ];

    // Map data to rows
    const rows = filteredBookings.map(booking => [
      booking.booking_number || '',
      booking.user_name || '',
      booking.user_email || '',
      booking.route_name || '',
      booking.from_island_name || '',
      booking.to_island_name || '',
      formatExportDate(booking.trip_travel_date ?? null),
      booking.trip_departure_time || '',
      booking.passenger_count?.toString() || '0',
      booking.total_fare ? `$${booking.total_fare.toFixed(2)}` : '$0.00',
      booking.status || '',
      booking.payment_status || '',
      formatExportDateTime(booking.created_at),
    ]);

    // Generate metadata
    const metadata: Record<string, string> = {
      'Total Bookings': filteredBookings.length.toString(),
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
      metadata['Status Filter'] = filters.selectedRoles.join(', ');
    }

    // Calculate total revenue
    const totalRevenue = filteredBookings.reduce(
      (sum, booking) => sum + (booking.total_fare || 0),
      0
    );
    metadata['Total Revenue'] = `$${totalRevenue.toFixed(2)}`;

    // Generate content based on file type
    let content: string;
    let fileName: string;

    switch (filters.fileType) {
      case 'csv':
        content = generateCSV(headers, rows);
        fileName = generateFileName('bookings_export', 'csv');
        break;

      case 'excel':
        content = generateExcelHTML('Bookings Export', headers, rows);
        fileName = generateFileName('bookings_export', 'excel');
        break;

      case 'pdf':
        content = generateHTMLTable('Bookings Export', headers, rows, metadata);
        fileName = generateFileName('bookings_export', 'pdf');
        break;

      default:
        throw new Error('Unsupported file type');
    }

    // Save and share file
    const mimeType = getMimeType(filters.fileType);
    await saveAndShareFile(content, fileName, mimeType);

    Alert.alert(
      'Export Successful',
      `Exported ${filteredBookings.length} booking(s) successfully.`
    );
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};

/**
 * Export booking statistics
 */
export const exportBookingStats = async (
  stats: any,
  fileType: FileType = 'excel'
): Promise<void> => {
  try {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Bookings', stats.total_bookings?.toString() || '0'],
      ['Confirmed Bookings', stats.confirmed_bookings?.toString() || '0'],
      ['Pending Bookings', stats.pending_bookings?.toString() || '0'],
      ['Cancelled Bookings', stats.cancelled_bookings?.toString() || '0'],
      ['Completed Bookings', stats.completed_bookings?.toString() || '0'],
      [
        'Total Revenue',
        stats.total_revenue ? `$${stats.total_revenue.toFixed(2)}` : '$0.00',
      ],
      [
        'Average Booking Value',
        stats.average_booking_value
          ? `$${stats.average_booking_value.toFixed(2)}`
          : '$0.00',
      ],
      ["Today's Bookings", stats.todays_bookings?.toString() || '0'],
    ];

    let content: string;
    const fileName = generateFileName('booking_statistics', fileType);

    switch (fileType) {
      case 'csv':
        content = generateCSV(headers, rows);
        break;

      case 'excel':
        content = generateExcelHTML('Booking Statistics', headers, rows);
        break;

      case 'pdf':
        content = generateHTMLTable('Booking Statistics', headers, rows);
        break;

      default:
        throw new Error('Unsupported file type');
    }

    const mimeType = getMimeType(fileType);
    await saveAndShareFile(content, fileName, mimeType);

    Alert.alert(
      'Export Successful',
      'Booking statistics exported successfully.'
    );
  } catch (error) {
    console.error('Export stats error:', error);
    throw error;
  }
};
