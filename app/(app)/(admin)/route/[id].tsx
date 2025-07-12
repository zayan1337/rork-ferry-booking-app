import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import {
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  Users,
  AlertTriangle,
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import StatusBadge from "@/components/admin/StatusBadge";

const { width: screenWidth } = Dimensions.get('window');

export default function RouteDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { routes, loading, deleteRoute } = useAdminStore();
  const { canViewRoutes, canUpdateRoutes, canDeleteRoutes } = useAdminPermissions();
  const [isDeleting, setIsDeleting] = useState(false);

  const isTablet = screenWidth >= 768;

  // Safe find with null check
  const routeData = routes?.find(r => r.id === id);

  const handleEdit = () => {
    if (canUpdateRoutes()) {
      router.push(`/route/${id}/edit` as any);
    } else {
      Alert.alert("Access Denied", "You don't have permission to edit routes.");
    }
  };

  const handleDelete = () => {
    if (!canDeleteRoutes()) {
      Alert.alert("Access Denied", "You don't have permission to delete routes.");
      return;
    }

    Alert.alert(
      "Delete Route",
      `Are you sure you want to delete the route "${routeData?.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              if (id) {
                await deleteRoute(id);
                Alert.alert("Success", "Route deleted successfully.");
                router.back();
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete route.");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (!canViewRoutes()) {
    return (
      <View style={styles.noPermissionContainer}>
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.noPermissionText}>
          You don't have permission to view route details.
        </Text>
      </View>
    );
  }

  if (loading.routes) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading route details...</Text>
      </View>
    );
  }

  if (!routeData) {
    return (
      <View style={styles.notFoundContainer}>
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.notFoundText}>Route not found</Text>
        <Button
          title="Go Back"
          variant="primary"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen
        options={{
          title: routeData.name || "Route Details",
          headerLeft: () => (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              {canUpdateRoutes() && (
                <Button
                  title={isTablet ? "Edit" : ""}
                  variant="outline"
                  size="small"
                  icon={<Edit size={16} color={colors.primary} />}
                  onPress={handleEdit}
                />
              )}
              {canDeleteRoutes() && (
                <Button
                  title={isTablet ? "Delete" : ""}
                  variant="danger"
                  size="small"
                  icon={<Trash2 size={16} color="#FFFFFF" />}
                  onPress={handleDelete}
                  disabled={isDeleting}
                />
              )}
            </View>
          ),
        }}
      />

      {/* Route Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.routeName}>{routeData.name}</Text>
          <Text style={styles.routeDescription}>
            {routeData.origin} → {routeData.destination}
          </Text>
        </View>
        <StatusBadge
          status={routeData.status}
          variant={routeData.status === "active" ? "success" : "secondary"}
        />
      </View>

      {/* Route Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Route Information</Text>
        
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <MapPin size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Origin</Text>
              <Text style={styles.infoValue}>{routeData.origin}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <MapPin size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Destination</Text>
              <Text style={styles.infoValue}>{routeData.destination}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Clock size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Duration</Text>
              <Text style={styles.infoValue}>{routeData.duration || "N/A"}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <DollarSign size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Base Fare</Text>
              <Text style={styles.infoValue}>MVR {routeData.base_fare}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Statistics */}
      {routeData.total_trips_30d && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics (Last 30 Days)</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Calendar size={24} color={colors.primary} />
              <Text style={styles.statValue}>{routeData.total_trips_30d}</Text>
              <Text style={styles.statLabel}>Total Trips</Text>
            </View>

            {routeData.avg_occupancy_30d && (
              <View style={styles.statItem}>
                <Users size={24} color={colors.success} />
                <Text style={styles.statValue}>{routeData.avg_occupancy_30d}%</Text>
                <Text style={styles.statLabel}>Avg Occupancy</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Description */}
      {routeData.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{routeData.description}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    padding: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    flex: 1,
  },
  routeName: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  routeDescription: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 16,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    padding: 32,
    gap: 16,
  },
  notFoundText: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: "center",
  },
  noPermissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    padding: 32,
    gap: 16,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 250,
  },
}); 