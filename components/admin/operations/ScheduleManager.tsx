import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { Trip, Schedule, Route, Vessel } from '@/types/operations';
import {
  formatTripTime,
  detectTripConflicts,
  generateOptimalSchedule,
  calculateOccupancy,
} from '@/utils/tripUtils';
import { formatCurrency } from '@/utils/routeUtils';
import Button from '@/components/admin/Button';
import SearchBar from '@/components/admin/SearchBar';
import EmptyState from '@/components/admin/EmptyState';
import TripItem from '@/components/admin/TripItem';
import {
  Calendar,
  Clock,
  Ship,
  Users,
  Plus,
  Filter,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Settings,
  RefreshCw,
  Download,
  Upload,
  Zap,
  Grid,
  List,
  MapPin,
  Activity,
} from 'lucide-react-native';

interface ScheduleManagerProps {
  trips: Trip[];
  routes: Route[];
  vessels: Vessel[];
  onCreateTrip?: () => void;
  onEditTrip?: (tripId: string) => void;
  onDeleteTrip?: (tripId: string) => void;
  onBulkSchedule?: () => void;
  onOptimizeSchedule?: () => void;
  onExportSchedule?: () => void;
  onImportSchedule?: () => void;
}

type ViewMode = 'calendar' | 'list' | 'grid';
type FilterStatus = 'all' | 'scheduled' | 'active' | 'completed' | 'cancelled';

const { width: screenWidth } = Dimensions.get('window');

