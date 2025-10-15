import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '@/constants/adminColors';
import { AdminBooking } from '@/types/admin/management';
import { Share2, Download, QrCode, Copy, Eye } from 'lucide-react-native';

interface BookingQRCodeProps {
  booking: AdminBooking;
  onShare?: () => void;
  onDownload?: () => void;
}

export default function BookingQRCode({
  booking,
  onShare,
  onDownload,
}: BookingQRCodeProps) {
  const qrCodeValue =
    booking.qr_code_url || `booking:${booking.id}:${booking.booking_number}`;

  const handleCopyQR = () => {
    // In a real app, you would copy the QR code value to clipboard
  };

  const handleViewQR = () => {
    // In a real app, you would show a full-screen QR code
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <QrCode size={20} color={colors.primary} />
          <Text style={styles.title}>QR Code</Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            style={styles.actionButton}
            onPress={handleViewQR}
            accessibilityRole='button'
            accessibilityLabel='View QR code'
          >
            <Eye size={16} color={colors.primary} />
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={handleCopyQR}
            accessibilityRole='button'
            accessibilityLabel='Copy QR code'
          >
            <Copy size={16} color={colors.primary} />
          </Pressable>
          {onShare && (
            <Pressable
              style={styles.actionButton}
              onPress={onShare}
              accessibilityRole='button'
              accessibilityLabel='Share QR code'
            >
              <Share2 size={16} color={colors.primary} />
            </Pressable>
          )}
          {onDownload && (
            <Pressable
              style={styles.actionButton}
              onPress={onDownload}
              accessibilityRole='button'
              accessibilityLabel='Download QR code'
            >
              <Download size={16} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.qrContainer}>
        <View style={styles.qrWrapper}>
          <QRCode
            value={qrCodeValue}
            size={150}
            color={colors.text}
            backgroundColor={colors.card}
          />
        </View>
        <Text style={styles.qrText}>Scan to verify booking</Text>
        <Text style={styles.bookingNumber}>#{booking.booking_number}</Text>

        {/* QR Code Details */}
        <View style={styles.qrDetails}>
          <View style={styles.qrDetailRow}>
            <Text style={styles.qrDetailLabel}>Route:</Text>
            <Text style={styles.qrDetailValue}>
              {booking.from_island_name} → {booking.to_island_name}
            </Text>
          </View>
          <View style={styles.qrDetailRow}>
            <Text style={styles.qrDetailLabel}>Date:</Text>
            <Text style={styles.qrDetailValue}>
              {booking.trip_travel_date
                ? new Date(booking.trip_travel_date).toLocaleDateString()
                : 'N/A'}
            </Text>
          </View>
          <View style={styles.qrDetailRow}>
            <Text style={styles.qrDetailLabel}>Time:</Text>
            <Text style={styles.qrDetailValue}>
              {booking.trip_departure_time || 'N/A'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrWrapper: {
    width: 150,
    height: 150,
    backgroundColor: colors.card,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: `${colors.border}40`,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  qrText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  bookingNumber: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 16,
  },
  qrDetails: {
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  qrDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrDetailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  qrDetailValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
});
