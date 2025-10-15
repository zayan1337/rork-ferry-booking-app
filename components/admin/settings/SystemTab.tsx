import React from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import {
  Server,
  Zap,
  Users,
  Database,
  Wifi,
  HardDrive,
  Shield,
  Lock,
  Eye,
  Key,
  Upload,
  RotateCcw,
  Settings,
  Activity,
  CheckCircle,
  FileText,
  Download,
} from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import { SettingsStats } from '@/types/settings';
import Button from '@/components/admin/Button';
import SectionHeader from '@/components/admin/SectionHeader';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import { styles } from './styles';

const { width: screenWidth } = Dimensions.get('window');

interface SystemTabProps {
  stats: SettingsStats;
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
  onSystemBackup,
  onClearCache,
  onRestartSystem,
  onHealthCheck,
  onGenerateReport,
  onExportLogs,
  onShowSystemModal,
}: SystemTabProps) {
  const isSmallScreen = screenWidth < 480;

  return (
    <View style={styles.tabContent}>
      {/* System Statistics */}
      <View style={styles.statsContainer}>
        <StatCard
          title='System Health'
          value={`${stats.systemHealth}%`}
          icon={<Server size={20} color={colors.success} />}
          trend='up'
          trendValue='Excellent'
        />
        <StatCard
          title='Uptime'
          value='99.9%'
          icon={<Zap size={20} color={colors.success} />}
          trend='up'
          trendValue='30 days'
        />
        <StatCard
          title='Active Sessions'
          value='127'
          icon={<Users size={20} color={colors.secondary} />}
          trend='up'
          trendValue='+15%'
        />
        <StatCard
          title='Last Backup'
          value={stats.lastBackup}
          icon={<Database size={20} color={colors.primary} />}
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
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>All Systems Operational</Text>
          </View>
        </View>

        <View style={styles.statusGrid}>
          <View style={styles.statusCard}>
            <View style={styles.statusCardHeader}>
              <Server size={20} color={colors.success} />
              <Text style={styles.statusCardTitle}>Server Status</Text>
            </View>
            <Text style={styles.statusCardValue}>Online</Text>
            <Text style={styles.statusCardMetric}>Response time: 45ms</Text>
            <View style={styles.statusCardFooter}>
              <StatusBadge status='active' size='small' />
              <Text style={styles.statusCardTime}>Last checked: 30s ago</Text>
            </View>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusCardHeader}>
              <Database size={20} color={colors.success} />
              <Text style={styles.statusCardTitle}>Database</Text>
            </View>
            <Text style={styles.statusCardValue}>Connected</Text>
            <Text style={styles.statusCardMetric}>Query time: 12ms</Text>
            <View style={styles.statusCardFooter}>
              <StatusBadge status='active' size='small' />
              <Text style={styles.statusCardTime}>Active connections: 24</Text>
            </View>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusCardHeader}>
              <Wifi size={20} color={colors.success} />
              <Text style={styles.statusCardTitle}>Network</Text>
            </View>
            <Text style={styles.statusCardValue}>Stable</Text>
            <Text style={styles.statusCardMetric}>Bandwidth: 85 Mbps</Text>
            <View style={styles.statusCardFooter}>
              <StatusBadge status='active' size='small' />
              <Text style={styles.statusCardTime}>Latency: 8ms</Text>
            </View>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusCardHeader}>
              <HardDrive size={20} color={colors.warning} />
              <Text style={styles.statusCardTitle}>Storage</Text>
            </View>
            <Text style={styles.statusCardValue}>78% Used</Text>
            <Text style={styles.statusCardMetric}>2.1GB / 2.7GB</Text>
            <View style={styles.statusCardFooter}>
              <StatusBadge status='inactive' size='small' />
              <Text style={styles.statusCardTime}>Cleanup recommended</Text>
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
            <Shield size={16} color={colors.success} />
            <Text style={styles.securityLabel}>SSL Certificate</Text>
            <Text style={styles.securityStatus}>Valid until Dec 2024</Text>
          </View>
          <View style={styles.securityItem}>
            <Lock size={16} color={colors.success} />
            <Text style={styles.securityLabel}>Firewall</Text>
            <Text style={styles.securityStatus}>Active</Text>
          </View>
          <View style={styles.securityItem}>
            <Eye size={16} color={colors.primary} />
            <Text style={styles.securityLabel}>Login Attempts</Text>
            <Text style={styles.securityStatus}>3 failed today</Text>
          </View>
          <View style={styles.securityItem}>
            <Key size={16} color={colors.success} />
            <Text style={styles.securityLabel}>API Keys</Text>
            <Text style={styles.securityStatus}>4 active</Text>
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
                  Last: {stats.lastBackup}
                </Text>
              </Pressable>

              <Pressable style={styles.enhancedActionCard}>
                <View style={styles.actionCardIcon}>
                  <Upload size={20} color={colors.secondary} />
                </View>
                <Text style={styles.actionCardTitle}>Restore</Text>
                <Text style={styles.actionCardDescription}>
                  Restore from backup
                </Text>
                <Text style={styles.actionCardTime}>Available: 5 backups</Text>
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
                <Text style={styles.actionCardTime}>Cache: 145MB</Text>
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
                <Text style={styles.actionCardTime}>Uptime: 30 days</Text>
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
                <Text style={styles.actionCardTime}>Modified: Today</Text>
              </Pressable>

              <Pressable style={styles.enhancedActionCard}>
                <View style={styles.actionCardIcon}>
                  <Activity size={20} color={colors.success} />
                </View>
                <Text style={styles.actionCardTitle}>Monitoring</Text>
                <Text style={styles.actionCardDescription}>View logs</Text>
                <Text style={styles.actionCardTime}>Real-time</Text>
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
