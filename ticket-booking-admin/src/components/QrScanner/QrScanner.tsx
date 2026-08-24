import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography, IconButton, CircularProgress, Alert, Tooltip } from '@mui/material';
import { 
  Videocam, 
  VideocamOff, 
  FlipCameraIos, 
  FlashOn, 
  FlashOff,
  UploadFile
} from '@mui/icons-material';
import { Html5Qrcode, Html5QrcodeCameraScanConfig, CameraDevice } from 'html5-qrcode';

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  isActive?: boolean;
  onActiveChange?: (active: boolean) => void;
  scannerId?: string;
  fps?: number;
  qrbox?: number | { width: number; height: number };
}

export const QrScanner: React.FC<QrScannerProps> = ({
  onScanSuccess,
  onScanError,
  isActive = true,
  onActiveChange,
  scannerId = 'html5-qr-code-scanner',
  fps = 10,
  qrbox = { width: 250, height: 250 }
}) => {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTextRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize camera list
  useEffect(() => {
    let isMounted = true;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isMounted) return;
        if (devices && devices.length) {
          setCameras(devices);
          // Prefer back camera if available
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
        } else {
          setErrorMsg('No camera detected on this device.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Error accessing cameras:', err);
        setErrorMsg('Camera access permission required. Please allow camera access in your browser.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Start scanner when camera is selected and isActive is true
  useEffect(() => {
    if (!isActive || !selectedCameraId) {
      stopScanner();
      return;
    }

    startScanner(selectedCameraId);

    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, selectedCameraId]);

  const startScanner = async (cameraId: string) => {
    try {
      setIsInitializing(true);
      setErrorMsg(null);

      // Stop any existing instance
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerId);
      }

      const config: Html5QrcodeCameraScanConfig = {
        fps,
        qrbox,
        aspectRatio: 1.0,
      };

      await html5QrCodeRef.current.start(
        cameraId,
        config,
        (decodedText) => {
          // Throttle duplicate consecutive scans within 1.5 seconds
          const now = Date.now();
          if (decodedText === lastScannedTextRef.current && now - lastScanTimeRef.current < 1500) {
            return;
          }
          lastScannedTextRef.current = decodedText;
          lastScanTimeRef.current = now;
          onScanSuccess(decodedText);
        },
        (errorMessage) => {
          onScanError?.(errorMessage);
        }
      );

      setIsScanning(true);
      setIsInitializing(false);

      // Check torch capability
      try {
        const capabilities = html5QrCodeRef.current.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        }
      } catch (e) {
        setHasTorch(false);
      }

    } catch (err: any) {
      console.error('Failed to start scanner:', err);
      setIsScanning(false);
      setIsInitializing(false);
      setErrorMsg(err?.message || 'Failed to start camera. Please check camera permissions.');
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        setIsScanning(false);
      }
    } catch (err) {
      console.warn('Error stopping scanner:', err);
    }
  };

  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].id);
  };

  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const newTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: newTorch } as any]
      });
      setTorchOn(newTorch);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      try {
        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode(scannerId);
        }
        const decodedText = await html5QrCodeRef.current.scanFile(file, true);
        onScanSuccess(decodedText);
      } catch (err: any) {
        setErrorMsg('Could not detect a valid QR code in the uploaded image.');
      }
    }
  };

  return (
    <Box sx={{ width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {errorMsg && (
        <Alert severity="warning" sx={{ width: '100%', mb: 1.5, fontSize: '0.85rem' }}>
          {errorMsg}
        </Alert>
      )}

      {/* Video Container Box */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 380,
          aspectRatio: '1/1',
          bgcolor: '#0a0d14',
          borderRadius: 3,
          overflow: 'hidden',
          position: 'relative',
          border: '2px solid rgba(255, 25, 85, 0.4)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {isInitializing && (
          <Box sx={{ position: 'absolute', zIndex: 10, textAlign: 'center', color: '#fff' }}>
            <CircularProgress size={40} sx={{ color: '#ff1955', mb: 1 }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Starting Camera...
            </Typography>
          </Box>
        )}

        {!isScanning && !isInitializing && (
          <Box sx={{ position: 'absolute', zIndex: 5, textAlign: 'center', color: 'rgba(255,255,255,0.4)', p: 3 }}>
            <VideocamOff sx={{ fontSize: 44, mb: 1, color: 'rgba(255,255,255,0.25)' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Camera is turned off
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', display: 'block', mt: 0.5 }}>
              Click "Start Camera" below to begin scanning
            </Typography>
          </Box>
        )}

        {/* The HTML5 QR Code DOM target */}
        <div id={scannerId} style={{ width: '100%', height: '100%' }} />

        {/* Laser scanner animation overlay when active */}
        {isScanning && (
          <Box
            sx={{
              position: 'absolute',
              top: '15%',
              left: '10%',
              right: '10%',
              bottom: '15%',
              border: '2px dashed rgba(255, 25, 85, 0.7)',
              borderRadius: 2,
              pointerEvents: 'none',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, transparent, #ff1955, #ff5c8a, #ff1955, transparent)',
                boxShadow: '0 0 12px #ff1955, 0 0 20px #ff1955',
                animation: 'scanLaser 2.2s ease-in-out infinite alternate',
              },
              '@keyframes scanLaser': {
                '0%': { top: '5%' },
                '100%': { top: '92%' }
              }
            }}
          />
        )}
      </Box>

      {/* Control Buttons */}
      <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {cameras.length > 1 && (
          <Tooltip title="Switch Camera">
            <IconButton
              onClick={handleSwitchCamera}
              sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' } }}
            >
              <FlipCameraIos fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {hasTorch && (
          <Tooltip title={torchOn ? 'Turn Flash Off' : 'Turn Flash On'}>
            <IconButton
              onClick={handleToggleTorch}
              sx={{ 
                bgcolor: torchOn ? '#ff9800' : 'rgba(255,255,255,0.08)', 
                color: torchOn ? '#000' : '#fff',
                '&:hover': { bgcolor: torchOn ? '#f57c00' : 'rgba(255,255,255,0.18)' } 
              }}
            >
              {torchOn ? <FlashOff fontSize="small" /> : <FlashOn fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <Tooltip title="Upload QR Image">
          <IconButton
            onClick={() => fileInputRef.current?.click()}
            sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' } }}
          >
            <UploadFile fontSize="small" />
          </IconButton>
        </Tooltip>

        <Button
          size="small"
          variant="outlined"
          startIcon={isScanning ? <VideocamOff /> : <Videocam />}
          onClick={() => {
            if (isScanning) {
              stopScanner();
              onActiveChange?.(false);
            } else if (selectedCameraId) {
              startScanner(selectedCameraId);
              onActiveChange?.(true);
            } else {
              onActiveChange?.(true);
            }
          }}
          sx={{
            borderColor: isScanning ? 'rgba(255,255,255,0.2)' : '#ff1955',
            color: isScanning ? 'rgba(255,255,255,0.7)' : '#ff1955',
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '0.8rem'
          }}
        >
          {isScanning ? 'Turn Off Camera' : 'Start Camera'}
        </Button>
      </Box>
    </Box>
  );
};

export default QrScanner;
