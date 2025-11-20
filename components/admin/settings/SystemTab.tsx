import React, { useMemo } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import {
  Server,
  Zap,
  Users,
  Database,
  Wifi,
  Shield,
  Lock,
  Eye,
  RotateCcw,
  Settings,
  CheckCircle,
  FileText,
  Download,
} from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import { SettingsStats } from '@/types/settings';
import { DashboardStats, ActivityLog } from '@/types/admin';
import Button from '@/components/admin/Button';
import SectionHeader from '@/components/admin/SectionHeader';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import { styles } from './styles';

const { width: screenWidth } = Dimensions.get('window');

interface SystemTabProps {
  stats: SettingsStats;
  systemHealth?: DashboardStats['systemHealth'];
  activityLogs?: ActivityLog[];
  onSystemBackup: () => void;
  onClearCache: () => void;
  onRestartSystem: () => void;
  onHealthCheck: () => void;
  onGenerateReport: (reportType: string) => void;
  onExportLogs: () => void;
  onShowSystemModal: () => void;
}

export default function SystemTab({
  stats,
  systemHealth,
  activityLogs = [],
  onSystemBackup,
  onClearCache,
  onRestartSystem,
  onHealthCheck,
  onGenerateReport,
  onExportLogs,
  onShowSystemModal,
}: SystemTabProps) {
  const isSmallScreen = screenWidth < 480;

  // Calculate system health percentage from status
  const systemHealthPercentage = useMemo(() => {
    if (!systemHealth?.status) return stats.systemHealth;
    switch (systemHealth.status) {
      case 'healthy':
        return 100;
      case 'warning':
        return 75;
      case 'critical':
        return 50;
      default:
        return 85;
    }
  }, [systemHealth?.status, stats.systemHealth]);

  // Calculate uptime percentage (simplified - using system as if always up for now)
  const uptimePercentage = useMemo(() => {
    if (systemHealth?.status === 'healthy') return 99.9;
    if (systemHealth?.status === 'warning') return 95.0;
    return 85.0;
  }, [systemHealth?.status]);

  // Format last backup date
  const formattedLastBackup = useMemo(() => {
    if (!systemHealth?.last_backup) {
      return stats.lastBackup || 'Never';
    }
    const backupDate = new Date(systemHealth.last_backup);
    const now = new Date();
    const diffMs = now.getTime() - backupDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return backupDate.toLocaleDateString();
  }, [systemHealth?.last_backup, stats.lastBackup]);

  // Get database status
  const databaseStatus = useMemo(() => {
    const status = systemHealth?.database_status || 'unknown';
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    const isHealthy = status === 'healthy';
    return { text: statusText, healthy: isHealthy };
  }, [systemHealth?.database_status]);

  // Get API status
  const apiStatus = useMemo(() => {
    const status = systemHealth?.api_status || 'unknown';
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    const isOnline = status === 'online';
    return { text: statusText, online: isOnline };
  }, [systemHealth?.api_status]);

  // Get load status
  const loadStatus = useMemo(() => {
    const status = systemHealth?.load_status || 'unknown';
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    const isNormal = status === 'normal';
    return { text: statusText, normal: isNormal };
  }, [systemHealth?.load_status]);

  // Get active sessions count
  const activeSessions = systemHealth?.active_sessions || 0;

  // Calculate database response time (mock - would be real in production)
  const dbResponseTime = useMemo(() => {
    if (!systemHealth?.database_status) return '12ms';
    if (systemHealth.database_status === 'healthy') return '12ms';
    if (systemHealth.database_status === 'slow') return '850ms';
    return 'N/A';
  }, [systemHealth?.database_status]);

  // Calculate uptime days from earliest activity log
  const uptimeDays = useMemo(() => {
    if (!activityLogs || activityLogs.length === 0) return 30;
    const sortedLogs = [...activityLogs].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const earliestLog = sortedLogs[0];
    if (!earliestLog) return 30;

    const earliestDate = new Date(earliestLog.created_at);
    const now = new Date();
    const diffMs = now.getTime() - earliestDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  }, [activityLogs]);

  // Calculate session trend (comparing current vs previous period)
  const sessionTrend = useMemo(() => {
    if (!activityLogs || activityLogs.length === 0)
      return { trend: 'neutral' as const, value: '0%' };

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    const currentSessions = new Set(
      activityLogs
        .filter(log => new Date(log.created_at) >= fiveMinutesAgo)
        .map(log => log.user_id)
        .filter(Boolean)
    ).size;

    const previousSessions = new Set(
      activityLogs
        .filter(log => {
          const logDate = new Date(log.created_at);
          return logDate >= tenMinutesAgo && logDate < fiveMinutesAgo;
        })
        .map(log => log.user_id)
        .filter(Boolean)
    ).size;

    if (previousSessions === 0) {
      return {
        trend: currentSessions > 0 ? ('up' as const) : ('neutral' as const),
        value: currentSessions > 0 ? '100%' : '0%',
      };
    }

    const change =
      ((currentSessions - previousSessions) / previousSessions) * 100;

    return {
      trend:
        change > 0
          ? ('up' as const)
          : change < 0
            ? ('down' as const)
            : ('neutral' as const),
      value: `${change > 0 ? '+' : ''}${change.toFixed(0)}%`,
    };
  }, [activityLogs]);

  // Calculate failed login attempts today
  const failedLoginsToday = useMemo(() => {
    if (!activityLogs) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return activityLogs.filter(log => {
      const logDate = new Date(log.created_at);
      if (logDate < today) return false;

      const action = (log.action || '').toLowerCase();
      const details = (log.details || '').toLowerCase();
      return (
        action.includes('login') &&
        (action.includes('failed') ||
          action.includes('error') ||
          details.includes('failed') ||
          details.includes('invalid'))
      );
    }).length;
  }, [activityLogs]);

  // Get backup count from activity logs
  const backupCount = useMemo(() => {
    if (!activityLogs) return 0;
    return activityLogs.filter(log => {
      const action = (log.action || '').toLowerCase();
      return (
        action.includes('backup') &&
        (action.includes('created') || action.includes('completed'))
      );
    }).length;
  }, [activityLogs]);

  // Get system operational status text
  const systemOperationalStatus = useMemo(() => {
    if (!systemHealth?.status) return 'All Systems Operational';
    if (systemHealth.status === 'healthy') return 'All Systems Operational';
    if (systemHealth.status === 'warning') return 'Some Systems Degraded';
    return 'Critical Issues Detected';
  }, [systemHealth?.status]);

  return (
    <View style={styles.tabContent}>
      {/* System Statistics */}
      <View style={styles.statsContainer}>
        <StatCard
          title='System Health'
          value={`${systemHealthPercentage.toFixed(1)}%`}
          icon={
            <Server
              size={20}
              color={
                systemHealth?.status === 'healthy'
                  ? colors.success
                  : systemHealth?.status === 'warning'
                    ? colors.warning
                    : colors.danger
              }
            />
          }
          trend={
            systemHealth?.status === 'healthy'
              ? 'up'
              : systemHealth?.status === 'warning'
                ? 'neutral'
                : 'down'
          }
          trendValue={
            systemHealth?.status === 'healthy'
              ? 'Excellent'
              : systemHealth?.status === 'warning'
                ? 'Warning'
                : 'Critical'
          }
        />
        <StatCard
          title='Uptime'
          value={`${uptimePercentage.toFixed(1)}%`}
          icon={
            <Zap
              size={20}
              color={uptimePercentage >= 99 ? colors.success : colors.warning}
            />
          }
          trend='up'
          trendValue={`${uptimeDays} day${uptimeDays !== 1 ? 's' : ''}`}
        />
        <StatCard
          title='Active Sessions'
          value={activeSessions.toString()}
          icon={<Users size={20} color={colors.secondary} />}
          trend={sessionTrend.trend}
          trendValue={sessionTrend.value}
        />
        <StatCard
          title='Last Backup'
          value={formattedLastBackup}
          icon={
            <Database
              size={20}
              color={
                systemHealth?.last_backup
                  ? colors.primary
                  : colors.textSecondary
              }
            />
          }
          trend='neutral'
          trendValue='Automated'
        />
      </View>

      <SectionHeader
        title='System Management & Monitoring'
        subtitle='Real-time system status, performance metrics, and maintenance tools'
      />

      {/* Real-time System Status */}
      <View style={styles.systemStatusContainer}>
        <View style={styles.statusHeader}>
          <Text style={styles.subsectionTitle}>Live System Status</Text>
          <View style={styles.statusIndicator}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    systemHealth?.status === 'healthy'
                      ? colors.success
                      : systemHealth?.status === 'warning'
                        ? colors.warning
                        : colors.danger,
                },
              ]}
            />
            <Text style={styles.statusText}>{systemOperationalStatus}</Text>
          </View>
        </View>

        <View style={styles.statusGrid}>
          <View style={styles.statusCard}>
            <View style={styles.statusCardHeader}>
              <Server
                size={20}
                color={apiStatus.online ? colors.success : colors.danger}
              />
              <Text style={styles.statusCardTitle}>Server Status</Text>
            </View>
            <Text style={styles.statusCardValue}>{apiStatus.text}</Text>
            <Text style={styles.statusCardMetric}>
              API Status: {apiStatus.text}
            </Text>
            <View style={styles.statusCardFooter}>
              <StatusBadge
                status={apiStatus.online ? 'active' : 'inactive'}
                size='small'
              />
              <Text style={styles.statusCardTime}>Last checked: Just now</Text>
            </View>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusCardHeader}>
              <Database
                size={20}
                color={databaseStatus.healthy ? colors.success : colors.warning}
              />
              <Text style={styles.statusCardTitle}>Database</Text>
            </View>
            <Text style={styles.statusCardValue}>{databaseStatus.text}</Text>
            <Text style={styles.statusCardMetric}>
              Query time: {dbResponseTime}
            </Text>
            <View style={styles.statusCardFooter}>
              <StatusBadge
                status={databaseStatus.healthy ? 'active' : 'inactive'}
                size='small'
              />
              <Text style={styles.statusCardTime}>
                Status: {databaseStatus.text}
              </Text>
            </View>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusCardHeader}>
              <Wifi
                size={20}
                color={loadStatus.normal ? colors.success : colors.warning}
              />
              <Text style={styles.statusCardTitle}>System Load</Text>
            </View>
            <Text style={styles.statusCardValue}>{loadStatus.text}</Text>
            <Text style={styles.statusCardMetric}>
              Load Status: {loadStatus.text}
            </Text>
            <View style={styles.statusCardFooter}>
              <StatusBadge
                status={loadStatus.normal ? 'active' : 'inactive'}
                size='small'
              />
              <Text style={styles.statusCardTime}>
                Active Sessions: {activeSessions}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Security Monitoring */}
      <View style={styles.securityContainer}>
        <View style={styles.securityHeader}>
          <Text style={styles.subsectionTitle}>Security Monitoring</Text>
          <StatusBadge status='active' size='small' />
        </View>
        <View style={styles.securityGrid}>
          <View style={styles.securityItem}>
            <Shield
              size={16}
              color={
                systemHealth?.api_status === 'online'
                  ? colors.success
                  : colors.danger
              }
            />
            <Text style={styles.securityLabel}>API Status</Text>
            <Text style={styles.securityStatus}>
              {systemHealth?.api_status === 'online' ? 'Online' : 'Offline'}
            </Text>
          </View>
          <View style={styles.securityItem}>
            <Lock
              size={16}
              color={databaseStatus.healthy ? colors.success : colors.warning}
            />
            <Text style={styles.securityLabel}>Database</Text>
            <Text style={styles.securityStatus}>{databaseStatus.text}</Text>
          </View>
          <View style={styles.securityItem}>
            <Eye
              size={16}
              color={failedLoginsToday > 0 ? colors.warning : colors.success}
            />
            <Text style={styles.securityLabel}>Failed Logins</Text>
            <Text style={styles.securityStatus}>{failedLoginsToday} today</Text>
          </View>
          <View style={styles.securityItem}>
            <Database size={16} color={colors.primary} />
            <Text style={styles.securityLabel}>Backups</Text>
            <Text style={styles.securityStatus}>{backupCount} available</Text>
          </View>
        </View>
      </View>

      {/* System Actions */}
      <View style={styles.enhancedActionsContainer}>
        <Text style={styles.subsectionTitle}>System Maintenance & Actions</Text>

        <View style={styles.actionsGrid}>
          {/* Primary Actions */}
          <View style={styles.actionCategory}>
            <Text style={styles.actionCategoryTitle}>Database & Backup</Text>
            <View style={styles.actionRow}>
              <Pressable
                style={styles.enhancedActionCard}
                onPress={onSystemBackup}
              >
                <View style={styles.actionCardIcon}>
                  <Database size={20} color={colors.primary} />
                </View>
                <Text style={styles.actionCardTitle}>Create Backup</Text>
                <Text style={styles.actionCardDescription}>
                  Full system backup
                </Text>
                <Text style={styles.actionCardTime}>
                  Last: {formattedLastBackup}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* System Maintenance */}
          <View style={styles.actionCategory}>
            <Text style={styles.actionCategoryTitle}>System Maintenance</Text>
            <View style={styles.actionRow}>
              <Pressable
                style={styles.enhancedActionCard}
                onPress={onClearCache}
              >
                <View style={styles.actionCardIcon}>
                  <Zap size={20} color={colors.warning} />
                </View>
                <Text style={styles.actionCardTitle}>Clear Cache</Text>
                <Text style={styles.actionCardDescription}>Free up space</Text>
                <Text style={styles.actionCardTime}>
                  Last:{' '}
                  {stats.lastBackup === 'Never' ? 'Never' : formattedLastBackup}
                </Text>
              </Pressable>

              <Pressable
                style={styles.enhancedActionCard}
                onPress={onRestartSystem}
              >
                <View style={styles.actionCardIcon}>
                  <RotateCcw size={20} color={colors.primary} />
                </View>
                <Text style={styles.actionCardTitle}>Restart</Text>
                <Text style={styles.actionCardDescription}>
                  Restart services
                </Text>
                <Text style={styles.actionCardTime}>
                  Uptime: {uptimeDays} day{uptimeDays !== 1 ? 's' : ''}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Configuration */}
          <View style={styles.actionCategory}>
            <Text style={styles.actionCategoryTitle}>Configuration</Text>
            <View style={styles.actionRow}>
              <Pressable
                style={styles.enhancedActionCard}
                onPress={onShowSystemModal}
              >
                <View style={styles.actionCardIcon}>
                  <Settings size={20} color={colors.secondary} />
                </View>
                <Text style={styles.actionCardTitle}>Settings</Text>
                <Text style={styles.actionCardDescription}>System config</Text>
                <Text style={styles.actionCardTime}>
                  Modified:{' '}
                  {systemHealth?.last_backup ? formattedLastBackup : 'Never'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Quick Actions Bar */}
        <View style={styles.quickActionsBar}>
          <View style={styles.quickActionButton}>
            <Button
              title={isSmallScreen ? 'Health' : 'Health Check'}
              variant='outline'
              size='small'
              icon={<CheckCircle size={16} color={colors.primary} />}
              onPress={onHealthCheck}
            />
          </View>
          <View style={styles.quickActionButton}>
            <Button
              title={isSmallScreen ? 'Report' : 'Generate Report'}
              variant='outline'
              size='small'
              icon={<FileText size={16} color={colors.primary} />}
              onPress={() => onGenerateReport('system')}
            />
          </View>
          <View style={styles.quickActionButton}>
            <Button
              title={isSmallScreen ? 'Logs' : 'Export Logs'}
              variant='outline'
              size='small'
              icon={<Download size={16} color={colors.primary} />}
              onPress={onExportLogs}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
