import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContentData } from '@/hooks';
import { useContentActions } from '@/hooks';
import { Promotion, PromotionFormData, Announcement, AnnouncementFormData } from '@/types/content';
import { getResponsiveLayout, validateRequired } from '@/utils/contentUtils';
import { useWindowDimensions } from 'react-native';
import { colors } from '@/constants/adminColors';
import StatCard from '../StatCard';
import Button from '../Button';
import SearchBar from '../SearchBar';
import EmptyState from '../EmptyState';
import LoadingSpinner from '../LoadingSpinner';
import DatePicker from '@/components/DatePicker';

interface ContentTabProps {
    isActive: boolean;
}

const ContentTab: React.FC<ContentTabProps> = ({ isActive }) => {
    const dimensions = useWindowDimensions();
    const layout = getResponsiveLayout(dimensions.width);
    const { promotions, announcements, contentStats, searchPromotions, searchAnnouncements, loading } = useContentData();
    const { createPromotion, updatePromotion, deletePromotion, createAnnouncement, updateAnnouncement, deleteAnnouncement } = useContentActions();

    const [activeSection, setActiveSection] = useState<'promotions' | 'announcements' | 'terms'>('promotions');
    const [searchQuery, setSearchQuery] = useState('');
    const [showPromotionForm, setShowPromotionForm] = useState(false);
    const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
    const [showTermsEditor, setShowTermsEditor] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

    // Form states
    const [promotionForm, setPromotionForm] = useState<PromotionFormData>({
        name: '',
        description: '',
        discountPercentage: 0,
        startDate: new Date(),
        endDate: new Date(),
        isFirstTimeBookingOnly: false,
        isActive: true,
    });

    const [announcementForm, setAnnouncementForm] = useState<AnnouncementFormData>({
        title: '',
        content: '',
        type: 'general',
        priority: 'medium',
        isActive: true,
        startDate: new Date(),
        endDate: new Date(),
    });

    const [termsContent, setTermsContent] = useState('');

    // Filter data based on search
    const filteredPromotions = searchPromotions(searchQuery);
    const filteredAnnouncements = searchAnnouncements(searchQuery);

    // Reset forms when modals close
    useEffect(() => {
        if (!showPromotionForm) {
            setPromotionForm({
                name: '',
                description: '',
                discountPercentage: 0,
                startDate: new Date(),
                endDate: new Date(),
                isFirstTimeBookingOnly: false,
                isActive: true,
            });
            setEditingPromotion(null);
        }
    }, [showPromotionForm]);

    useEffect(() => {
        if (!showAnnouncementForm) {
            setAnnouncementForm({
                title: '',
                content: '',
                type: 'general',
                priority: 'medium',
                isActive: true,
                startDate: new Date(),
                endDate: new Date(),
            });
            setEditingAnnouncement(null);
        }
    }, [showAnnouncementForm]);

    // Load editing data
    useEffect(() => {
        if (editingPromotion) {
            setPromotionForm({
                name: editingPromotion.name,
                description: editingPromotion.description || '',
                discountPercentage: editingPromotion.discountPercentage,
                startDate: editingPromotion.startDate,
                endDate: editingPromotion.endDate,
                isFirstTimeBookingOnly: editingPromotion.isFirstTimeBookingOnly,
                isActive: editingPromotion.isActive,
            });
            setShowPromotionForm(true);
        }
    }, [editingPromotion]);

    useEffect(() => {
        if (editingAnnouncement) {
            setAnnouncementForm({
                title: editingAnnouncement.title,
                content: editingAnnouncement.content,
                type: editingAnnouncement.type,
                priority: editingAnnouncement.priority,
                isActive: editingAnnouncement.isActive,
                startDate: editingAnnouncement.startDate,
                endDate: editingAnnouncement.endDate,
            });
            setShowAnnouncementForm(true);
        }
    }, [editingAnnouncement]);

    const handleCreatePromotion = async () => {
        const validation = validateRequired(promotionForm, ['name', 'discountPercentage']);
        if (!validation.isValid) {
            Alert.alert('Error', validation.message);
            return;
        }

        if (promotionForm.discountPercentage < 0 || promotionForm.discountPercentage > 100) {
            Alert.alert('Error', 'Discount percentage must be between 0 and 100');
            return;
        }

        if (promotionForm.startDate >= promotionForm.endDate) {
            Alert.alert('Error', 'End date must be after start date');
            return;
        }

        const success = await createPromotion(promotionForm);
        if (success) {
            setShowPromotionForm(false);
        }
    };

    const handleUpdatePromotion = async () => {
        if (!editingPromotion) return;

        const validation = validateRequired(promotionForm, ['name', 'discountPercentage']);
        if (!validation.isValid) {
            Alert.alert('Error', validation.message);
            return;
        }

        if (promotionForm.discountPercentage < 0 || promotionForm.discountPercentage > 100) {
            Alert.alert('Error', 'Discount percentage must be between 0 and 100');
            return;
        }

        if (promotionForm.startDate >= promotionForm.endDate) {
            Alert.alert('Error', 'End date must be after start date');
            return;
        }

        const success = await updatePromotion(editingPromotion.id, promotionForm);
        if (success) {
            setShowPromotionForm(false);
        }
    };

    const handleDeletePromotion = async (promotion: Promotion) => {
        Alert.alert(
            'Delete Promotion',
            `Are you sure you want to delete "${promotion.name}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deletePromotion(promotion.id)
                }
            ]
        );
    };

    const handleCreateAnnouncement = async () => {
        const validation = validateRequired(announcementForm, ['title', 'content']);
        if (!validation.isValid) {
            Alert.alert('Error', validation.message);
            return;
        }

        if (announcementForm.startDate >= announcementForm.endDate) {
            Alert.alert('Error', 'End date must be after start date');
            return;
        }

        const success = await createAnnouncement(announcementForm);
        if (success) {
            setShowAnnouncementForm(false);
        }
    };

    const handleUpdateAnnouncement = async () => {
        if (!editingAnnouncement) return;

        const validation = validateRequired(announcementForm, ['title', 'content']);
        if (!validation.isValid) {
            Alert.alert('Error', validation.message);
            return;
        }

        if (announcementForm.startDate >= announcementForm.endDate) {
            Alert.alert('Error', 'End date must be after start date');
            return;
        }

        const success = await updateAnnouncement(editingAnnouncement.id, announcementForm);
        if (success) {
            setShowAnnouncementForm(false);
        }
    };

    const handleDeleteAnnouncement = async (announcement: Announcement) => {
        Alert.alert(
            'Delete Announcement',
            `Are you sure you want to delete "${announcement.title}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteAnnouncement(announcement.id)
                }
            ]
        );
    };

    const getStatusColor = (isActive: boolean) => {
        return isActive ? colors.success : colors.error;
    };

    const getStatusText = (isActive: boolean) => {
        return isActive ? 'Active' : 'Inactive';
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return colors.error;
            case 'medium': return colors.warning;
            case 'low': return colors.success;
            default: return colors.textSecondary;
        }
    };

    const renderPromotionForm = () => (
        <Modal
            visible={showPromotionForm}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowPromotionForm(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowPromotionForm(false)}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                        {editingPromotion ? 'Edit Promotion' : 'New Promotion'}
                    </Text>
                    <TouchableOpacity
                        onPress={editingPromotion ? handleUpdatePromotion : handleCreatePromotion}
                        style={styles.saveButton}
                    >
                        <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.formContainer}>
                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Name *</Text>
                        <TextInput
                            style={styles.textInput}
                            value={promotionForm.name}
                            onChangeText={(text) => setPromotionForm(prev => ({ ...prev, name: text }))}
                            placeholder="Enter promotion name"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Description</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            value={promotionForm.description}
                            onChangeText={(text) => setPromotionForm(prev => ({ ...prev, description: text }))}
                            placeholder="Enter promotion description"
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Discount Percentage *</Text>
                        <TextInput
                            style={styles.textInput}
                            value={promotionForm.discountPercentage.toString()}
                            onChangeText={(text) => setPromotionForm(prev => ({ ...prev, discountPercentage: parseFloat(text) || 0 }))}
                            placeholder="Enter discount percentage"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Start Date *</Text>
                        <DatePicker
                            value={promotionForm.startDate}
                            onDateChange={(date) => setPromotionForm(prev => ({ ...prev, startDate: date }))}
                        />
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>End Date *</Text>
                        <DatePicker
                            value={promotionForm.endDate}
                            onDateChange={(date) => setPromotionForm(prev => ({ ...prev, endDate: date }))}
                        />
                    </View>

                    <View style={styles.formSection}>
                        <View style={styles.switchRow}>
                            <Text style={styles.fieldLabel}>First Time Booking Only</Text>
                            <Switch
                                value={promotionForm.isFirstTimeBookingOnly}
                                onValueChange={(value) => setPromotionForm(prev => ({ ...prev, isFirstTimeBookingOnly: value }))}
                                trackColor={{ false: colors.border, true: colors.primary }}
                                thumbColor={colors.background}
                            />
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <View style={styles.switchRow}>
                            <Text style={styles.fieldLabel}>Active</Text>
                            <Switch
                                value={promotionForm.isActive}
                                onValueChange={(value) => setPromotionForm(prev => ({ ...prev, isActive: value }))}
                                trackColor={{ false: colors.border, true: colors.primary }}
                                thumbColor={colors.background}
                            />
                        </View>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );

    const renderAnnouncementForm = () => (
        <Modal
            visible={showAnnouncementForm}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowAnnouncementForm(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowAnnouncementForm(false)}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                        {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
                    </Text>
                    <TouchableOpacity
                        onPress={editingAnnouncement ? handleUpdateAnnouncement : handleCreateAnnouncement}
                        style={styles.saveButton}
                    >
                        <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.formContainer}>
                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Title *</Text>
                        <TextInput
                            style={styles.textInput}
                            value={announcementForm.title}
                            onChangeText={(text) => setAnnouncementForm(prev => ({ ...prev, title: text }))}
                            placeholder="Enter announcement title"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Content *</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            value={announcementForm.content}
                            onChangeText={(text) => setAnnouncementForm(prev => ({ ...prev, content: text }))}
                            placeholder="Enter announcement content"
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={5}
                        />
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Type *</Text>
                        <View style={styles.segmentedControl}>
                            {['general', 'maintenance', 'promotion', 'alert'].map(type => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.segmentButton,
                                        announcementForm.type === type && styles.segmentButtonActive
                                    ]}
                                    onPress={() => setAnnouncementForm(prev => ({ ...prev, type: type as any }))}
                                >
                                    <Text style={[
                                        styles.segmentButtonText,
                                        announcementForm.type === type && styles.segmentButtonTextActive
                                    ]}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Priority *</Text>
                        <View style={styles.segmentedControl}>
                            {['low', 'medium', 'high'].map(priority => (
                                <TouchableOpacity
                                    key={priority}
                                    style={[
                                        styles.segmentButton,
                                        announcementForm.priority === priority && styles.segmentButtonActive
                                    ]}
                                    onPress={() => setAnnouncementForm(prev => ({ ...prev, priority: priority as any }))}
                                >
                                    <Text style={[
                                        styles.segmentButtonText,
                                        announcementForm.priority === priority && styles.segmentButtonTextActive
                                    ]}>
                                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Start Date *</Text>
                        <DatePicker
                            value={announcementForm.startDate}
                            onDateChange={(date) => setAnnouncementForm(prev => ({ ...prev, startDate: date }))}
                        />
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>End Date *</Text>
                        <DatePicker
                            value={announcementForm.endDate}
                            onDateChange={(date) => setAnnouncementForm(prev => ({ ...prev, endDate: date }))}
                        />
                    </View>

                    <View style={styles.formSection}>
                        <View style={styles.switchRow}>
                            <Text style={styles.fieldLabel}>Active</Text>
                            <Switch
                                value={announcementForm.isActive}
                                onValueChange={(value) => setAnnouncementForm(prev => ({ ...prev, isActive: value }))}
                                trackColor={{ false: colors.border, true: colors.primary }}
                                thumbColor={colors.background}
                            />
                        </View>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );

    const renderPromotionItem = (promotion: Promotion) => (
        <View key={promotion.id} style={styles.contentItem}>
            <View style={styles.contentHeader}>
                <View style={styles.contentInfo}>
                    <Text style={styles.contentTitle}>{promotion.name}</Text>
                    <Text style={styles.contentSubtitle}>{promotion.discountPercentage}% off</Text>
                </View>
                <View style={styles.contentActions}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(promotion.isActive) }]}>
                        <Text style={styles.statusText}>{getStatusText(promotion.isActive)}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setEditingPromotion(promotion)}
                    >
                        <Ionicons name="pencil" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeletePromotion(promotion)}
                    >
                        <Ionicons name="trash" size={16} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
            {promotion.description && (
                <Text style={styles.contentDescription} numberOfLines={2}>{promotion.description}</Text>
            )}
            <View style={styles.contentMeta}>
                <Text style={styles.contentMetaText}>
                    {new Date(promotion.startDate).toLocaleDateString()} - {new Date(promotion.endDate).toLocaleDateString()}
                </Text>
                {promotion.isFirstTimeBookingOnly && (
                    <Text style={styles.contentMetaText}>First time bookings only</Text>
                )}
            </View>
        </View>
    );

    const renderAnnouncementItem = (announcement: Announcement) => (
        <View key={announcement.id} style={styles.contentItem}>
            <View style={styles.contentHeader}>
                <View style={styles.contentInfo}>
                    <Text style={styles.contentTitle}>{announcement.title}</Text>
                    <Text style={styles.contentSubtitle}>{announcement.type}</Text>
                </View>
                <View style={styles.contentActions}>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(announcement.priority) }]}>
                        <Text style={styles.statusText}>{announcement.priority}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(announcement.isActive) }]}>
                        <Text style={styles.statusText}>{getStatusText(announcement.isActive)}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setEditingAnnouncement(announcement)}
                    >
                        <Ionicons name="pencil" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteAnnouncement(announcement)}
                    >
                        <Ionicons name="trash" size={16} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
            <Text style={styles.contentDescription} numberOfLines={3}>{announcement.content}</Text>
            <View style={styles.contentMeta}>
                <Text style={styles.contentMetaText}>
                    {new Date(announcement.startDate).toLocaleDateString()} - {new Date(announcement.endDate).toLocaleDateString()}
                </Text>
            </View>
        </View>
    );

    if (!isActive) return null;

    return (
        <View style={styles.container}>
            {/* Statistics */}
            <View style={[styles.statsContainer, layout.statsGrid]}>
                <StatCard
                    title="Active Promotions"
                    value={contentStats.activePromotions}
                    icon="pricetag"
                    color={colors.primary}
                />
                <StatCard
                    title="Announcements"
                    value={contentStats.totalAnnouncements}
                    icon="megaphone"
                    color={colors.success}
                />
                <StatCard
                    title="Terms Version"
                    value={contentStats.currentTermsVersion}
                    icon="document-text"
                    color={colors.info}
                />
            </View>

            {/* Section Toggle */}
            <View style={styles.sectionToggle}>
                <TouchableOpacity
                    style={[styles.toggleButton, activeSection === 'promotions' && styles.activeToggle]}
                    onPress={() => setActiveSection('promotions')}
                >
                    <Ionicons
                        name="pricetag"
                        size={16}
                        color={activeSection === 'promotions' ? colors.background : colors.textSecondary}
                    />
                    <Text style={[styles.toggleText, activeSection === 'promotions' && styles.activeToggleText]}>
                        Promotions
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, activeSection === 'announcements' && styles.activeToggle]}
                    onPress={() => setActiveSection('announcements')}
                >
                    <Ionicons
                        name="megaphone"
                        size={16}
                        color={activeSection === 'announcements' ? colors.background : colors.textSecondary}
                    />
                    <Text style={[styles.toggleText, activeSection === 'announcements' && styles.activeToggleText]}>
                        Announcements
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, activeSection === 'terms' && styles.activeToggle]}
                    onPress={() => setActiveSection('terms')}
                >
                    <Ionicons
                        name="document-text"
                        size={16}
                        color={activeSection === 'terms' ? colors.background : colors.textSecondary}
                    />
                    <Text style={[styles.toggleText, activeSection === 'terms' && styles.activeToggleText]}>
                        Terms
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search and Actions */}
            {activeSection !== 'terms' && (
                <View style={styles.searchContainer}>
                    <SearchBar
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder={`Search ${activeSection}...`}
                    />
                    <Button
                        title={activeSection === 'promotions' ? 'Add Promotion' : 'Add Announcement'}
                        onPress={() => {
                            if (activeSection === 'promotions') {
                                setShowPromotionForm(true);
                            } else {
                                setShowAnnouncementForm(true);
                            }
                        }}
                        icon="add"
                        style={styles.addButton}
                    />
                </View>
            )}

            {/* Content */}
            <ScrollView style={styles.content}>
                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <>
                        {activeSection === 'promotions' ? (
                            filteredPromotions.length === 0 ? (
                                <EmptyState
                                    icon="pricetag"
                                    title="No promotions found"
                                    subtitle={searchQuery ? "Try adjusting your search" : "Create your first promotion"}
                                    actionText="Add Promotion"
                                    onAction={() => setShowPromotionForm(true)}
                                />
                            ) : (
                                <View style={styles.grid}>
                                    {filteredPromotions.map(renderPromotionItem)}
                                </View>
                            )
                        ) : activeSection === 'announcements' ? (
                            filteredAnnouncements.length === 0 ? (
                                <EmptyState
                                    icon="megaphone"
                                    title="No announcements found"
                                    subtitle={searchQuery ? "Try adjusting your search" : "Create your first announcement"}
                                    actionText="Add Announcement"
                                    onAction={() => setShowAnnouncementForm(true)}
                                />
                            ) : (
                                <View style={styles.grid}>
                                    {filteredAnnouncements.map(renderAnnouncementItem)}
                                </View>
                            )
                        ) : (
                            <View style={styles.termsContainer}>
                                <Text style={styles.termsTitle}>Terms & Conditions</Text>
                                <Text style={styles.termsSubtitle}>
                                    Manage your terms and conditions that users must accept
                                </Text>
                                <Button
                                    title="Edit Terms"
                                    onPress={() => setShowTermsEditor(true)}
                                    icon="pencil"
                                    style={styles.editTermsButton}
                                />
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            {/* Modals */}
            {renderPromotionForm()}
            {renderAnnouncementForm()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    statsContainer: {
        padding: 16,
        gap: 16,
    },
    sectionToggle: {
        flexDirection: 'row',
        margin: 16,
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 4,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 6,
        gap: 8,
    },
    activeToggle: {
        backgroundColor: colors.primary,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    activeToggleText: {
        color: colors.background,
    },
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
        alignItems: 'center',
    },
    addButton: {
        paddingHorizontal: 16,
    },
    content: {
        flex: 1,
    },
    grid: {
        padding: 16,
        gap: 12,
    },
    contentItem: {
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    contentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    contentInfo: {
        flex: 1,
    },
    contentTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    contentSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    contentActions: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    contentDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: 8,
    },
    contentMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    contentMetaText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        color: colors.background,
        fontWeight: '600',
    },
    actionButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: colors.background,
    },
    termsContainer: {
        padding: 32,
        alignItems: 'center',
    },
    termsTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    termsSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    editTermsButton: {
        paddingHorizontal: 24,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    saveButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    saveButtonText: {
        color: colors.background,
        fontWeight: '600',
    },
    formContainer: {
        flex: 1,
    },
    formSection: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    fieldLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: colors.text,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 4,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    segmentButtonActive: {
        backgroundColor: colors.primary,
    },
    segmentButtonText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    segmentButtonTextActive: {
        color: colors.background,
        fontWeight: '600',
    },
});

export default ContentTab; 
