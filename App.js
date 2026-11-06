import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerWidgetTaskHandler, requestWidgetUpdate } from 'react-native-android-widget';
import { widgetTaskHandler } from './widget-task-handler';
import { PartnerPhotoWidget } from './index.widget';

// Daftarkan handler widget di level root aplikasi
registerWidgetTaskHandler(widgetTaskHandler);

// Konfigurasi Supabase (Ganti dengan kunci proyek Anda)
const SUPABASE_URL = 'https://YOUR_SUPABASE_URL.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [latestPhoto, setLatestPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Cek sesi login lokal saat aplikasi pertama kali dibuka
  useEffect(() => {
    checkLocalSession();
  }, []);

  // Pasang Realtime Listener setelah pengguna terautentikasi
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchLatestMoment();

    const subscription = supabase
      .channel('public:moments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'moments' }, (payload) => {
        if (payload.new && payload.new.image_url) {
          updateWidgetAndState(payload.new.image_url);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [isAuthenticated]);

  const checkLocalSession = async () => {
    try {
      const session = await AsyncStorage.getItem('user_session');
      if (session) {
        const userData = JSON.parse(session);
        setCurrentUser(userData);
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.error('Gagal memuat sesi lokal', e);
    }
  };

  const handleLogin = async () => {
    if (!passcode) {
      Alert.alert('Perhatian', 'Masukkan passcode rahasia berdua!');
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('passcode', passcode)
        .single();

      if (error || !data) {
        Alert.alert('Gagal', 'Passcode salah! Pastikan kodenya benar.');
      } else {
        await AsyncStorage.setItem('user_session', JSON.stringify(data));
        setCurrentUser(data);
        setIsAuthenticated(true);
      }
    } catch (err) {
      Alert.alert('Error', 'Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestMoment = async () => {
    try {
      const { data, error } = await supabase
        .from('moments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        updateWidgetAndState(data[0].image_url);
      }
    } catch (e) {
      console.error('Gagal mengambil data foto terbaru', e);
    }
  };

  const updateWidgetAndState = async (url) => {
    setLatestPhoto(url);
    await AsyncStorage.setItem('latest_photo_url', url);
    try {
      await requestWidgetUpdate({
        widgetName: 'PartnerPhotoWidget',
        render: <PartnerPhotoWidget imageUrl={url} />,
      });
    } catch (e) {
      console.error('Gagal memperbarui widget', e);
    }
  };

  const pickAndUploadImage = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      uploadImageToSupabase(result.assets[0].uri);
    }
  };

  const uploadImageToSupabase = async (uri) => {
    try {
      setUploading(true);
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `moments/${fileName}`;

      // 1. Upload file ke Supabase Storage Bucket "private-photos"
      const { error: uploadError } = await supabase.storage
        .from('private-photos')
        .upload(filePath, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // 2. Dapatkan public URL file
      const { data: publicURLData } = supabase.storage
        .from('private-photos')
        .getPublicUrl(filePath);

      const imageUrl = publicURLData.publicUrl;

      // 3. Simpan record baris baru ke tabel database 'moments'
      const { error: dbError } = await supabase
        .from('moments')
        .insert([{ sender_id: currentUser.id, image_url: imageUrl }]);

      if (dbError) throw dbError;

      // 4. Perbarui state & widget lokal secara instan
      await updateWidgetAndState(imageUrl);
      Alert.alert('Berhasil', 'Momen foto berhasil dikirim ke pasangan!');
    } catch (error) {
      Alert.alert('Gagal Mengunggah', error.message);
    } finally {
      setUploading(false);
    }
  };

  // --- TAMPILAN HALAMAN LOGIN ---
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginCard}>
          <Text style={styles.title}>🔒 Private Space</Text>
          <Text style={styles.subtitle}>Masukkan Passcode Rahasia Berdua</Text>
          
          <TextInput
            style={styles.input}
            placeholder="••••••"
            placeholderTextColor="#64748b"
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
            value={passcode}
            onChangeText={setPasscode}
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Memverifikasi...' : 'Masuk Ruang Privat'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- TAMPILAN UTAMA APLIKASI ---
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Our Private Space 🤍</Text>
      
      <View style={styles.photoContainer}>
        {latestPhoto ? (
          <Image source={{ uri: latestPhoto }} style={styles.photo} />
        ) : (
          <Text style={styles.placeholderText}>Belum ada foto yang dibagikan.</Text>
        )}
      </View>

      {uploading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f43f5e" />
          <Text style={styles.loadingText}>Mengirim momen...</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.sendButton} onPress={pickAndUploadImage}>
          <Text style={styles.sendButtonText}>📸 Kirim Foto ke Pasangan</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
  loginCard: { width: '100%', maxWidth: 360, alignItems: 'center', padding: 24, backgroundColor: '#1e293b', borderRadius: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 24, textAlign: 'center' },
  input: { width: '100%', height: 52, backgroundColor: '#0f172a', color: '#fff', borderRadius: 12, textAlign: 'center', fontSize: 22, letterSpacing: 6, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  button: { width: '100%', height: 50, backgroundColor: '#f43f5e', justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  photoContainer: { width: '100%', maxWidth: 320, height: 480, backgroundColor: '#1e293b', borderRadius: 20, overflow: 'hidden', marginBottom: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  photo: { width: '100%', height: '100%' },
  placeholderText: { color: '#64748b', fontSize: 14 },
  sendButton: { width: '100%', maxWidth: 320, height: 52, backgroundColor: '#f43f5e', justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', height: 52 },
  loadingText: { color: '#94a3b8', marginTop: 8, fontSize: 12 }
});
