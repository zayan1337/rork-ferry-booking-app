import React from "react";
import {
    Calendar,
    Ship,
    Route as RouteIcon,
    Activity
} from "lucide-react-native";
import { TabSelector } from "@/components/admin/common";
import { OperationsSection } from "@/types/admin/dashboard";

interface SectionSelectorProps {
    activeSection: OperationsSection;
    onSectionChange: (section: OperationsSection) => void;
    canViewRoutes: boolean;
    canViewTrips: boolean;
    canViewVessels: boolean;
}

export default function SectionSelector({
    activeSection,
    onSectionChange,
    canViewRoutes,
    canViewTrips,
    canViewVessels,
}: SectionSelectorProps) {
    const sections = [
        { key: "routes", label: "Routes", icon: RouteIcon, permission: canViewRoutes },
        { key: "trips", label: "Trips", icon: Calendar, permission: canViewTrips },
        { key: "vessels", label: "Vessels", icon: Ship, permission: canViewVessels },
        { key: "schedule", label: "Schedule", icon: Activity, permission: canViewTrips },
    ].filter(section => section.permission);

    const tabOptions = sections.map(section => ({
        key: section.key,
        label: section.label,
        icon: section.icon,
    }));

    const handleSectionChange = (tab: string) => {
        onSectionChange(tab as OperationsSection);
    };

    return (
        <TabSelector
            options={tabOptions}
            activeTab={activeSection}
            onTabChange={handleSectionChange}
            variant="cards"
            showIcons={true}
        />
    );
} 