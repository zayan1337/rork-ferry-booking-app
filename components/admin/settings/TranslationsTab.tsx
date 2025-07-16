import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContentData } from '@/hooks';
import { useContentActions } from '@/hooks';
import { Translation, TranslationFormData } from '@/types/content';
import { getResponsiveLayout, validateRequired, getTranslationCompleteness } from '@/utils/contentUtils';
import { useWindowDimensions } from 'react-native';
import { colors } from '@/constants/adminColors';
import StatCard from '../StatCard';
import Button from '../Button';
import SearchBar from '../SearchBar';
import EmptyState from '../EmptyState';
import LoadingSpinner from '../LoadingSpinner';

interface TranslationsTabProps {
    isActive: boolean;
}

const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'dv', name: 'Dhivehi', flag: '🇲🇻' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
];

const TranslationsTab: React.FC<TranslationsTabProps> = ({ isActive }) => {
    const dimensions = useWindowDimensions();
    const layout = getResponsiveLayout(dimensions.width);
    const { translations, translationStats, searchTranslations, getTranslationsByLanguage, loading } = useContentData();
    const { createTranslation, updateTranslation, deleteTranslation, exportTranslations, importTranslations } = useContentActions();

    const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
    const [searchQuery, setSearchQuery] = useState('');
    const [showTranslationForm, setShowTranslationForm] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [editingTranslation, setEditingTranslation] = useState<Translation | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Form states
    const [translationForm, setTranslationForm] = useState<TranslationFormData>({
        key: '',
        languageCode: 'en',
        translation: '',
        context: '',
    });

    const [bulkImportText, setBulkImportText] = useState('');

    // Filter data based on search and language
    const filteredTranslations = getTranslationsByLanguage(selectedLanguage, searchQuery);

    // Reset form when modal closes
    useEffect(() => {
        if (!showTranslationForm) {
            setTranslationForm({
                key: '',
                languageCode: selectedLanguage,
                translation: '',
                context: '',
            });
            setEditingTranslation(null);
        }
    }, [showTranslationForm, selectedLanguage]);

    // Load editing data
    useEffect(() => {
        if (editingTranslation) {
            setTranslationForm({
                key: editingTranslation.key,
                languageCode: editingTranslation.languageCode,
                translation: editingTranslation.translation,
                context: editingTranslation.context || '',
            });
            setShowTranslationForm(true);
        }
    }, [editingTranslation]);

    const handleCreateTranslation = async () => {
        const validation = validateRequired(translationForm, ['key', 'languageCode', 'translation']);
        if (!validation.isValid) {
            Alert.alert('Error', validation.message);
            return;
        }

        // Check if translation key already exists for this language
        const existingTranslation = translations.find(
            t => t.key === translationForm.key && t.languageCode === translationForm.languageCode
        );
        if (existingTranslation) {
            Alert.alert('Error', 'Translation key already exists for this language');
            return;
        }

        const success = await createTranslation(translationForm);
        if (success) {
            setShowTranslationForm(false);
        }
    };

    const handleUpdateTranslation = async () => {
        if (!editingTranslation) return;

        const validation = validateRequired(translationForm, ['key', 'languageCode', 'translation']);
        if (!validation.isValid) {
            Alert.alert('Error', validation.message);
            return;
        }

        const success = await updateTranslation(editingTranslation.id, translationForm);
        if (success) {
            setShowTranslationForm(false);
        }
    };

    const handleDeleteTranslation = async (translation: Translation) => {
        Alert.alert(
            'Delete Translation',
            `Are you sure you want to delete the translation for "${translation.key}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteTranslation(translation.id)
                }
            ]
        );
    };

    const handleExportTranslations = async () => {
        const success = await exportTranslations(selectedLanguage);
        if (success) {
            Alert.alert('Success', 'Translations exported successfully');
        }
    };

    const handleBulkImport = async () => {
        if (!bulkImportText.trim()) {
            Alert.alert('Error', 'Please enter translations to import');
            return;
        }

        try {
            const lines = bulkImportText.trim().split('\n');
            const translations: TranslationFormData[] = [];

            for (const line of lines) {
                const [key, translation, context] = line.split('\t');
                if (key && translation) {
                    translations.push({
                        key: key.trim(),
                        languageCode: selectedLanguage,
                        translation: translation.trim(),
                        context: context?.trim() || '',
                    });
                }
            }

            if (translations.length === 0) {
                Alert.alert('Error', 'No valid translations found. Use tab-separated format: key\ttranslation\tcontext');
                return;
            }

            const success = await importTranslations(translations);
            if (success) {
                setBulkImportText('');
                setShowBulkImport(false);
                Alert.alert('Success', `${translations.length} translations imported successfully`);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to parse translations. Please check the format.');
        }
    };

    const getLanguageName = (code: string) => {
        const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
        return language ? `${language.flag} ${language.name}` : code;
    };

    const getCompletionPercentage = (languageCode: string) => {
        return getTranslationCompleteness(translations, languageCode);
    };

    const renderTranslationForm = () => (
        <Modal
            visible={showTranslationForm}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowTranslationForm(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowTranslationForm(false)}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                        {editingTranslation ? 'Edit Translation' : 'New Translation'}
                    </Text>
                    <TouchableOpacity
                        onPress={editingTranslation ? handleUpdateTranslation : handleCreateTranslation}
                        style={styles.saveButton}
                    >
                        <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.formContainer}>
                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Translation Key *</Text>
                        <TextInput
                            style={styles.textInput}
                            value={translationForm.key}
                            onChangeText={(text) => setTranslationForm(prev => ({ ...prev, key: text }))}
                            placeholder="e.g., common.save, navigation.home"
                            placeholderTextColor={colors.textSecondary}
                            editable={!editingTranslation}
                        />
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Language *</Text>
                        <TouchableOpacity
                            style={styles.pickerButton}
                            onPress={() => {
                                Alert.alert(
                                    'Select Language',
                                    'Choose the language for this translation',
                                    [
                                        ...SUPPORTED_LANGUAGES.map(lang => ({
                                            text: `${lang.flag} ${lang.name}`,
                                            onPress: () => setTranslationForm(prev => ({ ...prev, languageCode: lang.code }))
                                        })),
                                        { text: 'Cancel', style: 'cancel' }
                                    ]
                                );
                            }}
                        >
                            <Text style={styles.pickerText}>
                                {getLanguageName(translationForm.languageCode)}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Translation *</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            value={translationForm.translation}
                            onChangeText={(text) => setTranslationForm(prev => ({ ...prev, translation: text }))}
                            placeholder="Enter the translation text"
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Context (Optional)</Text>
                        <TextInput
                            style={styles.textInput}
                            value={translationForm.context}
                            onChangeText={(text) => setTranslationForm(prev => ({ ...prev, context: text }))}
                            placeholder="e.g., Button text, Page title"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );

    const renderBulkImportModal = () => (
        <Modal
            visible={showBulkImport}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowBulkImport(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowBulkImport(false)}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Bulk Import</Text>
                    <TouchableOpacity
                        onPress={handleBulkImport}
                        style={styles.saveButton}
                    >
                        <Text style={styles.saveButtonText}>Import</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.formContainer}>
                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Import Format</Text>
                        <Text style={styles.helpText}>
                            Use tab-separated format: key{'\t'}translation{'\t'}context
                        </Text>
                        <Text style={styles.helpText}>
                            Example:{'\n'}
                            common.save{'\t'}Save{'\t'}Button text{'\n'}
                            common.cancel{'\t'}Cancel{'\t'}Button text
                        </Text>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Translations *</Text>
                        <TextInput
                            style={[styles.textInput, styles.bulkTextArea]}
                            value={bulkImportText}
                            onChangeText={setBulkImportText}
                            placeholder="Paste your translations here..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={10}
                        />
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );

    const renderTranslationItem = (translation: Translation) => (
        <View key={translation.id} style={styles.translationItem}>
            <View style={styles.translationHeader}>
                <View style={styles.translationInfo}>
                    <Text style={styles.translationKey}>{translation.key}</Text>
                    {translation.context && (
                        <Text style={styles.translationContext}>{translation.context}</Text>
                    )}
                </View>
                <View style={styles.translationActions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setEditingTranslation(translation)}
                    >
                        <Ionicons name="pencil" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteTranslation(translation)}
                    >
                        <Ionicons name="trash" size={16} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
            <Text style={styles.translationText}>{translation.translation}</Text>
        </View>
    );

    const renderLanguageCard = (language: typeof SUPPORTED_LANGUAGES[0]) => {
        const completionPercentage = getCompletionPercentage(language.code);
        const translationCount = translations.filter(t => t.languageCode === language.code).length;

        return (
            <TouchableOpacity
                key={language.code}
                style={[styles.languageCard, selectedLanguage === language.code && styles.selectedLanguageCard]}
                onPress={() => setSelectedLanguage(language.code)}
            >
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <Text style={styles.languageName}>{language.name}</Text>
                <Text style={styles.languageCount}>{translationCount} translations</Text>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
                </View>
                <Text style={styles.completionText}>{completionPercentage}% complete</Text>
            </TouchableOpacity>
        );
    };

    if (!isActive) return null;

    return (
        <View style={styles.container}>
            {/* Statistics */}
            <View style={[styles.statsContainer, layout.statsGrid]}>
                <StatCard
                    title="Languages"
                    value={SUPPORTED_LANGUAGES.length}
                    icon="language"
                    color={colors.primary}
                />
                <StatCard
                    title="Total Keys"
                    value={translationStats.totalKeys}
                    icon="key"
                    color={colors.success}
                />
                <StatCard
                    title="Translations"
                    value={translationStats.totalTranslations}
                    icon="text"
                    color={colors.info}
                />
                <StatCard
                    title="Completion"
                    value={`${translationStats.avgCompleteness}%`}
                    icon="checkmark-circle"
                    color={colors.warning}
                />
            </View>

            {/* Language Selection */}
            <View style={styles.languageSelector}>
                <Text style={styles.sectionTitle}>Select Language</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.languageCards}>
                        {SUPPORTED_LANGUAGES.map(renderLanguageCard)}
                    </View>
                </ScrollView>
            </View>

            {/* Search and Actions */}
            <View style={styles.searchContainer}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search translations..."
                />
                <TouchableOpacity
                    style={styles.viewToggle}
                    onPress={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                >
                    <Ionicons
                        name={viewMode === 'grid' ? 'list' : 'grid'}
                        size={20}
                        color={colors.textSecondary}
                    />
                </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                <Button
                    title="Add Translation"
                    onPress={() => setShowTranslationForm(true)}
                    icon="add"
                    style={styles.actionButton}
                />
                <Button
                    title="Bulk Import"
                    onPress={() => setShowBulkImport(true)}
                    icon="cloud-upload"
                    style={styles.actionButton}
                />
                <Button
                    title="Export"
                    onPress={handleExportTranslations}
                    icon="download"
                    style={styles.actionButton}
                />
            </View>

            {/* Content */}
            <ScrollView style={styles.content}>
                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <>
                        {filteredTranslations.length === 0 ? (
                            <EmptyState
                                icon="language"
                                title="No translations found"
                                subtitle={searchQuery ? "Try adjusting your search" : "Add your first translation"}
                                actionText="Add Translation"
                                onAction={() => setShowTranslationForm(true)}
                            />
                        ) : (
                            <View style={styles.grid}>
                                {filteredTranslations.map(renderTranslationItem)}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            {/* Modals */}
            {renderTranslationForm()}
            {renderBulkImportModal()}
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
    languageSelector: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 12,
    },
    languageCards: {
        flexDirection: 'row',
        gap: 12,
    },
    languageCard: {
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        minWidth: 120,
    },
    selectedLanguageCard: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },
    languageFlag: {
        fontSize: 32,
        marginBottom: 8,
    },
    languageName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    languageCount: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    progressBar: {
        width: '100%',
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        marginBottom: 4,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    completionText: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    viewToggle: {
        padding: 8,
        backgroundColor: colors.surface,
        borderRadius: 6,
    },
    actionButtons: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 16,
    },
    actionButton: {
        flex: 1,
        paddingHorizontal: 12,
    },
    content: {
        flex: 1,
    },
    grid: {
        padding: 16,
        gap: 12,
    },
    translationItem: {
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    translationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    translationInfo: {
        flex: 1,
    },
    translationKey: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    translationContext: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    translationActions: {
        flexDirection: 'row',
        gap: 8,
    },
    translationText: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 22,
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
    bulkTextArea: {
        minHeight: 200,
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
    helpText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
        fontFamily: 'monospace',
    },
});

export default TranslationsTab; 
