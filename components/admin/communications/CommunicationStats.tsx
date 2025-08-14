import React from 'react';
import {
  Bell,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
} from 'lucide-react-native';
import { colors } from '@/constants/adminColors';

// Common Components
import { StatsSection } from '@/components/admin/common';

interface CommunicationStatsProps {
  totalNotifications: number;
  unreadNotifications: number;
  weeklyNotifications: number;
  bulkMessages: number;
  activeBulkMessages: number;
  drafts: number;
  deliveryRate: number;
  deliveredMessages: number;
  failedMessages: number;
  emergencyNotifications: number;
  averageResponseTime: string;
  engagementRate: string;
  isTablet?: boolean;
}

export default function CommunicationStats({
  totalNotifications,
  unreadNotifications,
  weeklyNotifications,
  bulkMessages,
  activeBulkMessages,
  drafts,
  deliveryRate,
  deliveredMessages,
  failedMessages,
  emergencyNotifications,
  averageResponseTime,
  engagementRate,
  isTablet = false,
}: CommunicationStatsProps) {
  const communicationStatsData = [
    {
      title: 'Total Notifications',
      value: totalNotifications.toString(),
      subtitle: `${unreadNotifications} unread, ${weeklyNotifications} this week`,
      trend: weeklyNotifications > 0 ? 'up' : undefined,
      trendValue: weeklyNotifications > 0 ? `+${weeklyNotifications}` : '0',
      icon: <Bell size={isTablet ? 20 : 18} color={colors.primary} />,
    },
    {
      title: 'Bulk Campaigns',
      value: bulkMessages.toString(),
      subtitle: `${activeBulkMessages} active, ${drafts} drafts`,
      trend: activeBulkMessages > 0 ? 'up' : undefined,
      trendValue: activeBulkMessages > 0 ? `+${activeBulkMessages}` : '0',
      icon: (
        <MessageSquare size={isTablet ? 20 : 18} color={colors.secondary} />
      ),
      color: colors.secondary,
    },
    {
      title: 'Delivery Rate',
      value: `${deliveryRate}%`,
      subtitle: `${deliveredMessages} delivered, ${failedMessages} failed`,
      trend:
        deliveryRate >= 90 ? 'up' : deliveryRate >= 70 ? undefined : 'down',
      trendValue:
        deliveryRate >= 90 ? '+5%' : deliveryRate >= 70 ? '+2%' : '-3%',
      icon: <CheckCircle size={isTablet ? 20 : 18} color='#34C759' />,
      color: '#34C759',
    },
    {
      title: 'Emergency Alerts',
      value: emergencyNotifications.toString(),
      subtitle: `${emergencyNotifications > 0 ? 'Active alerts' : 'No active alerts'}`,
      trend: emergencyNotifications > 0 ? 'up' : undefined,
      trendValue:
        emergencyNotifications > 0 ? `+${emergencyNotifications}` : '0',
      icon: <AlertTriangle size={isTablet ? 20 : 18} color='#FF3B30' />,
      color: '#FF3B30',
    },
    {
      title: 'Response Time',
      value: averageResponseTime,
      subtitle: 'average customer response',
      trend: 'down',
      trendValue: '-0.5 min',
      icon: <Clock size={isTablet ? 20 : 18} color='#FF9500' />,
      color: '#FF9500',
    },
    {
      title: 'Engagement Rate',
      value: engagementRate,
      subtitle: 'message open and interaction rate',
      trend: 'up',
      trendValue: '+4%',
      icon: <Eye size={isTablet ? 20 : 18} color='#5856D6' />,
      color: '#5856D6',
    },
  ];

  return (
    <StatsSection
      title='Communications Overview'
      subtitle='Messaging and notification performance metrics'
      stats={communicationStatsData}
      isTablet={isTablet}
      headerSize={isTablet ? 'large' : 'medium'}
    />
  );
}
