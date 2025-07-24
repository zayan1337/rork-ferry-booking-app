import React from "react";
import { TabSelector } from "@/components/admin/common";
import { FilterStatus } from "@/types/admin/dashboard";

interface FilterTabsProps {
    activeFilter: FilterStatus;
    onFilterChange: (filter: FilterStatus) => void;
    getStatusCount: (status: FilterStatus) => number;
}

const filterOptions: { key: FilterStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "reserved", label: "Reserved" },
    { key: "confirmed", label: "Confirmed" },
    { key: "cancelled", label: "Cancelled" },
    { key: "completed", label: "Completed" },
];

export default function FilterTabs({
    activeFilter,
    onFilterChange,
    getStatusCount,
}: FilterTabsProps) {
    const tabOptions = filterOptions.map(option => ({
        ...option,
        count: getStatusCount(option.key),
    }));

    const handleTabChange = (tab: string) => {
        onFilterChange(tab as FilterStatus);
    };

    return (
        <TabSelector
            options={tabOptions}
            activeTab={activeFilter}
            onTabChange={handleTabChange}
            variant="pills"
            showCounts={true}
        />
    );
} 