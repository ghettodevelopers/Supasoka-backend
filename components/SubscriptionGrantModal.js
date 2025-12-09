import React, { useRef, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    Animated,
    StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SubscriptionGrantModal = ({ visible, onClose, grantedTime }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 5,
                useNativeDriver: true,
            }).start();

            // Auto-close after 5 seconds
            const timeout = setTimeout(() => {
                closeModal();
            }, 5000);

            return () => clearTimeout(timeout);
        }
    }, [visible]);

    const closeModal = () => {
        Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const formatTime = (minutes) => {
        const days = Math.floor(minutes / (24 * 60));
        const hours = Math.floor((minutes % (24 * 60)) / 60);
        const mins = minutes % 60;

        if (days > 0) {
            return `siku ${days}, masaa ${hours}, dakika ${mins}`;
        } else if (hours > 0) {
            return `masaa ${hours}, dakika ${mins}`;
        } else {
            return `dakika ${mins}`;
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={closeModal}
        >
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {/* Celebration Icon */}
                    <View style={styles.iconContainer}>
                        <LinearGradient
                            colors={['#10b981', '#059669']}
                            style={styles.iconGradient}
                        >
                            <Icon name="crown" size={70} color="#fff" />
                        </LinearGradient>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Hongera! 🎉</Text>

                    {/* Message */}
                    <View style={styles.messageBox}>
                        <Text style={styles.message}>
                            Umezawadiwa muda wa {formatTime(grantedTime)}.
                        </Text>
                        <Text style={styles.submessage}>
                            Furahia kuangalia channel zote!
                        </Text>
                    </View>

                    {/* Info Box */}
                    <View style={styles.infoBox}>
                        <Icon name="information" size={24} color="#3b82f6" />
                        <Text style={styles.infoText}>
                            Sasa unaweza kuangalia vituo vyote bila malipo kwa muda huu.
                        </Text>
                    </View>

                    {/* Close Button */}
                    <TouchableOpacity style={styles.button} onPress={closeModal}>
                        <LinearGradient
                            colors={['#3b82f6', '#2563eb']}
                            style={styles.buttonGradient}
                        >
                            <Icon name="check-circle" size={24} color="#fff" />
                            <Text style={styles.buttonText}>Sawa, Asante!</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1f2937',
        borderRadius: 25,
        padding: 30,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 25,
    },
    iconGradient: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
        textAlign: 'center',
    },
    messageBox: {
        backgroundColor: '#374151',
        padding: 20,
        borderRadius: 15,
        marginBottom: 20,
        width: '100%',
    },
    message: {
        fontSize: 18,
        color: '#10b981',
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    submessage: {
        fontSize: 16,
        color: '#d1d5db',
        textAlign: 'center',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        padding: 15,
        borderRadius: 12,
        marginBottom: 25,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: '#3b82f6',
        lineHeight: 20,
    },
    button: {
        width: '100%',
        borderRadius: 15,
        overflow: 'hidden',
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
});

export default SubscriptionGrantModal;
