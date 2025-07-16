import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContentData } from '@/hooks';
import { useContentActions } from '@/hooks';
import { FAQ, FAQCategory, FAQFormData, FAQCategoryFormData } from '@/types/content';
import { getResponsiveLayout, validateRequired } from '@/utils/contentUtils';
import { useWindowDimensions } from 'react-native';
import { colors } from '@/constants/adminColors';
import StatCard from '../StatCard';
import Button from '../Button';
import SearchBar from '../SearchBar';
import EmptyState from '../EmptyState';
import LoadingSpinner from '../LoadingSpinner';

interface FAQTabProps {
    isActive: boolean;
}

const FAQTab: React.FC<FAQTabProps> = ({ isActive }) => {
    const dimensions = useWindowDimensions();
    const layout = getResponsiveLayout(dimensions.width);
    const { faqCategories, faqs, faqStats, searchFAQs, filterFAQsByCategory, loading } = useContentData();
    const { createFAQCategory, updateFAQCategory, deleteFAQCategory, createFAQ, updateFAQ, deleteFAQ } = useContentActions();

    const [activeSection, setActiveSection] = useState<'categories' | 'faqs'>('categories');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [showFAQForm, setShowFAQForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState<FAQCategory | null>(null);
    const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);

    // Form states
    const [categoryForm, setCategoryForm] = useState<FAQCategoryFormData>({
        name: ''
    });
    const [faqForm, setFaqForm] = useState<FAQFormData>({
        categoryId: '',
        question: '',
        answer: ''
    });

    // Filter data based on search and category
    const filteredFAQs = selectedCategory
        ? filterFAQsByCategory(selectedCategory, searchQuery)
        : searchFAQs(searchQuery);

    // Reset form when modal closes
    useEffect(() => {
        if (!showCategoryForm) {
            setCategoryForm({ name: '' });
            setEditingCategory(null);
        }
    }, [showCategoryForm]);

    useEffect(() => {
        if (!showFAQForm) {
            setFaqForm({ categoryId: '', question: '', answer: '' });
            setEditingFAQ(null);
        }
    }, [showFAQForm]);

    // Load editing data
    useEffect(() => {
        if (editingCategory) {
            setCategoryForm({
                name: editingCategory.name
            });
            setShowCategoryForm(true);
        }
    }, [editingCategory]);

    useEffect(() => {
        if (editingFAQ) {
            setFaqForm({
                categoryId: editingFAQ.categoryId,
                question: editingFAQ.question,
                answer: editingFAQ.answer
            });
            setShowFAQForm(true);
        }
    }, [editingFAQ]);

    const handleCreateCategory = async () => {
        const validation = validateRequired(categoryForm, ['name']);
        if (!validation.isValid) {
            Alert.alert('Error', validation.message);
            return;
        }

        const success = await createFAQCategory(categoryForm);
        if (success) {
            setShowCategoryForm(false);
        }
    };

    const handleUpdateCategory = async () => {
        if (!editingCategory) return;

        const validation = validateRequired(categoryForm, ['name']);
        if (!validation.isValid) {
            Alert.alert('Error', validation.message);
            return;
        }

        const success = await updateFAQCategory(editingCategory.id, categoryForm);
        if (success) {
            setShowCategoryForm(false);
        }
    };

    const handleDeleteCategory = async (category: FAQCategory) => {
        const categoryFAQs = faqs.filter(faq => faq.categoryId === category.id);
        const message = categoryFAQs.length > 0
            ? `This will also delete ${categoryFAQs.length} FAQ(s) in this category.`
            : 'This action cannot be undone.';

        Alert.alert(
            'Delete Category',
            `Are you sure you want to delete "${category.name}"? ${message}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteFAQCategory(category.id)
                }
            ]
        );
    };

    const handleCreateFAQ = async () => {
        const validation = validateRequired(faqForm, ['categoryId', 'question', 'answer']);
        if (!validation.isValid) {
            Alert.alert('Error', validation.message);
            return;
        }

        const success = await createFAQ(faqForm);
        if (success) {
            setShowFAQForm(false);
        }
    };

    const handleUpdateFAQ = async () => {
        if (!editingFAQ) return;

        const validation = validateRequired(faqForm, ['categoryId', 'question', 'answer']);
        if (!validation.isValid) {
            Alert.alert('Error', validation.message);
            return;
        }

        const success = await updateFAQ(editingFAQ.id, faqForm);
        if (success) {
            setShowFAQForm(false);
        }
    };

    const handleDeleteFAQ = async (faq: FAQ) => {
        Alert.alert(
            'Delete FAQ',
            `Are you sure you want to delete this FAQ? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteFAQ(faq.id)
                }
            ]
        );
    };

    const getCategoryName = (categoryId: string) => {
        const category = faqCategories.find(cat => cat.id === categoryId);
        return category?.name || 'Unknown Category';
    };

    const renderCategoryForm = () => (
        <Modal
            visible={showCategoryForm}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowCategoryForm(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowCategoryForm(false)}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                        {editingCategory ? 'Edit Category' : 'New Category'}
                    </Text>
                    <TouchableOpacity
                        onPress={editingCategory ? handleUpdateCategory : handleCreateCategory}
                        style={styles.saveButton}
                    >
                        <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.formContainer}>
                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Category Name *</Text>
                        <TextInput
                            style={styles.textInput}
                            value={categoryForm.name}
                            onChangeText={(text) => setCategoryForm(prev => ({ ...prev, name: text }))}
                            placeholder="Enter category name"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );

    const renderFAQForm = () => (
        <Modal
            visible={showFAQForm}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowFAQForm(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowFAQForm(false)}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                        {editingFAQ ? 'Edit FAQ' : 'New FAQ'}
                    </Text>
                    <TouchableOpacity
                        onPress={editingFAQ ? handleUpdateFAQ : handleCreateFAQ}
                        style={styles.saveButton}
                    >
                        <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.formContainer}>
                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Category *</Text>
                        <TouchableOpacity
                            style={styles.pickerButton}
                            onPress={() => {
                                // Show category picker modal
                                Alert.alert(
                                    'Select Category',
                                    'Choose a category for this FAQ',
                                    [
                                        ...faqCategories.map(cat => ({
                                            text: cat.name,
                                            onPress: () => setFaqForm(prev => ({ ...prev, categoryId: cat.id }))
                                        })),
                                        { text: 'Cancel', style: 'cancel' }
                                    ]
                                );
                            }}
                        >
                            <Text style={[styles.pickerText, !faqForm.categoryId && styles.pickerPlaceholder]}>
                                {faqForm.categoryId ? getCategoryName(faqForm.categoryId) : 'Select category'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Question *</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            value={faqForm.question}
                            onChangeText={(text) => setFaqForm(prev => ({ ...prev, question: text }))}
                            placeholder="Enter the question"
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Answer *</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            value={faqForm.answer}
                            onChangeText={(text) => setFaqForm(prev => ({ ...prev, answer: text }))}
                            placeholder="Enter the answer"
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={5}
                        />
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );

    const renderCategoryItem = (category: FAQCategory) => {
        const categoryFAQs = faqs.filter(faq => faq.categoryId === category.id);

        return (
            <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => {
                    setSelectedCategory(category.id);
                    setActiveSection('faqs');
                }}
            >
                <View style={styles.categoryHeader}>
                    <View style={styles.categoryInfo}>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        <Text style={styles.categoryCount}>{categoryFAQs.length} FAQ(s)</Text>
                    </View>
                    <View style={styles.categoryActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => setEditingCategory(category)}
                        >
                            <Ionicons name="pencil" size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleDeleteCategory(category)}
                        >
                            <Ionicons name="trash" size={16} color={colors.error} />
                        </TouchableOpacity>
                    </View>
                </View>
                <Text style={styles.categoryDate}>
                    Created {new Date(category.createdAt).toLocaleDateString()}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderFAQItem = (faq: FAQ) => (
        <View key={faq.id} style={styles.faqItem}>
            <View style={styles.faqHeader}>
                <Text style={styles.faqCategory}>{getCategoryName(faq.categoryId)}</Text>
                <View style={styles.faqActions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setEditingFAQ(faq)}
                    >
                        <Ionicons name="pencil" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteFAQ(faq)}
                    >
                        <Ionicons name="trash" size={16} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
            <Text style={styles.faqQuestion}>{faq.question}</Text>
            <Text style={styles.faqAnswer} numberOfLines={3}>{faq.answer}</Text>
            <Text style={styles.faqDate}>
                Updated {new Date(faq.updatedAt).toLocaleDateString()}
            </Text>
        </View>
    );

    if (!isActive) return null;

    return (
        <View style={styles.container}>
            {/* Statistics */}
            <View style={[styles.statsContainer, layout.statsGrid]}>
                <StatCard
                    title="Categories"
                    value={faqStats.totalCategories}
                    icon="folder"
                    color={colors.primary}
                />
                <StatCard
                    title="Total FAQs"
                    value={faqStats.totalFAQs}
                    icon="help-circle"
                    color={colors.success}
                />
                <StatCard
                    title="Avg per Category"
                    value={faqStats.avgFAQsPerCategory}
                    icon="analytics"
                    color={colors.info}
                />
            </View>

            {/* Section Toggle */}
            <View style={styles.sectionToggle}>
                <TouchableOpacity
                    style={[styles.toggleButton, activeSection === 'categories' && styles.activeToggle]}
                    onPress={() => setActiveSection('categories')}
                >
                    <Ionicons
                        name="folder"
                        size={16}
                        color={activeSection === 'categories' ? colors.background : colors.textSecondary}
                    />
                    <Text style={[styles.toggleText, activeSection === 'categories' && styles.activeToggleText]}>
                        Categories
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, activeSection === 'faqs' && styles.activeToggle]}
                    onPress={() => setActiveSection('faqs')}
                >
                    <Ionicons
                        name="help-circle"
                        size={16}
                        color={activeSection === 'faqs' ? colors.background : colors.textSecondary}
                    />
                    <Text style={[styles.toggleText, activeSection === 'faqs' && styles.activeToggleText]}>
                        FAQs
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search and Actions */}
            <View style={styles.searchContainer}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={`Search ${activeSection}...`}
                />
                <Button
                    title={activeSection === 'categories' ? 'Add Category' : 'Add FAQ'}
                    onPress={() => {
                        if (activeSection === 'categories') {
                            setShowCategoryForm(true);
                        } else {
                            setShowFAQForm(true);
                        }
                    }}
                    icon="add"
                    style={styles.addButton}
                />
            </View>

            {/* Category Filter for FAQs */}
            {activeSection === 'faqs' && (
                <View style={styles.filterContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity
                            style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
                            onPress={() => setSelectedCategory(null)}
                        >
                            <Text style={[styles.filterChipText, !selectedCategory && styles.filterChipTextActive]}>
                                All Categories
                            </Text>
                        </TouchableOpacity>
                        {faqCategories.map(category => (
                            <TouchableOpacity
                                key={category.id}
                                style={[styles.filterChip, selectedCategory === category.id && styles.filterChipActive]}
                                onPress={() => setSelectedCategory(category.id)}
                            >
                                <Text style={[styles.filterChipText, selectedCategory === category.id && styles.filterChipTextActive]}>
                                    {category.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Content */}
            <ScrollView style={styles.content}>
                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <>
                        {activeSection === 'categories' ? (
                            faqCategories.filter(cat =>
                                cat.name.toLowerCase().includes(searchQuery.toLowerCase())
                            ).length === 0 ? (
                                <EmptyState
                                    icon="folder"
                                    title="No categories found"
                                    subtitle={searchQuery ? "Try adjusting your search" : "Create your first FAQ category"}
                                    actionText="Add Category"
                                    onAction={() => setShowCategoryForm(true)}
                                />
                            ) : (
                                <View style={styles.grid}>
                                    {faqCategories
                                        .filter(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map(renderCategoryItem)}
                                </View>
                            )
                        ) : (
                            filteredFAQs.length === 0 ? (
                                <EmptyState
                                    icon="help-circle"
                                    title="No FAQs found"
                                    subtitle={searchQuery || selectedCategory ? "Try adjusting your filters" : "Create your first FAQ"}
                                    actionText="Add FAQ"
                                    onAction={() => setShowFAQForm(true)}
                                />
                            ) : (
                                <View style={styles.grid}>
                                    {filteredFAQs.map(renderFAQItem)}
                                </View>
                            )
                        )}
                    </>
                )}
            </ScrollView>

            {/* Modals */}
            {renderCategoryForm()}
            {renderFAQForm()}
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
    filterContainer: {
        paddingHorizontal: 16,
        marginTop: 12,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: colors.surface,
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
    },
    filterChipText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    filterChipTextActive: {
        color: colors.background,
    },
    content: {
        flex: 1,
    },
    grid: {
        padding: 16,
        gap: 12,
    },
    categoryItem: {
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryInfo: {
        flex: 1,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    categoryCount: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    categoryActions: {
        flexDirection: 'row',
        gap: 8,
    },
    categoryDate: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    faqItem: {
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    faqHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    faqCategory: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '500',
    },
    faqActions: {
        flexDirection: 'row',
        gap: 8,
    },
    faqQuestion: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    faqAnswer: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: 8,
    },
    faqDate: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    actionButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: colors.background,
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
    pickerButton: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pickerText: {
        fontSize: 16,
        color: colors.text,
    },
    pickerPlaceholder: {
        color: colors.textSecondary,
    },
});

export default FAQTab; 
