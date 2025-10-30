import React, { useState, useEffect, useRef } from 'react';
import { Tabs, router } from 'expo-router';
import {
  View,
  Pressable,
  Alert,
  Modal,
  ScrollView,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import {
  UserCheck,
  LogOut,
  Home,
  Ship,
  Settings,
  Bell,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { useCaptainStore } from '@/store/captainStore';
import Card from '@/components/Card';
import { formatTimeAMPM, formatSimpleDate } from '@/utils/dateUtils';

export default function CaptainTabLayout() {
  const { signOut } = useAuthStore();
  const captainStore = useCaptainStore();

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  const spinAnimation = useRef<Animated.CompositeAnimation | null>(null);

  // Get status color for trip status
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'boarding':
        return Colors.warning;
      case 'scheduled':
        return Colors.primary;
      case 'departed':
        return Colors.primary;
      case 'arrived':
        return Colors.success;
      case 'completed':
        return Colors.textSecondary;
      case 'cancelled':
        return Colors.error;
      case 'delayed':
        return Colors.warning;
      default:
        return Colors.textSecondary;
    }
  };

  // Start spinning animation
  const startSpin = () => {
    if (spinAnimation.current) {
      spinAnimation.current.stop();
    }
    spinValue.setValue(0);
    spinAnimation.current = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    spinAnimation.current.start();
  };

  // Stop spinning animation
  const stopSpin = () => {
    if (spinAnimation.current) {
      spinAnimation.current.stop();
      spinAnimation.current = null;
    }
    spinValue.setValue(0);
  };

  // Fetch special assistance notifications
  const loadNotifications = async () => {
    try {
      setLoadingNotifications(true);
      startSpin();
      const data = await captainStore.fetchSpecialAssistanceNotifications();

      // Sort by upcoming first (travelDate + departureTime)
      const getTripSortTime = (n: any): number => {
        const baseDate = new Date(n.travelDate);
        const validBase = isNaN(baseDate.getTime()) ? new Date() : baseDate;
        const dep = n.departureTime;
        if (dep) {
          const depDate = new Date(dep);
          if (!isNaN(depDate.getTime())) return depDate.getTime();
          const m = String(dep).match(/^\s*(\d{1,2}):?(\d{2})\s*(AM|PM)?\s*$/i);
          if (m) {
            let h = parseInt(m[1], 10);
            const min = parseInt(m[2], 10);
            const ampm = m[3];
            if (ampm) {
              if (/PM/i.test(ampm) && h < 12) h += 12;
              if (/AM/i.test(ampm) && h === 12) h = 0;
            }
            const d = new Date(validBase);
            d.setHours(h, min, 0, 0);
            return d.getTime();
          }
        }
        return validBase.getTime();
      };

      const sorted = [...data].sort(
        (a, b) => getTripSortTime(a) - getTripSortTime(b)
      );
      setNotifications(sorted);
      setNotificationCount(sorted.length);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
      setNotificationCount(0);
    } finally {
      setLoadingNotifications(false);
      stopSpin();
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (showNotifications) {
      loadNotifications();
    }
  }, [showNotifications]);

  // Handle trip navigation
  const handleTripPress = (tripId: string) => {
    setShowNotifications(false);
    // router.push(`../trip-details/${tripId}` as any);
    router.push(`/(captain)/trip-details/${tripId}` as any);
  };

  // Header button handlers
  // const handleProfilePress = () => {
  //   router.push('../modal');
  // };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            console.error('Logout error:', error);
          }
        },
      },
    ]);
  };

  const renderHeaderRight = () => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginRight: 12,
      }}
    >
      {/* Notification Bell */}
      <Pressable
        style={styles.notificationButton}
        onPress={() => setShowNotifications(true)}
        accessibilityRole='button'
        accessibilityLabel='Notifications'
      >
        <Bell size={20} color={Colors.text} />
        {notificationCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>{notificationCount}</Text>
          </View>
        )}
      </Pressable>

      <Pressable
        style={{
          padding: 8,
          borderRadius: 8,
          backgroundColor: Colors.card,
        }}
        onPress={handleLogout}
        accessibilityRole='button'
        accessibilityLabel='Logout'
      >
        <LogOut size={20} color={Colors.error} />
      </Pressable>
    </View>
  );

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.inactive,
          tabBarStyle: {
            backgroundColor: Colors.card,
            borderTopColor: Colors.border,
          },
          headerStyle: {
            backgroundColor: Colors.card,
          },
          headerTintColor: Colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerRight: renderHeaderRight,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name='index'
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name='trips'
          options={{
            title: 'My Trips',
            tabBarIcon: ({ color, size }) => <Ship size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name='checkin'
          options={{
            title: 'Check-in',
            tabBarIcon: ({ color, size }) => (
              <UserCheck size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name='profile'
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Settings size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* Notification Modal */}
      <Modal
        visible={showNotifications}
        animationType='slide'
        presentationStyle='pageSheet'
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Special Assistance Notifications
            </Text>
            <View style={styles.modalHeaderActions}>
              <Pressable
                style={styles.refreshButton}
                onPress={loadNotifications}
                disabled={loadingNotifications}
              >
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: spinValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  }}
                >
                  <RefreshCw
                    size={20}
                    color={
                      loadingNotifications
                        ? Colors.textSecondary
                        : Colors.primary
                    }
                  />
                </Animated.View>
              </Pressable>
              <Pressable
                style={styles.closeButton}
                onPress={() => setShowNotifications(false)}
              >
                <X size={24} color={Colors.text} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.notificationList}
            contentContainerStyle={styles.notificationListContent}
          >
            {notifications.length === 0 ? (
              <Card style={styles.emptyCard}>
                <AlertCircle size={48} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>
                  No special assistance notifications
                </Text>
                <Text style={styles.emptySubtext}>
                  You'll see notifications here when passengers require special
                  assistance
                </Text>
              </Card>
            ) : (
              notifications.map((notification, index) => (
                <Pressable
                  key={index}
                  style={styles.notificationCard}
                  onPress={() => handleTripPress(notification.tripId)}
                >
                  <View style={styles.notificationHeader}>
                    <AlertCircle size={16} color={Colors.warning} />
                    <View style={styles.tripInfo}>
                      <Text style={styles.tripTitle}>
                        {notification.tripName}
                      </Text>
                      <View style={styles.tripMeta}>
                        <Text style={styles.tripTime}>
                          {formatSimpleDate(notification.travelDate)} ·{' '}
                          {formatTimeAMPM(notification.departureTime)}
                        </Text>
                        <Text
                          style={[
                            styles.tripStatus,
                            { color: getStatusColor(notification.tripStatus) },
                          ]}
                        >
                          {notification.tripStatus?.toUpperCase() || 'UNKNOWN'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.passengerCount}>
                      {notification.passengers.length} passenger
                      {notification.passengers.length !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  <View style={styles.passengerList}>
                    {notification.passengers
                      .slice(0, 2)
                      .map((passenger: any, pIndex: number) => (
                        <View key={pIndex} style={styles.passengerItem}>
                          <Text style={styles.passengerName}>
                            {passenger.name}
                          </Text>
                          <Text style={styles.passengerAssistance}>
                            {passenger.assistance}
                          </Text>
                          <View style={styles.passengerDetails}>
                            <Text style={styles.passengerDetailText}>
                              Seat {passenger.seatNumber}
                            </Text>
                            <Text style={styles.passengerDetailText}>
                              {passenger.bookingNumber}
                            </Text>
                            {passenger.contactNumber !== 'N/A' && (
                              <Text style={styles.passengerDetailText}>
                                {passenger.contactNumber}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    {notification.passengers.length > 2 && (
                      <Text style={styles.morePassengers}>
                        +{notification.passengers.length - 2} more passengers
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  notificationButton: {
    position: 'relative',
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.card,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    padding: 8,
  },
  notificationList: {
    flex: 1,
  },
  notificationListContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  notificationCard: {
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripInfo: {
    flex: 1,
    marginLeft: 8,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
  },
  tripTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tripStatus: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  passengerCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  passengerList: {
    marginTop: 8,
  },
  passengerItem: {
    marginBottom: 6,
    padding: 8,
    backgroundColor: Colors.background,
    borderRadius: 6,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  passengerAssistance: {
    fontSize: 12,
    color: Colors.warning,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  passengerDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    alignItems: 'flex-start',
  },
  passengerDetailText: {
    fontSize: 10,
    color: Colors.textSecondary,
    backgroundColor: Colors.highlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minHeight: 20,
    textAlign: 'center',
    overflow: 'hidden',
  },
  morePassengers: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
});
