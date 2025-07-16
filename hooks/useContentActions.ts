import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useContentStore } from '@/store/admin/contentStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import {
    IslandFormData,
    ZoneFormData,
    FAQFormData,
    TranslationFormData,
    Island,
    Zone,
    FAQ,
    Translation,
} from '@/types/content';

export const useContentActions = () => {
    const {
        addIsland,
        updateIsland,
        deleteIsland,
        addZone,
        updateZone,
        deleteZone,
        addFAQ,
        updateFAQ,
        deleteFAQ,
        addFAQCategory,
        updateFAQCategory,
        deleteFAQCategory,
        addTranslation,
        updateTranslation,
        deleteTranslation,
        bulkUpdateIslands,
        bulkDeleteIslands,
        bulkUpdateFAQs,
        bulkDeleteFAQs,
        clearSearchQueries,
        clearFilters,
    } = useContentStore();

    const {
        canManageIslands,
        canManageSettings,
        canViewSettings,
    } = useAdminPermissions();

    // Island actions
    const handleAddIsland = useCallback(async (data: IslandFormData) => {
        if (!canManageIslands()) {
            Alert.alert('Permission Denied', 'You do not have permission to create islands.');
            return false;
        }

        try {
            await addIsland(data);
            return true;
        } catch (error) {
            console.error('Error adding island:', error);
            Alert.alert('Error', 'Failed to create island. Please try again.');
            return false;
        }
    }, [addIsland, canManageIslands]);

    const handleUpdateIsland = useCallback(async (id: string, data: Partial<IslandFormData>) => {
        if (!canManageIslands()) {
            Alert.alert('Permission Denied', 'You do not have permission to update islands.');
            return false;
        }

        try {
            await updateIsland(id, data);
            return true;
        } catch (error) {
            console.error('Error updating island:', error);
            Alert.alert('Error', 'Failed to update island. Please try again.');
            return false;
        }
    }, [updateIsland, canManageIslands]);

    const handleDeleteIsland = useCallback(async (id: string, islandName: string) => {
        if (!canManageIslands()) {
            Alert.alert('Permission Denied', 'You do not have permission to delete islands.');
            return false;
        }

        return new Promise<boolean>((resolve) => {
            Alert.alert(
                'Confirm Delete',
                `Are you sure you want to delete "${islandName}"? This action cannot be undone.`,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await deleteIsland(id);
                                resolve(true);
                            } catch (error) {
                                console.error('Error deleting island:', error);
                                Alert.alert('Error', 'Failed to delete island. Please try again.');
                                resolve(false);
                            }
                        },
                    },
                ]
            );
        });
    }, [deleteIsland, canManageIslands]);

    // Zone actions
    const handleAddZone = useCallback(async (data: ZoneFormData) => {
        if (!canManageSettings()) {
            Alert.alert('Permission Denied', 'You do not have permission to create zones.');
            return false;
        }

        try {
            await addZone(data);
            return true;
        } catch (error) {
            console.error('Error adding zone:', error);
            Alert.alert('Error', 'Failed to create zone. Please try again.');
            return false;
        }
    }, [addZone, canManageSettings]);

    const handleUpdateZone = useCallback(async (id: string, data: Partial<ZoneFormData>) => {
        if (!canManageSettings()) {
            Alert.alert('Permission Denied', 'You do not have permission to update zones.');
            return false;
        }

        try {
            await updateZone(id, data);
            return true;
        } catch (error) {
            console.error('Error updating zone:', error);
            Alert.alert('Error', 'Failed to update zone. Please try again.');
            return false;
        }
    }, [updateZone, canManageSettings]);

    const handleDeleteZone = useCallback(async (id: string, zoneName: string) => {
        if (!canManageSettings()) {
            Alert.alert('Permission Denied', 'You do not have permission to delete zones.');
            return false;
        }

        return new Promise<boolean>((resolve) => {
            Alert.alert(
                'Confirm Delete',
                `Are you sure you want to delete "${zoneName}"? This action cannot be undone.`,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await deleteZone(id);
                                resolve(true);
                            } catch (error) {
                                console.error('Error deleting zone:', error);
                                Alert.alert('Error', 'Failed to delete zone. Please try again.');
                                resolve(false);
                            }
                        },
                    },
                ]
            );
        });
    }, [deleteZone, canManageSettings]);

    // FAQ actions
    const handleAddFAQ = useCallback(async (data: FAQFormData) => {
        if (!canManageSettings()) {
            Alert.alert('Permission Denied', 'You do not have permission to create FAQs.');
            return false;
        }

        try {
            await addFAQ(data);
            return true;
        } catch (error) {
            console.error('Error adding FAQ:', error);
            Alert.alert('Error', 'Failed to create FAQ. Please try again.');
            return false;
        }
    }, [addFAQ, canManageSettings]);

    const handleUpdateFAQ = useCallback(async (id: string, data: Partial<FAQFormData>) => {
        if (!canManageSettings()) {
            Alert.alert('Permission Denied', 'You do not have permission to update FAQs.');
            return false;
        }

        try {
            await updateFAQ(id, data);
            return true;
        } catch (error) {
            console.error('Error updating FAQ:', error);
            Alert.alert('Error', 'Failed to update FAQ. Please try again.');
            return false;
        }
    }, [updateFAQ, canManageSettings]);

    const handleDeleteFAQ = useCallback(async (id: string, question: string) => {
        if (!canManageSettings()) {
            Alert.alert('Permission Denied', 'You do not have permission to delete FAQs.');
            return false;
        }

        return new Promise<boolean>((resolve) => {
            Alert.alert(
                'Confirm Delete',
                `Are you sure you want to delete this FAQ: "${question.substring(0, 50)}..."?`,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await deleteFAQ(id);
                                resolve(true);
                            } catch (error) {
                                console.error('Error deleting FAQ:', error);
                                Alert.alert('Error', 'Failed to delete FAQ. Please try again.');
                                resolve(false);
                            }
                        },
                    },
                ]
            );
        });
    }, [deleteFAQ, canManageSettings]);

    // FAQ Category actions
    const handleAddFAQCategory = useCallback(async (data: { name: string; description?: string; order_index: number }) => {
        if (!canManageSettings()) {
            Alert.alert('Permission Denied', 'You do not have permission to create FAQ categories.');
            return false;
        }

        try {
            await addFAQCategory(data);
            return true;
        } catch (error) {
            console.error('Error adding FAQ category:', error);
            Alert.alert('Error', 'Failed to create FAQ category. Please try again.');
            return false;
        }
    }, [addFAQCategory, canManageSettings]);

    const handleUpdateFAQCategory = useCallback(async (id: string, data: Partial<{ name: string; description?: string; order_index: number }>) => {
        if (!canManageSettings()) {
            Alert.alert('Permission Denied', 'You do not have permission to update FAQ categories.');
            return false;
        }

        try {
            await updateFAQCategory(id, data);
            return true;
        } catch (error) {
            console.error('Error updating FAQ category:', error);
            Alert.alert('Error', 'Failed to update FAQ category. Please try again.');
            return false;
        }
    }, [updateFAQCategory, canManageSettings]);

    const handleDeleteFAQCategory = useCallback(async (id: string, categoryName: string) => {
        if (!canManageSettings()) {
            Alert.alert('Permission Denied', 'You do not have permission to delete FAQ categories.');
            return false;
        }

        return new Promise<boolean>((resolve) => {
            Alert.alert(
                'Confirm Delete',
                `Are you sure you want to delete "${categoryName}"? All FAQs in this category will also be deleted.`,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await deleteFAQCategory(id);
                                resolve(true);
                            } catch (error) {
                                console.error('Error deleting FAQ category:', error);
                                Alert.alert('Error', 'Failed to delete FAQ category. Please try again.');
                                resolve(false);
                            }
                        },
                    },
                ]
            );
        });
    }, [deleteFAQCategory, canManageSettings]);

    // Translation actions
    const handleAddTranslation = useCallback(async (data: TranslationFormData) => {
        if (!canManageSettings()) {
            Alert.alert('Permission Denied', 'You do not have permission to create translations.');
            return false;
        }

        try {
            await addTranslation(data);
            return true;
        } catch (error) {
            console.error('Error adding translation:', error);
            Alert.alert('Error', 'Failed to create translation. Please try again.');
            return false;
        }
    }, [addTranslation, canManageSettings]);

    const handleUpdateTranslation = useCallback(async (id: string, data: Partial<TranslationFormData>) => {
        if (!canManageSettings()) {
            Alert.alert('Permission Denied', 'You do not have permission to update translations.');
            return false;
        }

        try {
            await updateTranslation(id, data);
            return true;
        } catch (error) {
            console.error('Error updating translation:', error);
            Alert.alert('Error', 'Failed to update translation. Please try again.');
            return false;
        }
    }, [updateTranslation, canManageSettings]);

    const handleDeleteTranslation = useCallback(async (id: string, translationKey: string) => {
        if (!canManageSettings()) {
            Alert.alert('Permission Denied', 'You do not have permission to delete translations.');
            return false;
        }

        return new Promise<boolean>((resolve) => {
            Alert.alert(
                'Confirm Delete',
                `Are you sure you want to delete translation for "${translationKey}"?`,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await deleteTranslation(id);
                                resolve(true);
                            } catch (error) {
                                console.error('Error deleting translation:', error);
                                Alert.alert('Error', 'Failed to delete translation. Please try again.');
                                resolve(false);
                            }
                        },
                    },
                ]
            );
        });
    }, [deleteTranslation, canManageSettings]);

    // Bulk actions
    const handleBulkUpdateIslands = useCallback(async (updates: { id: string; updates: Partial<Island> }[]) => {
        if (!canManageIslands()) {
            Alert.alert('Permission Denied', 'You do not have permission to update islands.');
            return false;
        }

        try {
            await bulkUpdateIslands(updates);
            return true;
        } catch (error) {
            console.error('Error bulk updating islands:', error);
            Alert.alert('Error', 'Failed to update islands. Please try again.');
            return false;
        }
    }, [bulkUpdateIslands, canManageIslands]);

    const handleBulkDeleteIslands = useCallback(async (ids: string[], count: number) => {
        if (!canManageIslands()) {
            Alert.alert('Permission Denied', 'You do not have permission to delete islands.');
            return false;
        }

        return new Promise<boolean>((resolve) => {
            Alert.alert(
                'Confirm Bulk Delete',
                `Are you sure you want to delete ${count} island(s)? This action cannot be undone.`,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await bulkDeleteIslands(ids);
                                resolve(true);
                            } catch (error) {
                                console.error('Error bulk deleting islands:', error);
                                Alert.alert('Error', 'Failed to delete islands. Please try again.');
                                resolve(false);
                            }
                        },
                    },
                ]
            );
        });
    }, [bulkDeleteIslands, canManageIslands]);

    const handleBulkUpdateFAQs = useCallback(async (updates: { id: string; updates: Partial<FAQ> }[]) => {
        if (!canManageSettings()) {
            Alert.alert('Permission Denied', 'You do not have permission to update FAQs.');
            return false;
        }

        try {
            await bulkUpdateFAQs(updates);
            return true;
        } catch (error) {
            console.error('Error bulk updating FAQs:', error);
            Alert.alert('Error', 'Failed to update FAQs. Please try again.');
            return false;
        }
    }, [bulkUpdateFAQs, canManageSettings]);

    const handleBulkDeleteFAQs = useCallback(async (ids: string[], count: number) => {
        if (!canManageSettings()) {
            Alert.alert('Permission Denied', 'You do not have permission to delete FAQs.');
            return false;
        }

        return new Promise<boolean>((resolve) => {
            Alert.alert(
                'Confirm Bulk Delete',
                `Are you sure you want to delete ${count} FAQ(s)? This action cannot be undone.`,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await bulkDeleteFAQs(ids);
                                resolve(true);
                            } catch (error) {
                                console.error('Error bulk deleting FAQs:', error);
                                Alert.alert('Error', 'Failed to delete FAQs. Please try again.');
                                resolve(false);
                            }
                        },
                    },
                ]
            );
        });
    }, [bulkDeleteFAQs, canManageSettings]);

    // Utility actions
    const handleClearSearchQueries = useCallback(() => {
        clearSearchQueries();
    }, [clearSearchQueries]);

    const handleClearFilters = useCallback(() => {
        clearFilters();
    }, [clearFilters]);

    return {
        // Island actions
        handleAddIsland,
        handleUpdateIsland,
        handleDeleteIsland,

        // Zone actions
        handleAddZone,
        handleUpdateZone,
        handleDeleteZone,

        // FAQ actions
        handleAddFAQ,
        handleUpdateFAQ,
        handleDeleteFAQ,

        // FAQ Category actions
        handleAddFAQCategory,
        handleUpdateFAQCategory,
        handleDeleteFAQCategory,

        // Translation actions
        handleAddTranslation,
        handleUpdateTranslation,
        handleDeleteTranslation,

        // Bulk actions
        handleBulkUpdateIslands,
        handleBulkDeleteIslands,
        handleBulkUpdateFAQs,
        handleBulkDeleteFAQs,

        // Utility actions
        handleClearSearchQueries,
        handleClearFilters,
    };
};

export default useContentActions; 