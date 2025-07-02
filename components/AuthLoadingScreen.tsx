import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Dimensions
} from 'react-native';
import Colors from '@/constants/colors';

const { width, height } = Dimensions.get('window');

interface AuthLoadingScreenProps {
    message?: string;
}

export default function AuthLoadingScreen({
    message = "Loading..."
}: AuthLoadingScreenProps) {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <ActivityIndicator
                    size="large"
                    color={Colors.primary}
                    style={styles.loader}
                />
                <Text style={styles.message}>{message}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        width,
        height,
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    loader: {
        marginBottom: 16,
    },
    message: {
        fontSize: 16,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
    },
}); 