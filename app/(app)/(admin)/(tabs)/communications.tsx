import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import {
  MessageSquare,
  Bell,
  Send,
  Plus,
  Eye,
  AlertTriangle,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
} from 'lucide-react-native';
import SectionHeader from '@/components/admin/SectionHeader';
import Button from '@/components/admin/Button';
import SearchBar from '@/components/admin/SearchBar';

// Communications Components
import { CommunicationStats } from '@/components/admin/communications';

const { width: screenWidth } = Dimensions.get('window');

export default function CommunicationsScreen() {
  const {
    notifications,
    bulkMessages,
    loading,
    refreshData,
    searchQueries,
    setSearchQuery,
    addNotification,
    addBulkMessage,
    sendBulkMessage,
    deleteNotification,
    deleteBulkMessage,
  } = useAdminStore();

  const {
    canViewNotifications,
    canSendNotifications,
    canViewBulkMessages,
    canSendBulkMessages,
  } = useAdminPermissions();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<
    'notifications' | 'bulk_messages' | 'templates'
  >('notifications');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'system' as const,
    priority: 'medium' as const,
    target_users: 'all' as const,
  });
  const [newBulkMessage, setNewBulkMessage] = useState({
    title: '',
    message_content: '',
    target_criteria: { user_roles: ['customer'] },
  });

  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenWidth < 480;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  const handleSendNotification = () => {
    if (!canSendNotifications()) {
      Alert.alert(
        'Access Denied',
        "You don't have permission to send notifications."
      );
      return;
    }

    if (!newNotification.title || !newNotification.message) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    addNotification({
      ...newNotification,
      is_read: false,
      sent_by: 'admin1',
      sent_by_name: 'Admin User',
    });

    setNewNotification({
      title: '',
      message: '',
      type: 'system',
      priority: 'medium',
      target_users: 'all',
    });
    setShowNotificationModal(false);
    Alert.alert('Success', 'Notification sent successfully!');
  };

  const handleSendBulkMessage = () => {
    if (!canSendBulkMessages()) {
      Alert.alert(
        'Access Denied',
        "You don't have permission to send bulk messages."
      );
      return;
    }

    if (!newBulkMessage.title || !newBulkMessage.message_content) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    const messageData = {
      ...newBulkMessage,
      recipient_count: 100, // Mock recipient count
      sent_count: 0,
      failed_count: 0,
      status: 'draft' as const,
      sent_by: 'admin1',
      sent_by_name: 'Admin User',
    };

    addBulkMessage(messageData);

    setNewBulkMessage({
      title: '',
      message_content: '',
      target_criteria: { user_roles: ['customer'] },
    });
    setShowBulkMessageModal(false);
    Alert.alert('Success', 'Bulk message created and queued for sending!');
  };

  const handleDeleteNotification = (id: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteNotification(id),
        },
      ]
    );
  };

  const handleDeleteBulkMessage = (id: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this bulk message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteBulkMessage(id),
        },
      ]
    );
  };

  const getResponsivePadding = () => ({
    paddingHorizontal: isTablet ? 24 : isSmallScreen ? 12 : 16,
    paddingVertical: isTablet ? 20 : 16,
  });

  // Calculate communication statistics
  const unreadNotifications = notifications.filter(n => !n.is_read).length;
  const todayNotifications = notifications.filter(
    n => new Date(n.created_at).toDateString() === new Date().toDateString()
  ).length;
  const activeBulkMessages = bulkMessages.filter(
    m => m.status === 'sending' || m.status === 'sent'
  ).length;
  const totalRecipients = bulkMessages.reduce(
    (sum, m) => sum + m.recipient_count,
    0
  );
  const deliveredMessages = bulkMessages.reduce(
    (sum, m) => sum + m.sent_count,
    0
  );
  const failedMessages = bulkMessages.reduce(
    (sum, m) => sum + m.failed_count,
    0
  );
  const deliveryRate =
    totalRecipients > 0
      ? Math.round((deliveredMessages / totalRecipients) * 100)
      : 0;
  const weeklyNotifications = notifications.filter(
    n =>
      new Date(n.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;
  const emergencyNotifications = notifications.filter(
    n => n.type === 'emergency' || n.priority === 'critical'
  ).length;
  const averageResponseTime = '2.3 min'; // Mock data for average response time
  const engagementRate = '78%'; // Mock engagement rate

  const renderSectionSelector = () => (
    <View style={styles.sectionSelector}>
      {[
        {
          key: 'notifications',
          label: 'Notifications',
          icon: Bell,
          permission: canViewNotifications(),
        },
        {
          key: 'bulk_messages',
          label: 'Bulk Messages',
          icon: MessageSquare,
          permission: canViewBulkMessages(),
        },
        {
          key: 'templates',
          label: 'Templates',
          icon: Edit,
          permission: canSendNotifications(),
        },
      ]
        .filter(section => section.permission)
        .map(section => (
          <TouchableOpacity
            key={section.key}
            style={[
              styles.sectionButton,
              activeSection === section.key && styles.sectionButtonActive,
            ]}
            onPress={() => setActiveSection(section.key as any)}
          >
            <section.icon
              size={16}
              color={
                activeSection === section.key
                  ? colors.primary
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.sectionButtonText,
                activeSection === section.key && styles.sectionButtonTextActive,
              ]}
            >
              {section.label}
            </Text>
          </TouchableOpacity>
        ))}
    </View>
  );

  const renderNotifications = () => {
    if (!canViewNotifications()) {
      return (
        <View style={styles.noPermissionContainer}>
          <AlertTriangle size={48} color={colors.warning} />
          <Text style={styles.noPermissionText}>
            You don't have permission to view notifications.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.sectionContent}>
        <SectionHeader
          title='Notifications Management'
          subtitle={`${unreadNotifications} unread notifications`}
          action={
            canSendNotifications() ? (
              <Button
                title='New Notification'
                onPress={() => setShowNotificationModal(true)}
                size='small'
                variant='outline'
                icon={<Plus size={16} color={colors.primary} />}
              />
            ) : undefined
          }
        />

        <SearchBar
          placeholder='Search notifications...'
          value={searchQueries.notifications || ''}
          onChangeText={text => setSearchQuery('notifications', text)}
        />

        <View style={styles.itemsList}>
          {notifications.slice(0, 10).map(notification => {
            const sentTime = new Date(notification.created_at);
            const timeAgo = Math.floor(
              (Date.now() - sentTime.getTime()) / (1000 * 60)
            );
            const formattedTime =
              timeAgo < 60
                ? `${timeAgo}m ago`
                : timeAgo < 1440
                  ? `${Math.floor(timeAgo / 60)}h ago`
                  : `${Math.floor(timeAgo / 1440)}d ago`;

            // Mock additional data
            const readCount = Math.floor(Math.random() * 500) + 100;
            const deliveryStatus = Math.random() > 0.1 ? 'delivered' : 'failed';
            const estimatedReach =
              notification.target_users === 'all'
                ? 'All Users'
                : notification.target_users === 'customers'
                  ? 'All Customers'
                  : `${Math.floor(Math.random() * 300) + 50} Users`;

            return (
              <View key={notification.id} style={styles.notificationItem}>
                <View style={styles.notificationHeader}>
                  <View style={styles.notificationTypeContainer}>
                    <View
                      style={[
                        styles.notificationTypeIcon,
                        {
                          backgroundColor:
                            notification.type === 'emergency'
                              ? `${colors.danger}20`
                              : notification.type === 'maintenance'
                                ? `${colors.warning}20`
                                : notification.type === 'booking'
                                  ? '#34C759' + '20'
                                  : notification.type === 'payment'
                                    ? '#FF9500' + '20'
                                    : `${colors.primary}20`,
                        },
                      ]}
                    >
                      {notification.type === 'emergency' ? (
                        <AlertTriangle size={16} color={colors.danger} />
                      ) : notification.type === 'maintenance' ? (
                        <Clock size={16} color={colors.warning} />
                      ) : notification.type === 'booking' ? (
                        <CheckCircle size={16} color='#34C759' />
                      ) : notification.type === 'payment' ? (
                        <Users size={16} color='#FF9500' />
                      ) : (
                        <Bell size={16} color={colors.primary} />
                      )}
                    </View>
                    <View style={styles.notificationInfo}>
                      <View
                        style={[
                          styles.priorityBadge,
                          {
                            backgroundColor:
                              notification.priority === 'critical'
                                ? colors.danger
                                : notification.priority === 'high'
                                  ? colors.warning
                                  : notification.priority === 'medium'
                                    ? colors.primary
                                    : colors.textSecondary,
                          },
                        ]}
                      >
                        <Text style={styles.priorityText}>
                          {notification.priority}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.typeBadge,
                          {
                            backgroundColor:
                              notification.type === 'emergency'
                                ? `${colors.danger}20`
                                : notification.type === 'maintenance'
                                  ? `${colors.warning}20`
                                  : `${colors.primary}20`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeText,
                            {
                              color:
                                notification.type === 'emergency'
                                  ? colors.danger
                                  : notification.type === 'maintenance'
                                    ? colors.warning
                                    : colors.primary,
                            },
                          ]}
                        >
                          {notification.type}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.notificationActions}>
                    <View
                      style={[
                        styles.deliveryStatus,
                        {
                          backgroundColor:
                            deliveryStatus === 'delivered'
                              ? '#34C759' + '20'
                              : `${colors.danger}20`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.deliveryStatusText,
                          {
                            color:
                              deliveryStatus === 'delivered'
                                ? '#34C759'
                                : colors.danger,
                          },
                        ]}
                      >
                        {deliveryStatus}
                      </Text>
                    </View>
                    {!notification.is_read && (
                      <View style={styles.unreadIndicator} />
                    )}
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        /* View details */
                      }}
                    >
                      <Eye size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteNotification(notification.id)}
                    >
                      <Trash2 size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.notificationTitle}>
                  {notification.title}
                </Text>
                <Text style={styles.notificationMessage} numberOfLines={2}>
                  {notification.message}
                </Text>

                <View style={styles.notificationMetrics}>
                  <View style={styles.metricItem}>
                    <Users size={14} color={colors.primary} />
                    <Text style={styles.metricText}>
                      Reach: {estimatedReach}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Eye size={14} color='#34C759' />
                    <Text style={styles.metricText}>Read: {readCount}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Clock size={14} color={colors.textSecondary} />
                    <Text style={styles.metricText}>{formattedTime}</Text>
                  </View>
                </View>

                <View style={styles.notificationFooter}>
                  <View style={styles.notificationSenderInfo}>
                    <View style={styles.senderAvatar}>
                      <Text style={styles.senderAvatarText}>
                        {notification.sent_by_name.charAt(0)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.notificationSender}>
                        {notification.sent_by_name}
                      </Text>
                      <Text style={styles.notificationDate}>
                        {sentTime.toLocaleDateString()} at{' '}
                        {sentTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.notificationTarget}>
                    <Text style={styles.targetLabel}>Target:</Text>
                    <Text style={styles.targetValue}>
                      {notification.target_users}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderBulkMessages = () => {
    if (!canViewBulkMessages()) {
      return (
        <View style={styles.noPermissionContainer}>
          <AlertTriangle size={48} color={colors.warning} />
          <Text style={styles.noPermissionText}>
            You don't have permission to view bulk messages.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.sectionContent}>
        <SectionHeader
          title='Bulk Message Campaigns'
          subtitle={`${activeBulkMessages} active campaigns, ${totalRecipients} total recipients reached`}
          action={
            canSendBulkMessages() ? (
              <View style={styles.headerActions}>
                <Button
                  title='Analytics'
                  onPress={() => {
                    /* View campaign analytics */
                  }}
                  size='small'
                  variant='outline'
                  icon={<Eye size={16} color={colors.primary} />}
                />
                <Button
                  title='New Campaign'
                  onPress={() => setShowBulkMessageModal(true)}
                  size='small'
                  variant='primary'
                  icon={<Plus size={16} color='white' />}
                />
              </View>
            ) : undefined
          }
        />

        <SearchBar
          placeholder='Search campaigns by title, content, or status...'
          value={searchQueries.bulkMessages || ''}
          onChangeText={text => setSearchQuery('bulkMessages', text)}
        />

        <View style={styles.compactFilters}>
          {['all', 'draft', 'sending', 'sent', 'failed'].map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.compactFilterChip,
                status === 'all' && styles.compactFilterChipActive,
              ]}
              onPress={() => {
                /* Filter by status */
              }}
            >
              <Text
                style={[
                  styles.compactFilterText,
                  status === 'all' && styles.compactFilterTextActive,
                ]}
              >
                {status === 'all'
                  ? 'All'
                  : status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.itemsList}>
          {bulkMessages.slice(0, 10).map(message => {
            const createdTime = new Date(message.created_at);
            const timeAgo = Math.floor(
              (Date.now() - createdTime.getTime()) / (1000 * 60)
            );
            const formattedTime =
              timeAgo < 60
                ? `${timeAgo}m ago`
                : timeAgo < 1440
                  ? `${Math.floor(timeAgo / 60)}h ago`
                  : `${Math.floor(timeAgo / 1440)}d ago`;

            // Calculate delivery rate and engagement metrics
            const deliveryRate =
              message.recipient_count > 0
                ? Math.round(
                    (message.sent_count / message.recipient_count) * 100
                  )
                : 0;
            const failureRate =
              message.recipient_count > 0
                ? Math.round(
                    (message.failed_count / message.recipient_count) * 100
                  )
                : 0;

            // Mock additional metrics
            const openRate =
              message.status === 'sent'
                ? Math.floor(Math.random() * 40) + 45
                : 0;
            const clickRate =
              message.status === 'sent'
                ? Math.floor(Math.random() * 15) + 8
                : 0;
            const estimatedDeliveryTime =
              message.status === 'sending'
                ? '2-3 min'
                : message.status === 'sent'
                  ? 'Completed'
                  : 'Pending';

            return (
              <View key={message.id} style={styles.bulkMessageItem}>
                <View style={styles.bulkMessageHeader}>
                  <View style={styles.bulkMessageTitleContainer}>
                    <Text style={styles.bulkMessageTitle}>{message.title}</Text>
                    <View style={styles.bulkMessageMeta}>
                      <Text style={styles.bulkMessageId}>
                        #{message.id.slice(-6)}
                      </Text>
                      <Text style={styles.bulkMessageTime}>
                        {formattedTime}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.bulkMessageActions}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            message.status === 'sent'
                              ? '#34C759' + '20'
                              : message.status === 'sending'
                                ? `${colors.warning}20`
                                : message.status === 'failed'
                                  ? `${colors.danger}20`
                                  : `${colors.textSecondary}20`,
                        },
                      ]}
                    >
                      {message.status === 'sent' && (
                        <CheckCircle size={12} color='#34C759' />
                      )}
                      {message.status === 'sending' && (
                        <Clock size={12} color={colors.warning} />
                      )}
                      {message.status === 'failed' && (
                        <XCircle size={12} color={colors.danger} />
                      )}
                      {message.status === 'draft' && (
                        <Edit size={12} color={colors.textSecondary} />
                      )}
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              message.status === 'sent'
                                ? '#34C759'
                                : message.status === 'sending'
                                  ? colors.warning
                                  : message.status === 'failed'
                                    ? colors.danger
                                    : colors.textSecondary,
                          },
                        ]}
                      >
                        {message.status}
                      </Text>
                    </View>
                    {message.status === 'draft' && canSendBulkMessages() && (
                      <TouchableOpacity
                        style={styles.sendButton}
                        onPress={() => sendBulkMessage(message.id)}
                      >
                        <Send size={16} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        /* View analytics */
                      }}
                    >
                      <Eye size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteBulkMessage(message.id)}
                    >
                      <Trash2 size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.bulkMessageContent} numberOfLines={2}>
                  {message.message_content}
                </Text>

                <View style={styles.bulkMessageTargeting}>
                  <Text style={styles.targetingLabel}>Target Audience:</Text>
                  <View style={styles.targetingTags}>
                    {message.target_criteria.user_roles?.map((role, index) => (
                      <View key={index} style={styles.targetingTag}>
                        <Text style={styles.targetingTagText}>{role}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.bulkMessageStats}>
                  <View style={styles.statItem}>
                    <Users size={14} color={colors.primary} />
                    <Text style={styles.statText}>
                      {message.recipient_count} recipients
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <CheckCircle size={14} color='#34C759' />
                    <Text style={styles.statText}>
                      {message.sent_count} sent ({deliveryRate}%)
                    </Text>
                  </View>
                  {message.failed_count > 0 && (
                    <View style={styles.statItem}>
                      <XCircle size={14} color={colors.danger} />
                      <Text style={styles.statText}>
                        {message.failed_count} failed ({failureRate}%)
                      </Text>
                    </View>
                  )}
                </View>

                {message.status === 'sent' && (
                  <View style={styles.engagementMetrics}>
                    <View style={styles.engagementItem}>
                      <Eye size={14} color='#5856D6' />
                      <Text style={styles.engagementText}>
                        Open: {openRate}%
                      </Text>
                    </View>
                    <View style={styles.engagementItem}>
                      <Send size={14} color='#FF9500' />
                      <Text style={styles.engagementText}>
                        Click: {clickRate}%
                      </Text>
                    </View>
                    <View style={styles.engagementItem}>
                      <Clock size={14} color={colors.textSecondary} />
                      <Text style={styles.engagementText}>
                        Delivery: {estimatedDeliveryTime}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.bulkMessageFooter}>
                  <View style={styles.messageSenderInfo}>
                    <View style={styles.senderAvatar}>
                      <Text style={styles.senderAvatarText}>
                        {message.sent_by_name.charAt(0)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.messageSender}>
                        {message.sent_by_name}
                      </Text>
                      <Text style={styles.messageDate}>
                        {createdTime.toLocaleDateString()} at{' '}
                        {createdTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                  {message.status === 'sending' && (
                    <View style={styles.progressIndicator}>
                      <Text style={styles.progressText}>Sending...</Text>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(deliveryRate, 100)}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderTemplates = () => {
    if (!canSendNotifications()) {
      return (
        <View style={styles.noPermissionContainer}>
          <AlertTriangle size={48} color={colors.warning} />
          <Text style={styles.noPermissionText}>
            You don't have permission to manage templates.
          </Text>
        </View>
      );
    }

    const templates = [
      {
        id: '1',
        name: 'Trip Delay Notice',
        content:
          'Due to weather conditions, your trip has been delayed by {delay_time}. We apologize for the inconvenience.',
        category: 'operations',
        usage_count: 45,
        last_used: '2024-01-15',
        variables: ['delay_time', 'trip_id', 'new_departure_time'],
        priority: 'high',
      },
      {
        id: '2',
        name: 'Booking Confirmation',
        content:
          'Your booking {booking_number} has been confirmed for {travel_date}. Thank you for choosing Crystal Transfer Vaavu.',
        category: 'booking',
        usage_count: 238,
        last_used: '2024-01-16',
        variables: ['booking_number', 'travel_date', 'passenger_name'],
        priority: 'medium',
      },
      {
        id: '3',
        name: 'Payment Reminder',
        content:
          'Please complete payment for booking {booking_number} before {due_date}. Payment can be made online or at the terminal.',
        category: 'payment',
        usage_count: 67,
        last_used: '2024-01-14',
        variables: ['booking_number', 'due_date', 'amount_due'],
        priority: 'medium',
      },
      {
        id: '4',
        name: 'System Maintenance',
        content:
          'System maintenance scheduled from {start_time} to {end_time}. Some services may be temporarily unavailable.',
        category: 'system',
        usage_count: 12,
        last_used: '2024-01-10',
        variables: ['start_time', 'end_time', 'affected_services'],
        priority: 'critical',
      },
      {
        id: '5',
        name: 'Weather Alert',
        content:
          'Weather alert: {weather_condition} expected. Trip {trip_id} may be affected. Please check for updates.',
        category: 'emergency',
        usage_count: 23,
        last_used: '2024-01-13',
        variables: ['weather_condition', 'trip_id', 'severity_level'],
        priority: 'critical',
      },
      {
        id: '6',
        name: 'Welcome Message',
        content:
          'Welcome aboard! Your journey from {departure_port} to {arrival_port} will begin shortly.',
        category: 'customer_service',
        usage_count: 156,
        last_used: '2024-01-16',
        variables: ['departure_port', 'arrival_port', 'estimated_duration'],
        priority: 'low',
      },
    ];

    return (
      <View style={styles.sectionContent}>
        <SectionHeader
          title='Message Templates Library'
          subtitle={`${templates.length} templates available across ${[...new Set(templates.map(t => t.category))].length} categories`}
          action={
            <View style={styles.headerActions}>
              <Button
                title='Import'
                onPress={() => {
                  /* Import templates */
                }}
                size='small'
                variant='outline'
                icon={<Users size={16} color={colors.primary} />}
              />
              <Button
                title='New Template'
                onPress={() => {
                  /* Create new template */
                }}
                size='small'
                variant='primary'
                icon={<Plus size={16} color='white' />}
              />
            </View>
          }
        />

        <View style={styles.compactFilters}>
          {['all', ...new Set(templates.map(t => t.category))].map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.compactFilterChip,
                category === 'all' && styles.compactFilterChipActive,
              ]}
              onPress={() => {
                /* Filter templates */
              }}
            >
              <Text
                style={[
                  styles.compactFilterText,
                  category === 'all' && styles.compactFilterTextActive,
                ]}
              >
                {category === 'all' ? 'All' : category.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.itemsList}>
          {templates.map(template => {
            const lastUsedDate = new Date(template.last_used);
            const daysSinceUsed = Math.floor(
              (Date.now() - lastUsedDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            const lastUsedText =
              daysSinceUsed === 0
                ? 'Today'
                : daysSinceUsed === 1
                  ? 'Yesterday'
                  : daysSinceUsed < 7
                    ? `${daysSinceUsed} days ago`
                    : lastUsedDate.toLocaleDateString();

            return (
              <View key={template.id} style={styles.templateItem}>
                <View style={styles.templateHeader}>
                  <View style={styles.templateTitleContainer}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    <View style={styles.templateMeta}>
                      <View
                        style={[
                          styles.templatePriority,
                          {
                            backgroundColor:
                              template.priority === 'critical'
                                ? `${colors.danger}20`
                                : template.priority === 'high'
                                  ? `${colors.warning}20`
                                  : template.priority === 'medium'
                                    ? `${colors.primary}20`
                                    : `${colors.textSecondary}20`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.templatePriorityText,
                            {
                              color:
                                template.priority === 'critical'
                                  ? colors.danger
                                  : template.priority === 'high'
                                    ? colors.warning
                                    : template.priority === 'medium'
                                      ? colors.primary
                                      : colors.textSecondary,
                            },
                          ]}
                        >
                          {template.priority}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.templateCategory,
                          {
                            backgroundColor:
                              template.category === 'emergency'
                                ? `${colors.danger}20`
                                : template.category === 'operations'
                                  ? `${colors.warning}20`
                                  : template.category === 'booking'
                                    ? '#34C759' + '20'
                                    : template.category === 'payment'
                                      ? '#FF9500' + '20'
                                      : `${colors.primary}20`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.templateCategoryText,
                            {
                              color:
                                template.category === 'emergency'
                                  ? colors.danger
                                  : template.category === 'operations'
                                    ? colors.warning
                                    : template.category === 'booking'
                                      ? '#34C759'
                                      : template.category === 'payment'
                                        ? '#FF9500'
                                        : colors.primary,
                            },
                          ]}
                        >
                          {template.category.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <Text style={styles.templateContent} numberOfLines={2}>
                  {template.content}
                </Text>

                <View style={styles.templateVariables}>
                  <Text style={styles.variablesLabel}>Variables:</Text>
                  <View style={styles.variablesList}>
                    {template.variables.slice(0, 3).map((variable, index) => (
                      <View key={index} style={styles.variableTag}>
                        <Text
                          style={styles.variableText}
                        >{`{${variable}}`}</Text>
                      </View>
                    ))}
                    {template.variables.length > 3 && (
                      <Text style={styles.moreVariables}>
                        +{template.variables.length - 3} more
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.templateStats}>
                  <View style={styles.templateStatItem}>
                    <Send size={14} color={colors.primary} />
                    <Text style={styles.templateStatText}>
                      Used {template.usage_count} times
                    </Text>
                  </View>
                  <View style={styles.templateStatItem}>
                    <Clock size={14} color={colors.textSecondary} />
                    <Text style={styles.templateStatText}>
                      Last used: {lastUsedText}
                    </Text>
                  </View>
                </View>

                <View style={styles.templateActions}>
                  <TouchableOpacity style={styles.templateAction}>
                    <Eye size={16} color={colors.primary} />
                    <Text style={styles.templateActionText}>Preview</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.templateAction}>
                    <Edit size={16} color={colors.primary} />
                    <Text style={styles.templateActionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.templateAction}>
                    <Send size={16} color={colors.primary} />
                    <Text style={styles.templateActionText}>Use</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.templateAction}>
                    <Trash2 size={16} color={colors.danger} />
                    <Text
                      style={[
                        styles.templateActionText,
                        { color: colors.danger },
                      ]}
                    >
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'notifications':
        return renderNotifications();
      case 'bulk_messages':
        return renderBulkMessages();
      case 'templates':
        return renderTemplates();
      default:
        return renderNotifications();
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, getResponsivePadding()]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Stack.Screen
        options={{
          title: 'Communications',
        }}
      />

      {/* Communication Stats */}
      <CommunicationStats
        totalNotifications={notifications.length}
        unreadNotifications={unreadNotifications}
        weeklyNotifications={weeklyNotifications}
        bulkMessages={bulkMessages.length}
        activeBulkMessages={activeBulkMessages}
        drafts={bulkMessages.filter(m => m.status === 'draft').length}
        deliveryRate={deliveryRate}
        deliveredMessages={deliveredMessages}
        failedMessages={failedMessages}
        emergencyNotifications={emergencyNotifications}
        averageResponseTime={averageResponseTime}
        engagementRate={engagementRate}
        isTablet={isTablet}
      />

      {/* Section Selector */}
      {renderSectionSelector()}

      {/* Content */}
      {renderContent()}

      {/* Notification Modal */}
      <Modal
        visible={showNotificationModal}
        animationType='slide'
        presentationStyle='pageSheet'
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Notification</Text>
            <TouchableOpacity onPress={() => setShowNotificationModal(false)}>
              <XCircle size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.textInput}
              value={newNotification.title}
              onChangeText={text =>
                setNewNotification(prev => ({ ...prev, title: text }))
              }
              placeholder='Enter notification title'
            />

            <Text style={styles.inputLabel}>Message *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={newNotification.message}
              onChangeText={text =>
                setNewNotification(prev => ({ ...prev, message: text }))
              }
              placeholder='Enter notification message'
              multiline
              numberOfLines={4}
            />

            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.radioGroup}>
              {['system', 'booking', 'payment', 'maintenance', 'emergency'].map(
                type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.radioOption,
                      newNotification.type === type &&
                        styles.radioOptionSelected,
                    ]}
                    onPress={() =>
                      setNewNotification(prev => ({
                        ...prev,
                        type: type as any,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.radioText,
                        newNotification.type === type &&
                          styles.radioTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <Text style={styles.inputLabel}>Priority</Text>
            <View style={styles.radioGroup}>
              {['low', 'medium', 'high', 'critical'].map(priority => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.radioOption,
                    newNotification.priority === priority &&
                      styles.radioOptionSelected,
                  ]}
                  onPress={() =>
                    setNewNotification(prev => ({
                      ...prev,
                      priority: priority as any,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.radioText,
                      newNotification.priority === priority &&
                        styles.radioTextSelected,
                    ]}
                  >
                    {priority}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              title='Cancel'
              onPress={() => setShowNotificationModal(false)}
              variant='outline'
            />
            <Button
              title='Send Notification'
              onPress={handleSendNotification}
              variant='primary'
            />
          </View>
        </View>
      </Modal>

      {/* Bulk Message Modal */}
      <Modal
        visible={showBulkMessageModal}
        animationType='slide'
        presentationStyle='pageSheet'
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Bulk Message</Text>
            <TouchableOpacity onPress={() => setShowBulkMessageModal(false)}>
              <XCircle size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Campaign Title *</Text>
            <TextInput
              style={styles.textInput}
              value={newBulkMessage.title}
              onChangeText={text =>
                setNewBulkMessage(prev => ({ ...prev, title: text }))
              }
              placeholder='Enter campaign title'
            />

            <Text style={styles.inputLabel}>Message Content *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={newBulkMessage.message_content}
              onChangeText={text =>
                setNewBulkMessage(prev => ({ ...prev, message_content: text }))
              }
              placeholder='Enter message content'
              multiline
              numberOfLines={6}
            />

            <Text style={styles.inputLabel}>Target Audience</Text>
            <View style={styles.radioGroup}>
              {['customer', 'agent', 'all'].map(role => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.radioOption,
                    newBulkMessage.target_criteria.user_roles?.includes(role) &&
                      styles.radioOptionSelected,
                  ]}
                  onPress={() =>
                    setNewBulkMessage(prev => ({
                      ...prev,
                      target_criteria: { user_roles: [role] },
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.radioText,
                      newBulkMessage.target_criteria.user_roles?.includes(
                        role
                      ) && styles.radioTextSelected,
                    ]}
                  >
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              title='Cancel'
              onPress={() => setShowBulkMessageModal(false)}
              variant='outline'
            />
            <Button
              title='Create Campaign'
              onPress={handleSendBulkMessage}
              variant='primary'
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    flexGrow: 1,
  },
  sectionSelector: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  sectionButtonActive: {
    backgroundColor: `${colors.primary}15`,
  },
  sectionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  sectionButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  sectionContent: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemsList: {
    gap: 16,
    marginTop: 16,
  },
  notificationItem: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  deliveryStatus: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deliveryStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actionButton: {
    padding: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  deleteButton: {
    padding: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  notificationMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: `${colors.border}50`,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationSenderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  senderAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  senderAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  notificationDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  notificationTarget: {
    alignItems: 'flex-end',
  },
  targetLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  targetValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  notificationSender: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  bulkMessageItem: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bulkMessageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bulkMessageTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  bulkMessageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  bulkMessageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkMessageId: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  bulkMessageTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  bulkMessageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  compactFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  compactFilterText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  compactFilterTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sendButton: {
    padding: 4,
  },
  bulkMessageContent: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  bulkMessageTargeting: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  targetingLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  targetingTags: {
    flexDirection: 'row',
    gap: 6,
  },
  targetingTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: `${colors.primary}20`,
    borderRadius: 12,
  },
  targetingTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  bulkMessageStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  engagementMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginVertical: 8,
    borderTopWidth: 1,
    borderColor: `${colors.border}30`,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  engagementText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bulkMessageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageSenderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageSender: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  messageDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  progressIndicator: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  progressBar: {
    width: 80,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  templateItem: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  templateHeader: {
    marginBottom: 12,
  },
  templateTitleContainer: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templatePriority: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  templatePriorityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  templateCategory: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  templateCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  templateVariables: {
    marginVertical: 12,
  },
  variablesLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
  },
  variablesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  variableTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: `${colors.textSecondary}15`,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  variableText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.textSecondary,
    fontWeight: '500',
  },
  moreVariables: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  templateStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: `${colors.border}30`,
  },
  templateStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  templateStatText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  templateContent: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  templateActions: {
    flexDirection: 'row',
    gap: 16,
  },
  templateAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  templateActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  radioOptionSelected: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  radioText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  radioTextSelected: {
    color: colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 250,
  },
});
