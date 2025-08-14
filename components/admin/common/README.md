# Admin Common Components

This directory contains reusable common components that can be used across all admin tabs to maintain consistency and reduce code duplication.

## Components

### 1. **StatsSection**

A reusable stats section that displays multiple StatCards with a header.

```tsx
import { StatsSection } from '@/components/admin/common';

const statItems = [
  {
    title: "Today's Bookings",
    value: '25',
    subtitle: 'MVR 1,250.00 Revenue',
    icon: <CreditCard size={20} color={colors.primary} />,
    trend: 'up',
    trendValue: '12%',
  },
  // ... more stats
];

<StatsSection
  title='Performance Overview'
  subtitle='Key metrics and trends'
  stats={statItems}
  isTablet={true}
  headerSize='large'
/>;
```

### 2. **TabSelector**

A flexible tab selector that supports multiple variants (pills, cards, underline).

```tsx
import { TabSelector } from '@/components/admin/common';

const tabOptions = [
  { key: 'all', label: 'All', count: 25 },
  { key: 'active', label: 'Active', count: 15, icon: CheckCircle },
];

<TabSelector
  options={tabOptions}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  variant='pills'
  showCounts={true}
  showIcons={false}
/>;
```

**Variants:**

- `pills` - Rounded pill-style tabs (good for filters)
- `cards` - Card-style tabs with more padding (good for section navigation)
- `underline` - Simple underlined tabs

### 3. **ActionBar**

A contextual action bar for bulk actions or notifications.

```tsx
import { ActionBar } from '@/components/admin/common';

const actions = [
  { title: 'Confirm', variant: 'primary', onPress: handleConfirm },
  { title: 'Cancel', variant: 'danger', onPress: handleCancel },
  { title: 'Clear', variant: 'ghost', onPress: handleClear },
];

<ActionBar
  message='5 items selected'
  actions={actions}
  variant='primary'
  visible={selectedCount > 0}
/>;
```

**Variants:** `primary`, `warning`, `danger`, `success`, `info`

### 4. **ListSection**

A comprehensive list section with header, search, and content area.

```tsx
import { ListSection } from '@/components/admin/common';

<ListSection
  title='Recent Bookings'
  subtitle='Latest booking activity'
  showSearch={true}
  searchValue={searchQuery}
  onSearchChange={setSearchQuery}
  searchPlaceholder='Search bookings...'
  headerAction={{
    title: 'New Booking',
    icon: <Plus size={16} />,
    onPress: handleNewBooking,
    variant: 'primary',
  }}
  filterInfo={{
    text: 'Showing confirmed bookings',
    onClear: clearFilters,
  }}
  data={bookings}
  renderItem={booking => <BookingItem booking={booking} />}
  keyExtractor={booking => booking.id}
  emptyIcon={<CreditCard size={48} />}
  emptyTitle='No bookings found'
  viewAllAction={{
    text: 'View All Bookings',
    icon: <Eye size={16} />,
    onPress: () => router.push('/bookings'),
  }}
/>;
```

### 5. **SearchFilterBar**

A search bar with filter and action buttons.

```tsx
import { SearchFilterBar } from '@/components/admin/common';

<SearchFilterBar
  searchValue={searchQuery}
  onSearchChange={setSearchQuery}
  searchPlaceholder='Search...'
  filterActions={[
    {
      icon: <Filter size={18} />,
      onPress: () => setShowFilters(true),
    },
    {
      icon: <ArrowUpDown size={18} />,
      onPress: toggleSort,
    },
  ]}
  rightActions={[
    {
      title: 'Export',
      icon: <Download size={18} />,
      onPress: handleExport,
    },
  ]}
/>;
```

### 6. **Selection Controls**

Components for handling item selection with checkboxes.

```tsx
import {
  SelectionCheckbox,
  SelectAllControl,
  SelectionSummary
} from '@/components/admin/common';

// Individual checkbox
<SelectionCheckbox
  selected={isSelected}
  onPress={toggleSelection}
  size="medium"
/>

// Select all control
<SelectAllControl
  totalCount={items.length}
  selectedCount={selectedItems.length}
  onSelectAll={handleSelectAll}
  size="large"
/>

// Selection summary
<SelectionSummary
  selectedCount={selectedItems.length}
  totalCount={items.length}
  itemName="booking"
/>
```

## Benefits

✅ **Consistency** - All tabs use the same components and styling
✅ **Maintainability** - Changes in one place affect all usages
✅ **Reusability** - Components can be easily reused across different screens
✅ **Type Safety** - Strong TypeScript typing throughout
✅ **Flexibility** - Multiple variants and configuration options
✅ **Performance** - Optimized components with proper prop handling

## Migration

The existing tab-specific components have been refactored to use these common components:

- ✅ `DashboardStats` → Uses `StatsSection`
- ✅ `BookingsStats` → Uses `StatsSection`
- ✅ `OperationsStats` → Uses `StatsSection`
- ✅ `FilterTabs` → Uses `TabSelector` (pills variant)
- ✅ `SectionSelector` → Uses `TabSelector` (cards variant)
- ✅ `BulkActionsBar` → Uses `ActionBar`

## Future Enhancements

- Add more variants as needed
- Create compound components for common patterns
- Add animation support
- Create theme variants for different admin sections
