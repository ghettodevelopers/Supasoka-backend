import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useContact } from '../contexts/ContactContext';

const SupportScreen = ({ navigation }) => {
  const { contactSettings, loading } = useContact();

  const handleWhatsApp = () => {
    if (contactSettings?.whatsappUrl) {
      Linking.openURL(contactSettings.whatsappUrl).catch(() => {
        Alert.alert('Hitilafu', 'Imeshindwa kufungua WhatsApp');
      });
    }
  };

  const handleCall = () => {
    if (contactSettings?.callUrl) {
      Alert.alert(
        'Piga Simu',
        `Ungependa kupiga simu ${contactSettings.callNumber}?`,
        [
          { text: 'Ghairi', style: 'cancel' },
          {
            text: 'Piga',
            onPress: () => {
              Linking.openURL(contactSettings.callUrl).catch(() => {
                Alert.alert('Hitilafu', 'Imeshindwa kupiga simu');
              });
            },
          },
        ]
      );
    }
  };

  const handleEmail = () => {
    const email = 'mailto:support@supasoka.com?subject=Msaada wa Supasoka&body=Habari, ninahitaji msaada...';
    Linking.openURL(email).catch(() => {
      Alert.alert('Hitilafu', 'Imeshindwa kufungua barua pepe');
    });
  };

  const faqItems = [
    {
      question: 'Je, ninaweza kuangalia bila kulipa?',
      answer: 'Ndiyo! Una dakika 30 za bure kwa vituo vyote. Baada ya hapo, unaweza kulipa kifurushi au kutumia points.',
    },
    {
      question: 'Ninapata points vipi?',
      answer: 'Angalia matangazo kupata points 10 kila tangazo. Tumia points 50 kufungua kituo kimoja.',
    },
    {
      question: 'Vifurushi vya malipo ni vipi?',
      answer: 'Wiki 1 - Tsh. 2,000, Mwezi 1 - Tsh. 5,000, Mwaka 1 - Tsh. 50,000',
    },
    {
      question: 'Ninalipa vipi?',
      answer: 'Tunakubali M-Pesa, TigoPesa, Airtel Money, na HaloPesa. Chagua mtandao wako na fuata maagizo.',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#1e3a8a', '#1e40af', '#3b82f6']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Usaidizi</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Contact Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wasiliana Nasi</Text>
          
          {contactSettings?.whatsappNumber && (
            <TouchableOpacity style={styles.contactCard} onPress={handleWhatsApp}>
              <View style={[styles.contactIcon, { backgroundColor: '#25D366' }]}>
                <Icon name="whatsapp" size={28} color="#fff" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>WhatsApp</Text>
                <Text style={styles.contactSubtitle}>{contactSettings.whatsappNumber}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#9ca3af" />
            </TouchableOpacity>
          )}

          {contactSettings?.callNumber && (
            <TouchableOpacity style={styles.contactCard} onPress={handleCall}>
              <View style={[styles.contactIcon, { backgroundColor: '#3b82f6' }]}>
                <Icon name="phone" size={28} color="#fff" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Piga Simu</Text>
                <Text style={styles.contactSubtitle}>{contactSettings.callNumber}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#9ca3af" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.contactCard} onPress={handleEmail}>
            <View style={[styles.contactIcon, { backgroundColor: '#8b5cf6' }]}>
              <Icon name="email" size={28} color="#fff" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Barua Pepe</Text>
              <Text style={styles.contactSubtitle}>support@supasoka.com</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Maswali Yanayoulizwa Mara Kwa Mara</Text>
          {faqItems.map((item, index) => (
            <View key={index} style={styles.faqCard}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            </View>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.appInfoSection}>
          <Icon name="television-play" size={48} color="#3b82f6" />
          <Text style={styles.appName}>Supasoka</Text>
          <Text style={styles.appVersion}>Toleo 1.0.0</Text>
          <Text style={styles.appCopyright}>© 2024 Ghetto Developers</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  contactIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  faqCard: {
    backgroundColor: '#1f2937',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
  appInfoSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
  },
  appVersion: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 5,
  },
  appCopyright: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 10,
  },
};

export default SupportScreen;
