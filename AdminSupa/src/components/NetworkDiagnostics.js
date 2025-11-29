import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const NetworkDiagnostics = ({ visible, onClose }) => {
  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);

  const testEndpoints = [
    {
      name: 'Render.com Production',
      url: 'https://supasoka-backend.onrender.com/api',
      healthUrl: 'https://supasoka-backend.onrender.com/health'
    },
    {
      name: 'Local Development',
      url: 'http://localhost:5000/api',
      healthUrl: 'http://localhost:5000/health'
    },
    {
      name: 'Local Loopback',
      url: 'http://127.0.0.1:5000/api',
      healthUrl: 'http://127.0.0.1:5000/health'
    },
    {
      name: 'Android Emulator',
      url: 'http://10.0.2.2:5000/api',
      healthUrl: 'http://10.0.2.2:5000/health'
    }
  ];

  const runDiagnostics = async () => {
    setTesting(true);
    setTestResults([]);
    
    const results = [];
    
    for (const endpoint of testEndpoints) {
      try {
        console.log(`🧪 Testing ${endpoint.name}...`);
        const startTime = Date.now();
        
        const response = await fetch(endpoint.healthUrl, {
          method: 'GET',
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (response.ok) {
          let data = null;
          try {
            data = await response.json();
          } catch (e) {
            // Health endpoint might not return JSON
          }
          
          results.push({
            endpoint: endpoint.name,
            url: endpoint.url,
            status: 'success',
            responseTime,
            message: `Connected successfully (${responseTime}ms)`,
            details: data
          });
        } else {
          results.push({
            endpoint: endpoint.name,
            url: endpoint.url,
            status: 'error',
            responseTime,
            message: `HTTP ${response.status} - ${response.statusText}`,
            details: null
          });
        }
      } catch (error) {
        results.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          status: 'error',
          responseTime: null,
          message: error.message || 'Connection failed',
          details: null
        });
      }
    }
    
    setTestResults(results);
    setTesting(false);
  };

  useEffect(() => {
    if (visible) {
      runDiagnostics();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>AdminSupa Network Diagnostics</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {testing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Testing connections...</Text>
            </View>
          )}

          {testResults.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <View style={styles.resultHeader}>
                <Ionicons 
                  name={result.status === 'success' ? 'checkmark-circle' : 'close-circle'} 
                  size={20} 
                  color={result.status === 'success' ? '#10b981' : '#ef4444'} 
                />
                <Text style={styles.endpointText}>{result.endpoint}</Text>
              </View>
              
              <Text style={styles.urlText}>{result.url}</Text>
              
              <Text style={[
                styles.statusText,
                { color: result.status === 'success' ? '#10b981' : '#ef4444' }
              ]}>
                {result.message}
              </Text>
              
              {result.details && (
                <View style={styles.detailsContainer}>
                  <Text style={styles.detailsTitle}>Server Info:</Text>
                  <Text style={styles.detailsText}>
                    Status: {result.details.status || 'Unknown'}
                  </Text>
                  {result.details.version && (
                    <Text style={styles.detailsText}>
                      Version: {result.details.version}
                    </Text>
                  )}
                  {result.details.uptime && (
                    <Text style={styles.detailsText}>
                      Uptime: {Math.floor(result.details.uptime / 60)} minutes
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))}

          {testResults.length > 0 && !testing && (
            <View style={styles.recommendations}>
              <Text style={styles.recommendationsTitle}>Recommendations:</Text>
              
              {testResults.some(r => r.status === 'success') ? (
                <View>
                  <Text style={styles.recommendationText}>
                    ✅ At least one endpoint is working. AdminSupa should function normally.
                  </Text>
                  {testResults.find(r => r.endpoint === 'Render.com Production' && r.status === 'success') ? (
                    <Text style={styles.recommendationText}>
                      🚀 Production server (Render.com) is working - optimal performance.
                    </Text>
                  ) : (
                    <Text style={styles.recommendationText}>
                      ⚠️ Production server unavailable, using local fallback.
                    </Text>
                  )}
                </View>
              ) : (
                <View>
                  <Text style={styles.recommendationText}>
                    ❌ No endpoints are responding. Try:
                  </Text>
                  <Text style={styles.recommendationText}>
                    • Check your internet connection
                  </Text>
                  <Text style={styles.recommendationText}>
                    • Verify the backend server is running
                  </Text>
                  <Text style={styles.recommendationText}>
                    • Try connecting to WiFi or mobile data
                  </Text>
                  <Text style={styles.recommendationText}>
                    • Contact system administrator
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.retestButton} 
            onPress={runDiagnostics}
            disabled={testing}
          >
            <Text style={styles.retestButtonText}>
              {testing ? 'Testing...' : 'Run Test Again'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: 50,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#6b7280',
  },
  resultItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  endpointText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  urlText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 28,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    marginLeft: 28,
  },
  detailsContainer: {
    marginTop: 8,
    marginLeft: 28,
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  detailsText: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  recommendations: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 12,
    color: '#1e40af',
    marginBottom: 4,
  },
  actions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  retestButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  retestButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NetworkDiagnostics;
