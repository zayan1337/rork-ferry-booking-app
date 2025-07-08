import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { ChevronDown, ChevronRight, Shield, Users, Calendar, Ship, Map, CreditCard, Settings, MessageSquare, BarChart3 } from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import PermissionCard from './PermissionCard';
import type { PermissionGroupCardProps } from '@/types/permissions';

const PermissionGroupCard: React.FC<PermissionGroupCardProps> = ({
    group,
    grantedPermissions,
    onPermissionToggle,
    isLoading,
    disabled = false,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const getResourceIcon = (resource: string) => {
        const iconProps = { size: 20, color: colors.primary };

        switch (resource) {
            case 'dashboard':
                return <BarChart3 {...iconProps} />;
            case 'users':
                return <Users {...iconProps} />;
            case 'bookings':
                return <Calendar {...iconProps} />;
            case 'schedule':
                return <Calendar {...iconProps} />;
            case 'vessels':
                return <Ship {...iconProps} />;
            case 'routes':
                return <Map {...iconProps} />;
            case 'payments':
                return <CreditCard {...iconProps} />;
            case 'system':
                return <Settings {...iconProps} />;
            case 'communications':
                return <MessageSquare {...iconProps} />;
            case 'reports':
                return <BarChart3 {...iconProps} />;
            default:
                return <Shield {...iconProps} />;
        }
    };

    const getResourceDisplayName = (resource: string) => {
        const nameMap: { [key: string]: string } = {
            dashboard: 'Dashboard & Analytics',
            users: 'User Management',
            bookings: 'Booking Management',
            schedule: 'Schedule & Trips',
            vessels: 'Vessel Management',
            routes: 'Route Management',
            payments: 'Payment Processing',
            system: 'System Administration',
            communications: 'Communications',
            reports: 'Reports & Analytics',
        };
        return nameMap[resource] || resource.charAt(0).toUpperCase() + resource.slice(1);
    };

    const grantedCount = group.permissions.filter(permission =>
        grantedPermissions.some(granted => granted.id === permission.id)
    ).length;

    const totalCount = group.permissions.length;
    const allGranted = grantedCount === totalCount;
    const someGranted = grantedCount > 0;

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    const renderPermissionItem = ({ item: permission }) => (
        <PermissionCard
            permission={permission}
            isGranted={grantedPermissions.some(granted => granted.id === permission.id)}
            isLoading={isLoading}
            onToggle={onPermissionToggle}
            disabled={disabled}
        />
    );

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[
                    styles.header,
                    allGranted && styles.allGrantedHeader,
                    someGranted && !allGranted && styles.partialGrantedHeader,
                ]}
                onPress={toggleExpanded}
                activeOpacity={0.7}
            >
                <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                        {getResourceIcon(group.resource)}
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.resourceTitle}>
                            {getResourceDisplayName(group.resource)}
                        </Text>
                        <Text style={styles.permissionCount}>
                            {grantedCount} of {totalCount} permissions granted
                        </Text>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    <View style={[
                        styles.statusBadge,
                        allGranted && styles.allGrantedBadge,
                        someGranted && !allGranted && styles.partialGrantedBadge,
                    ]}>
                        <Text style={[
                            styles.statusText,
                            allGranted && styles.allGrantedText,
                            someGranted && !allGranted && styles.partialGrantedText,
                        ]}>
                            {allGranted ? 'Full Access' : someGranted ? 'Partial Access' : 'No Access'}
                        </Text>
                    </View>

                    {isExpanded ? (
                        <ChevronDown size={20} color={colors.textSecondary} />
                    ) : (
                        <ChevronRight size={20} color={colors.textSecondary} />
                    )}
                </View>
            </TouchableOpacity>

            {isExpanded && (
                <View style={styles.content}>
                    <FlatList
                        data={group.permissions}
                        renderItem={renderPermissionItem}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={false}
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    },
    allGrantedHeader: {
        backgroundColor: colors.successLight,
        borderBottomColor: colors.success,
    },
    partialGrantedHeader: {
        backgroundColor: colors.warningLight,
        borderBottomColor: colors.warning,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    headerText: {
        flex: 1,
    },
    resourceTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    permissionCount: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: colors.border,
    },
    allGrantedBadge: {
        backgroundColor: colors.success,
    },
    partialGrantedBadge: {
        backgroundColor: colors.warning,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    allGrantedText: {
        color: 'white',
    },
    partialGrantedText: {
        color: 'white',
    },
    content: {
        padding: 16,
        paddingTop: 0,
    },
});

export default PermissionGroupCard; 