import React, {
  useMemo,
  useRef,
  useEffect,
  useCallback,
  useState,
} from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  Dimensions,
  Text,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import {
  Shield,
  Activity,
  MapPin,
  Globe,
  HelpCircle,
  FileEdit,
  Bell,
} from 'lucide-react-native';
import {
  useSettingsData,
  useSettingsActions,
  useSettingsModals,
} from '@/hooks';
import {
  calculateSettingsStats,
  filterSettingsData,
  getResponsivePadding,
} from '@/utils/settingsUtils';
import SearchBar from '@/components/admin/SearchBar';
import {
  PermissionsTab,
  AlertsTab,
  ActivityTab,
  SystemTab,
  ReportsTab,
  IslandsTab,
  ZonesTab,
  FAQTab,
  ContentTab,
} from '@/components/admin/settings';
import { SystemSettingsModal } from '@/components/admin/settings/modals';
import { SettingsTab } from '@/types/settings';

const { width: screenWidth } = Dimensions.get('window');

export default function SettingsScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const tabScrollRef = useRef<ScrollView>(null);
  const [currentScrollX, setCurrentScrollX] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const {
    alerts,
    activityLogs,
    systemSettings,
    refreshData,
    markAllAlertsAsRead,
    fetchSpecialAssistanceCount,
  } = useAdminStore();

  const {
    canManagePermissions,
    canViewActivityLogs,
    canManageSystemSettings,
    canExportReports,
    canViewAlerts,
  } = useAdminPermissions();

  // Custom hooks for state management
  const {
    refreshing,
    setRefreshing,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    permissionView,
    setPermissionView,
    selectedTimeframe,
    setSelectedTimeframe,
    adminUsers,
    permissionCategories,
    roleTemplates,
    availablePermissions,
  } = useSettingsData();

  // Custom hooks for actions
  const {
    tempSettings,
    setTempSettings,
    handleRefresh,
    handleAlertAction,
    handleExportActivity,
    handleSystemBackup,
    handleSaveSettings,
    handleDeleteRole,
    handleClearCache,
    handleRestartSystem,
    handleHealthCheck,
    handleGenerateReport,
    handleExportLogs,
    exportSystemReport,
  } = useSettingsActions({});

  // System modal state
  const { showSystemModal, setShowSystemModal } = useSettingsModals();

  // Load notification count
  useEffect(() => {
    const loadNotificationCount = async () => {
      const count = await fetchSpecialAssistanceCount();
      setNotificationCount(count);
    };

    loadNotificationCount();

    // Refresh every 5 minutes
    const interval = setInterval(loadNotificationCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle deep link param to open a specific tab (e.g., ?tab=alerts)
  useEffect(() => {
    if (typeof tab === 'string') {
      const t = tab.toLowerCase();
      const validTabs: SettingsTab[] = [
        'permissions',
        'alerts',
        'activity',
        'system',
        'reports',
        'islands',
        'zones',
        'faq',
        'content',
      ];
      if ((validTabs as string[]).includes(t)) {
        setActiveTab(t as SettingsTab);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Calculate statistics - memoized to prevent unnecessary recalculations
  const stats = useMemo(
    () =>
      calculateSettingsStats(
        adminUsers,
        permissionCategories,
        roleTemplates,
        alerts,
        activityLogs,
        selectedTimeframe,
        systemSettings
      ),
    [
      adminUsers,
      permissionCategories,
      roleTemplates,
      alerts,
      activityLogs,
      selectedTimeframe,
      systemSettings,
    ]
  );

  // Filter data based on search and active tab - memoized to prevent unnecessary filtering
  const filteredData = useMemo(
    () =>
      filterSettingsData(
        activeTab,
        searchQuery,
        alerts,
        activityLogs,
        adminUsers
      ),
    [activeTab, searchQuery, alerts, activityLogs, adminUsers]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await handleRefresh();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Memoized tab data to prevent unnecessary re-renders
  const tabsData = useMemo(
    () => [
      {
        key: 'permissions',
        label: 'Permissions',
        icon: Shield,
        category: 'Security',
      },
      {
        key: 'islands',
        label: 'Islands',
        icon: MapPin,
        category: 'Geography',
      },
      {
        key: 'zones',
        label: 'Zones',
        icon: Globe,
        category: 'Geography',
      },
      {
        key: 'faq',
        label: 'FAQ',
        icon: HelpCircle,
        category: 'Content',
      },
      {
        key: 'content',
        label: 'Content',
        icon: FileEdit,
        category: 'Content',
      },
      {
        key: 'alerts',
        label: 'Alerts',
        icon: Bell,
        category: 'Monitoring',
        badge: notificationCount > 0 ? notificationCount : undefined,
      },
      {
        key: 'activity',
        label: 'Activity',
        icon: Activity,
        category: 'Monitoring',
      },
      // {
      //   key: 'reports',
      //   label: 'Reports',
      //   icon: FileText,
      //   category: 'Analytics',
      // },
      // {
      //   key: 'system',
      //   label: 'System',
      //   icon: Settings,
      //   category: 'Administration',
      // },
    ],
    [notificationCount]
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'permissions':
        return <PermissionsTab />;

      case 'alerts':
        return (
          <AlertsTab
            filteredData={filteredData as any[]}
            stats={stats}
            onAlertAction={handleAlertAction}
            onMarkAllAlertsAsRead={markAllAlertsAsRead}
            isActive={activeTab === 'alerts'}
            searchQuery={searchQuery}
          />
        );

      case 'activity':
        return (
          <ActivityTab
            filteredData={filteredData as any[]}
            stats={stats}
            selectedTimeframe={selectedTimeframe}
            setSelectedTimeframe={setSelectedTimeframe}
            onExportActivity={() => handleExportActivity(filteredData as any[])}
            canExportReports={canExportReports()}
          />
        );

      case 'system':
        return (
          <SystemTab
            stats={stats}
            onSystemBackup={handleSystemBackup}
            onClearCache={handleClearCache}
            onRestartSystem={handleRestartSystem}
            onHealthCheck={handleHealthCheck}
            onGenerateReport={handleGenerateReport}
            onExportLogs={handleExportLogs}
            onShowSystemModal={() => setShowSystemModal(true)}
          />
        );

      case 'reports':
        return (
          <ReportsTab
            activityLogs={activityLogs}
            onExportActivityLogs={handleExportActivity}
            onExportSystemReport={exportSystemReport}
          />
        );

      case 'islands':
        return (
          <IslandsTab
            isActive={activeTab === 'islands'}
            searchQuery={searchQuery}
          />
        );

      case 'zones':
        return (
          <ZonesTab searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        );

      case 'faq':
        return (
          <FAQTab isActive={activeTab === 'faq'} searchQuery={searchQuery} />
        );

      case 'content':
        return (
          <ContentTab
            isActive={activeTab === 'content'}
            searchQuery={searchQuery}
          />
        );

      default:
        return null;
    }
  };

  // Tabs that use FlatList internally and should not be wrapped in ScrollView
  const flatListTabs = ['islands', 'zones', 'faq', 'content', 'alerts'];
  const useScrollView = !flatListTabs.includes(activeTab);

  // Optimized scroll to active tab - only when tab changes and user isn't manually scrolling
  const scrollToActiveTab = useCallback(
    (immediate = false) => {
      if (isUserScrolling) return;

      const tabIndex = tabsData.findIndex(tab => tab.key === activeTab);
      if (tabIndex === -1 || !tabScrollRef.current) return;

      const tabWidth = 86; // minWidth (80) + marginHorizontal (6)
      const targetScrollX = Math.max(
        0,
        tabIndex * tabWidth - screenWidth / 2 + tabWidth / 2
      );

      // Only scroll if the target position is significantly different from current
      const scrollDifference = Math.abs(targetScrollX - currentScrollX);
      if (scrollDifference < 50) return; // Don't scroll if tab is already roughly in view

      const scrollAction = () => {
        tabScrollRef.current?.scrollTo({
          x: targetScrollX,
          animated: !immediate,
        });
      };

      if (immediate) {
        scrollAction();
      } else {
        setTimeout(scrollAction, 100);
      }
    },
    [activeTab, tabsData, currentScrollX, isUserScrolling, screenWidth]
  );

  // Only scroll when activeTab changes, not on every re-render
  useEffect(() => {
    scrollToActiveTab();
  }, [activeTab]); // Removed scrollToActiveTab from dependencies to prevent loops

  const TabNavigation = useMemo(
    () => (
      <View style={styles.tabWrapper}>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContainer}
          style={styles.tabScrollView}
          bounces={false}
          decelerationRate='fast'
          onScroll={event => {
            setCurrentScrollX(event.nativeEvent.contentOffset.x);
          }}
          onScrollBeginDrag={() => setIsUserScrolling(true)}
          onScrollEndDrag={() => {
            setTimeout(() => setIsUserScrolling(false), 500);
          }}
          scrollEventThrottle={16}
        >
          {tabsData.map(tab => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.key;
            const hasBadge = typeof tab.badge === 'number' && tab.badge > 0;

            return (
              <Pressable
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.key as SettingsTab)}
              >
                <View style={styles.tabIconContainer}>
                  <IconComponent
                    size={18}
                    color={isActive ? colors.primary : colors.textSecondary}
                  />
                  {hasBadge && tab.badge && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>
                        {tab.badge > 9 ? '9+' : tab.badge.toString()}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}
                >
                  {tab.label}
                </Text>
                {isActive && <View style={styles.tabIndicator} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    ),
    [activeTab, tabsData]
  ); // Only re-render when activeTab changes

  const SearchBarComponent = useMemo(() => {
    const showSearch = [
      'permissions',
      'alerts',
      'activity',
      'islands',
      'zones',
      'faq',
      'content',
    ].includes(activeTab);

    return showSearch ? (
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={`Search ${activeTab}...`}
        />
      </View>
    ) : null;
  }, [activeTab, searchQuery, setSearchQuery]);

  const FixedHeader = useMemo(
    () => (
      <View style={[styles.fixedHeader, getResponsivePadding(screenWidth)]}>
        {TabNavigation}
        {SearchBarComponent}
      </View>
    ),
    [TabNavigation, SearchBarComponent, screenWidth]
  );

  return (
    <>
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Settings',
          }}
        />

        {FixedHeader}

        {useScrollView ? (
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={[
              styles.scrollContentContainer,
              getResponsivePadding(screenWidth),
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {renderTabContent()}
          </ScrollView>
        ) : (
          <View style={styles.flatListContent}>{renderTabContent()}</View>
        )}
      </View>

      {/* Modals */}
      <SystemSettingsModal
        visible={showSystemModal}
        onClose={() => setShowSystemModal(false)}
        tempSettings={tempSettings}
        setTempSettings={setTempSettings}
        onSave={handleSaveSettings}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  fixedHeader: {
    backgroundColor: colors.backgroundSecondary,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.background}20`,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingTop: 16,
  },
  flatListContent: {
    flex: 1,
  },
  tabWrapper: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 16,
    paddingVertical: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    height: 64,
  },
  tabScrollView: {
    flex: 1,
  },
  tabScrollContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    minWidth: screenWidth,
  },
  tab: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
    marginHorizontal: 3,
    position: 'relative',
    minWidth: 80,
    height: 48,
  },
  tabActive: {
    backgroundColor: `${colors.primary}15`,
    transform: [{ scale: 1.05 }],
  },
  tabIconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.card,
  },
  tabBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: 'bold',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 12,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '70%',
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  searchContainer: {
    marginBottom: 8,
  },
});
