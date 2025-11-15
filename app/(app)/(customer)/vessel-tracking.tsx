import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Linking,
} from 'react-native';
import {
  Ship,
  MapPin,
  Navigation,
  Info,
  Zap,
  Anchor,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { useVesselTracking } from '@/hooks';
import { useAlertContext } from '@/components/AlertProvider';

export default function VesselTrackingScreen() {
  const { showError, showInfo } = useAlertContext();
  const { vessels, isLoading, error, refreshVessels } = useVesselTracking();

  const handleTrackVessel = async (
    registrationNumber: string,
    vesselName: string
  ) => {
    if (!registrationNumber) {
      showInfo(
        'Tracking Unavailable',
        'This vessel does not have a registration number for tracking.'
      );
      return;
    }

    const trackingUrl = `https://m.followme.mv/public/${registrationNumber}`;

    try {
      const supported = await Linking.canOpenURL(trackingUrl);
      if (supported) {
        await Linking.openURL(trackingUrl);
      } else {
        showError(
          'Cannot Open Tracking',
          'Unable to open the vessel tracking system.'
        );
      }
    } catch (error) {
      console.error('Error opening tracking URL:', error);
      showError(
        'Error',
        'An error occurred while trying to open the tracking system.'
      );
    }
  };

  const getVesselTypeIcon = (vesselType: string) => {
    const iconProps = { size: 20, color: Colors.primary };

    switch (vesselType.toLowerCase()) {
      case 'speedboat':
        return <Zap {...iconProps} />;
      case 'luxury':
        return <Anchor {...iconProps} />;
      case 'cargo':
        return <Ship {...iconProps} />;
      default:
        return <Ship {...iconProps} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return Colors.success;
      case 'maintenance':
        return '#f39c12';
      case 'inactive':
        return Colors.textSecondary;
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'maintenance':
        return 'Maintenance';
      case 'inactive':
        return 'Inactive';
      default:
        return 'Unknown';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshVessels}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Info Section */}
      <Card variant='outlined' style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Info size={20} color={Colors.primary} />
          <Text style={styles.infoTitle}>Live Vessel Tracking</Text>
        </View>
        <Text style={styles.infoText}>
          Track our ferry fleet in real-time. Select any vessel below to view
          its current location and status on the tracking system.
        </Text>
      </Card>

      {/* Error State */}
      {error && (
        <Card variant='outlined' style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title='Retry'
            variant='outline'
            size='small'
            onPress={refreshVessels}
            style={styles.retryButton}
          />
        </Card>
      )}

      {/* Vessels Section */}
      {vessels.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Available Vessels</Text>
          {vessels.map(vessel => (
            <Card key={vessel.id} variant='elevated' style={styles.vesselCard}>
              <View style={styles.vesselContent}>
                <View style={styles.vesselMainInfo}>
                  <View style={styles.vesselIcon}>
                    {getVesselTypeIcon(vessel.vessel_type)}
                  </View>
                  <View style={styles.vesselInfo}>
                    <View style={styles.vesselNameRow}>
                      <Text style={styles.vesselName}>{vessel.name}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              getStatusColor(vessel.status) + '20',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(vessel.status) },
                          ]}
                        >
                          {getStatusText(vessel.status)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.vesselType}>
                      {vessel.vessel_type.charAt(0).toUpperCase() +
                        vessel.vessel_type.slice(1)}{' '}
                      • {vessel.seating_capacity} passengers
                    </Text>
                    <View style={styles.vesselMeta}>
                      <View style={styles.metaItem}>
                        <MapPin size={12} color={Colors.textSecondary} />
                        <Text style={styles.metaText}>
                          {vessel.registration_number || 'N/A'}
                        </Text>
                      </View>
                      {vessel.captain_name && (
                        <View style={styles.metaItem}>
                          <Ship size={12} color={Colors.textSecondary} />
                          <Text style={styles.metaText}>
                            {vessel.captain_name}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.trackButton}>
                  <Button
                    title='Track'
                    variant='primary'
                    size='small'
                    onPress={() =>
                      handleTrackVessel(vessel.registration_number, vessel.name)
                    }
                    disabled={!vessel.registration_number}
                    icon={<Navigation size={14} color={Colors.card} />}
                    style={styles.compactButton}
                  />
                </View>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Empty State */}
      {!isLoading && !error && vessels.length === 0 && (
        <Card variant='outlined' style={styles.emptyCard}>
          <Ship size={48} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Vessels Available</Text>
          <Text style={styles.emptyText}>
            There are currently no vessels available for tracking. Please check
            back later.
          </Text>
          <Button
            title='Refresh'
            variant='outline'
            size='small'
            onPress={refreshVessels}
            style={styles.refreshButton}
          />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  infoCard: {
    marginBottom: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  errorCard: {
    marginBottom: 24,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    minWidth: 80,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  vesselCard: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  vesselContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vesselMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vesselIcon: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: Colors.highlight,
    borderRadius: 14,
  },
  vesselInfo: {
    flex: 1,
  },
  vesselNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between',
    marginBottom: 2,
  },
  vesselName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    // flex: 1,
  },
  vesselType: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  vesselMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 2,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  trackButton: {
    marginLeft: 8,
  },
  compactButton: {
    minWidth: 70,
    paddingHorizontal: 8,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  refreshButton: {
    minWidth: 100,
  },
});
