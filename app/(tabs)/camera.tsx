import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CameraType, CameraView, useCameraPermissions, CameraCapturedPicture } from 'expo-camera';

const SUNUCU_URL = 'https://traffic-1-j4pi.onrender.com';

export default function LiveCameraStream() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [streaming, setStreaming] = useState(true);
  const [serverResult, setServerResult] = useState<string | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (streaming && permission?.granted) {
      interval = setInterval(() => {
        captureAndSend();
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [streaming, permission]);

  const captureAndSend = async () => {
    if (cameraRef.current) {
      try {
        const photo: CameraCapturedPicture = await cameraRef.current.takePictureAsync({
          quality: 0.3,
          skipProcessing: true,
        });

        if (!photo || !photo.uri) {
          console.log('Fotoğraf alınamadı.');
          return;
        }

        console.log('Fotoğraf alındı:', photo.uri);

        const formData = new FormData();
        formData.append('file', {
          uri: photo.uri,
          name: 'frame.jpg',
          type: 'image/jpeg',
        } as any);

        const response = await fetch(`${SUNUCU_URL}/predict`, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Sunucuya gönderim sırasında hata oluştu');
        }

        const result = await response.json();
        console.log('Sunucudan gelen sonuç:', result);
        setServerResult(JSON.stringify(result));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
        console.log('Gönderim hatası:', errorMessage);
        setServerResult('Gönderim hatası: ' + errorMessage);
      }
    }
  };

  if (!permission?.granted) {
    return <Text>İzin gerekli</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing={'back'} />
      {serverResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{serverResult}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  resultContainer: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  resultText: {
    color: '#fff',
  },
});
