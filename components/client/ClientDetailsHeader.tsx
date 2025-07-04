import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface ClientDetailsHeaderProps {
  name: string;
}

const ClientDetailsHeader: React.FC<ClientDetailsHeaderProps> = ({ name }) => {
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("");
  };

  return (
    <View style={styles.header}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {getInitials(name)}
        </Text>
      </View>
      <Text style={styles.name}>{name}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
});

export default ClientDetailsHeader; 