export default function ScheduleManager({
  trips,
  routes,
  vessels,
  onCreateTrip,
  onEditTrip,
  onDeleteTrip,
  onBulkSchedule,
  onOptimizeSchedule,
  onExportSchedule,
  onImportSchedule,
}: ScheduleManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedTrips, setSelectedTrips] = useState<string[]>([]);

  const isTablet = screenWidth >= 768;

  // Filter and search trips
  const filteredTrips = useMemo(() => {
    let filtered = trips;

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(trip => trip.status === filterStatus);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        trip =>
          trip.routeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          trip.vesselName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          trip.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          trip.destination?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [trips, filterStatus, searchQuery]);

  // Group trips by date
  const tripsByDate = useMemo(() => {
    const grouped: { [key: string]: Trip[] } = {};
    filteredTrips.forEach(trip => {
      const dateKey = trip.trip_date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(trip);
    });
    return grouped;
  }, [filteredTrips]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalTrips = filteredTrips.length;
    const scheduledTrips = filteredTrips.filter(
      t => t.status === 'scheduled'
    ).length;
    const activeTrips = filteredTrips.filter(t => t.status === 'active').length;
    const completedTrips = filteredTrips.filter(
      t => t.status === 'completed'
    ).length;
    const totalRevenue = filteredTrips.reduce(
      (sum, trip) => sum + (trip.revenue || 0),
      0
    );
    const averageOccupancy =
      filteredTrips.reduce((sum, trip) => {
        return sum + calculateOccupancy(trip.bookings || 0, trip.capacity || 0);
      }, 0) / totalTrips || 0;

    return {
      totalTrips,
      scheduledTrips,
      activeTrips,
      completedTrips,
      totalRevenue,
      averageOccupancy,
    };
  }, [filteredTrips]);

  // Detect conflicts
  const conflicts = useMemo(() => {
    return detectTripConflicts(filteredTrips);
  }, [filteredTrips]);

  const handleTripPress = (trip: Trip) => {
    onEditTrip?.(trip.id);
  };

  const handleTripSelect = (tripId: string) => {
    setSelectedTrips(prev =>
      prev.includes(tripId)
        ? prev.filter(id => id !== tripId)
        : [...prev, tripId]
    );
  };

  const handleBulkDelete = () => {
    Alert.alert(
      'Delete Trips',
      `Are you sure you want to delete ${selectedTrips.length} selected trips?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            selectedTrips.forEach(onDeleteTrip);
            setSelectedTrips([]);
          },
        },
      ]
    );
  };

  const handleOptimizeSchedule = () => {
    Alert.alert(
      'Optimize Schedule',
      'This will automatically reschedule trips to minimize conflicts and maximize efficiency. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Optimize', onPress: onOptimizeSchedule },
      ]
    );
  };

  const renderCalendarView = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();

    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <Text style={styles.monthText}>
            {today.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.weekDays}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={styles.weekDay}>
              {day}
            </Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {days.map((day, index) => {
            if (!day) return <View key={index} style={styles.emptyDay} />;

            const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTrips = tripsByDate[dateKey] || [];

            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.calendarDay,
                  dayTrips.length > 0 && styles.dayWithTrips,
                  day === today.getDate() && styles.today,
                ]}
                onPress={() => {
                  const newDate = new Date(currentYear, currentMonth, day);
                  setSelectedDate(newDate);
                }}
              >
                <Text
                  style={[
                    styles.dayText,
                    day === today.getDate() && styles.todayText,
                  ]}
                >
                  {day}
                </Text>
                {dayTrips.length > 0 && (
                  <View style={styles.tripIndicator}>
                    <Text style={styles.tripCount}>{dayTrips.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderListView = () => {
    if (filteredTrips.length === 0) {
      return (
        <EmptyState
          icon={<Calendar size={48} color={colors.textSecondary} />}
          title='No trips scheduled'
          message='Create your first trip to get started'
        />
      );
    }

    return (
      <FlatList
        data={filteredTrips}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.tripItemContainer}>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => handleTripSelect(item.id)}
            >
              <View
                style={[
                  styles.checkbox,
                  selectedTrips.includes(item.id) && styles.checkboxSelected,
                ]}
              >
                {selectedTrips.includes(item.id) && (
                  <CheckCircle size={14} color='white' />
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.tripItemContent}>
              <TripItem trip={item} onPress={() => handleTripPress(item)} />
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderGridView = () => {
    return (
      <ScrollView style={styles.gridContainer}>
        <View style={styles.gridContent}>
          {Object.entries(tripsByDate).map(([date, dayTrips]) => (
            <View key={date} style={styles.daySection}>
              <Text style={styles.dayTitle}>
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <View style={styles.dayTrips}>
                {dayTrips.map(trip => (
                  <TouchableOpacity
                    key={trip.id}
                    style={styles.gridTripItem}
                    onPress={() => handleTripPress(trip)}
                  >
                    <Text style={styles.tripTime}>
                      {formatTripTime(trip.departure_time)}
                    </Text>
                    <Text style={styles.tripRoute}>{trip.routeName}</Text>
                    <Text style={styles.tripVessel}>{trip.vesselName}</Text>
                    <View style={styles.tripStats}>
                      <Text style={styles.tripOccupancy}>
                        {trip.bookings || 0}/{trip.capacity || 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Schedule Manager</Text>
          <Text style={styles.subtitle}>
            {stats.totalTrips} trips • {conflicts.length} conflicts
          </Text>
        </View>
        <TouchableOpacity style={styles.createButton} onPress={onCreateTrip}>
          <Plus size={20} color='white' />
          <Text style={styles.createButtonText}>New Trip</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.scheduledTrips}</Text>
          <Text style={styles.statLabel}>Scheduled</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.activeTrips}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {stats.averageOccupancy.toFixed(1)}%
          </Text>
          <Text style={styles.statLabel}>Occupancy</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatCurrency(stats.totalRevenue)}
          </Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder='Search trips...'
            style={styles.searchBar}
          />
        </View>

        <View style={styles.viewControls}>
          <TouchableOpacity
            style={[
              styles.viewButton,
              viewMode === 'calendar' && styles.viewButtonActive,
            ]}
            onPress={() => setViewMode('calendar')}
          >
            <Calendar
              size={16}
              color={
                viewMode === 'calendar' ? colors.primary : colors.textSecondary
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewButton,
              viewMode === 'list' && styles.viewButtonActive,
            ]}
            onPress={() => setViewMode('list')}
          >
            <List
              size={16}
              color={
                viewMode === 'list' ? colors.primary : colors.textSecondary
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewButton,
              viewMode === 'grid' && styles.viewButtonActive,
            ]}
            onPress={() => setViewMode('grid')}
          >
            <Grid
              size={16}
              color={
                viewMode === 'grid' ? colors.primary : colors.textSecondary
              }
            />
          </TouchableOpacity>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleOptimizeSchedule}
          >
            <Zap size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onBulkSchedule}
          >
            <Upload size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onExportSchedule}
          >
            <Download size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <View style={styles.conflictsAlert}>
          <AlertTriangle size={16} color={colors.warning} />
          <Text style={styles.conflictsText}>
            {conflicts.length} schedule conflict
            {conflicts.length > 1 ? 's' : ''} detected
          </Text>
          <TouchableOpacity
            style={styles.resolveButton}
            onPress={handleOptimizeSchedule}
          >
            <Text style={styles.resolveButtonText}>Auto-Resolve</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bulk Actions */}
      {selectedTrips.length > 0 && (
        <View style={styles.bulkActionsBar}>
          <Text style={styles.bulkActionsText}>
            {selectedTrips.length} trip{selectedTrips.length > 1 ? 's' : ''}{' '}
            selected
          </Text>
          <View style={styles.bulkActionsButtons}>
            <Button
              title='Delete'
              variant='danger'
              size='small'
              onPress={handleBulkDelete}
            />
            <Button
              title='Clear'
              variant='ghost'
              size='small'
              onPress={() => setSelectedTrips([])}
            />
          </View>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {viewMode === 'calendar' && renderCalendarView()}
        {viewMode === 'list' && renderListView()}
        {viewMode === 'grid' && renderGridView()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
  },
  searchBar: {
    marginBottom: 0,
  },
  viewControls: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 4,
  },
  viewButton: {
    padding: 8,
    borderRadius: 6,
  },
  viewButtonActive: {
    backgroundColor: colors.primary + '20',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  conflictsAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning + '30',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  conflictsText: {
    flex: 1,
    fontSize: 14,
    color: colors.warning,
  },
  resolveButton: {
    backgroundColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resolveButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  bulkActionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  bulkActionsText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  bulkActionsButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    flex: 1,
  },
  calendarContainer: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginBottom: 4,
    position: 'relative',
  },
  emptyDay: {
    width: '14.28%',
    aspectRatio: 1,
  },
  dayWithTrips: {
    backgroundColor: colors.primary + '10',
  },
  today: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 14,
    color: colors.text,
  },
  todayText: {
    color: 'white',
    fontWeight: '600',
  },
  tripIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripCount: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  tripItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  selectButton: {
    padding: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tripItemContent: {
    flex: 1,
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  gridContent: {
    gap: 16,
  },
  daySection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  dayTrips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridTripItem: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    minWidth: 120,
  },
  tripTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  tripRoute: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 2,
  },
  tripVessel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  tripStats: {
    alignItems: 'flex-end',
  },
  tripOccupancy: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },
});
