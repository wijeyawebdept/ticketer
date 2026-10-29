import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Button, Typography, IconButton, CircularProgress, Alert, Tooltip } from '@mui/material';
import { 
  Videocam, 
  VideocamOff, 
  FlipCameraIos, 
  FlashOn, 
  FlashOff,
  UploadFile,
  Refresh as RefreshIcon
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
  resetScanTrigger?: any;
}

export const QrScanner: React.FC<QrScannerProps> = ({
  onScanSuccess,
  onScanError,
  isActive = true,
  onActiveChange,
  scannerId = 'html5-qr-code-scanner',
  fps = 10,
  qrbox = { width: 250, height: 250 },
  resetScanTrigger,
}) => {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const activeCameraIdRef = useRef<string | null>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const lastScannedTextRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onScanSuccessRef = useRef(onScanSuccess);
  onScanSuccessRef.current = onScanSuccess;
  const onScanErrorRef = useRef(onScanError);
  onScanErrorRef.current = onScanError;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Clear throttle when resetScanTrigger changes (e.g. event or schedule changed)
  useEffect(() => {
    lastScannedTextRef.current = '';
    lastScanTimeRef.current = 0;
  }, [resetScanTrigger]);

  // Safe camera stop & clear
  const stopScanner = useCallback(async () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    try {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        try {
          await html5QrCodeRef.current.clear();
        } catch (clearErr) {
          // Ignore DOM clear errors during unmount
        }
        html5QrCodeRef.current = null;
      }
      if (mountedRef.current) {
        setIsScanning(false);
        setIsInitializing(false);
        setTorchOn(false);
        setHasTorch(false);
      }
      activeCameraIdRef.current = null;
    } catch (err) {
      console.warn('Error stopping scanner:', err);
    } finally {
      isTransitioningRef.current = false;
    }
  }, []);

  // Camera enumeration helper
  const loadCameras = useCallback(async (autoSelectPreferred = false): Promise<CameraDevice[]> => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!mountedRef.current) return [];
      if (devices && devices.length > 0) {
        setCameras(devices);
        if (autoSelectPreferred) {
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('environment')
          );
          const preferredId = backCamera ? backCamera.id : devices[0].id;
          setSelectedCameraId((prev) => prev || preferredId);
        }
        return devices;
      } else {
        return [];
      }
    } catch (err: any) {
      console.warn('Error querying camera devices:', err);
      return [];
    }
  }, []);

  // Safe scanner start with race-condition prevention & mobile optimization
  const startScanner = useCallback(async (cameraIdToUse?: string) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    if (mountedRef.current) {
      setIsInitializing(true);
      setErrorMsg(null);
    }

    // Check for Secure Context on mobile (HTTPS or localhost required for getUserMedia)
    if (
      typeof window !== 'undefined' &&
      window.isSecureContext === false &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      if (mountedRef.current) {
        setIsInitializing(false);
        setIsScanning(false);
        setErrorMsg('Mobile browser blocks camera on HTTP. Please access via HTTPS or hosted domain.');
      }
      isTransitioningRef.current = false;
      return;
    }

    try {
      // 1. Clear any running instance
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          await html5QrCodeRef.current.clear();
        } catch (e) {
          // Ignore cleanup error
        }
        html5QrCodeRef.current = null;
      }

      // Check DOM container
      const container = document.getElementById(scannerId);
      if (!container) {
        throw new Error('Scanner container element not found in DOM.');
      }

      // Determine camera target: prefer explicit ID, then selectedCameraId, fallback to environment facingMode
      let cameraTarget: string | { facingMode: string } = cameraIdToUse || selectedCameraId || '';
      if (!cameraTarget) {
        // Default to rear environment camera on mobile
        cameraTarget = { facingMode: 'environment' };
      }

      const instance = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = instance;

      // Dynamic responsive QR box so it never exceeds video viewfinder on mobile devices
      const config: Html5QrcodeCameraScanConfig = {
        fps,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edge = Math.floor(minEdge * 0.72);
          return {
            width: Math.max(160, Math.min(edge, 280)),
            height: Math.max(160, Math.min(edge, 280)),
          };
        },
      };

      await instance.start(
        cameraTarget,
        config,
        (decodedText) => {
          const now = Date.now();
          if (decodedText === lastScannedTextRef.current && now - lastScanTimeRef.current < 1500) {
            return;
          }
          lastScannedTextRef.current = decodedText;
          lastScanTimeRef.current = now;
          onScanSuccessRef.current(decodedText);
        },
        (errorMessage) => {
          onScanErrorRef.current?.(errorMessage);
        }
      );

      if (mountedRef.current) {
        setIsScanning(true);
        setIsInitializing(false);
        setErrorMsg(null);
        activeCameraIdRef.current = typeof cameraTarget === 'string' ? cameraTarget : 'environment';

        // Refresh camera list now that camera permission is granted (gets real device labels on iOS/Android without mutating selection)
        loadCameras(false);

        try {
          const capabilities = instance.getRunningTrackCapabilities();
          if (capabilities && (capabilities as any).torch) {
            setHasTorch(true);
          }
        } catch {
          setHasTorch(false);
        }
      }
    } catch (err: any) {
      console.error('Failed to start scanner:', err);
      if (mountedRef.current) {
        setIsScanning(false);
        setIsInitializing(false);
        setErrorMsg(err?.message || 'Could not access camera. Please check permissions and click Retry.');
      }
    } finally {
      isTransitioningRef.current = false;
    }
  }, [fps, loadCameras, scannerId, selectedCameraId]);

  // Initial camera enumeration with preferred selection
  useEffect(() => {
    loadCameras(true);
  }, [loadCameras]);

  // Start or stop based on isActive & selectedCameraId
  useEffect(() => {
    if (!isActive) {
      stopScanner();
    } else {
      const targetCam = selectedCameraId || 'environment';
      if (html5QrCodeRef.current?.isScanning && activeCameraIdRef.current === targetCam) {
        return;
      }
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isActive, selectedCameraId, startScanner, stopScanner]);

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

  const handleTogglePower = () => {
    const next = !isActive;
    onActiveChange?.(next);
  };

  const handleRetry = () => {
    setErrorMsg(null);
    if (!isActive) {
      onActiveChange?.(true);
    } else {
      startScanner();
    }
  };

  return (
    <Box sx={{ width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {errorMsg && (
        <Alert
          severity="warning"
          onClose={() => setErrorMsg(null)}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon sx={{ fontSize: '0.9rem !important' }} />}
              onClick={handleRetry}
              sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'none', ml: 0.5 }}
            >
              Retry
            </Button>
          }
          sx={{
            width: '100%',
            maxWidth: { xs: '100%', sm: 360 },
            mb: { xs: 1, sm: 1.5 },
            py: { xs: 0.25, sm: 0.4 },
            px: { xs: 1, sm: 1.5 },
            fontSize: { xs: '0.72rem', sm: '0.78rem' },
            lineHeight: 1.3,
            borderRadius: 2,
            alignItems: 'center',
            bgcolor: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.28)',
            color: '#fbbf24',
            '& .MuiAlert-icon': {
              fontSize: { xs: 16, sm: 18 },
              mr: 0.8,
              p: 0,
              color: '#f59e0b',
            },
            '& .MuiAlert-message': {
              p: 0,
              fontWeight: 500,
            },
          }}
        >
          {errorMsg}
        </Alert>
      )}

      {/* Video Container Box */}
      <Box
        sx={{
          width: '100%',
          maxWidth: { xs: 260, sm: 320, md: 360 },
          aspectRatio: '1/1',
          bgcolor: '#0a0d14',
          borderRadius: { xs: 2, sm: 3 },
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
            <CircularProgress size={32} sx={{ color: '#ff1955', mb: 1 }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
              Starting Camera...
            </Typography>
          </Box>
        )}

        {!isScanning && !isInitializing && (
          <Box sx={{ position: 'absolute', zIndex: 5, textAlign: 'center', color: 'rgba(255,255,255,0.4)', p: { xs: 1.5, sm: 3 } }}>
            <VideocamOff sx={{ fontSize: { xs: 32, sm: 44 }, mb: 0.6, color: 'rgba(255,255,255,0.25)' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.78rem', sm: '0.875rem' } }}>
              Camera is turned off
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', display: 'block', mt: 0.3, fontSize: { xs: '0.65rem', sm: '0.72rem' } }}>
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
      <Box sx={{ display: 'flex', gap: { xs: 0.8, sm: 1 }, mt: 1.2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {cameras.length > 1 && (
          <Tooltip title="Switch Camera">
            <IconButton
              size="small"
              onClick={handleSwitchCamera}
              sx={{ bgcolor: '#f1f5f9', color: '#1e293b', border: '1px solid #e2e8f0', '&:hover': { bgcolor: '#e2e8f0' }, p: { xs: 0.5, sm: 0.7 } }}
            >
              <FlipCameraIos sx={{ fontSize: { xs: 16, sm: 18 } }} />
            </IconButton>
          </Tooltip>
        )}

        {hasTorch && (
          <Tooltip title={torchOn ? 'Turn Flash Off' : 'Turn Flash On'}>
            <IconButton
              size="small"
              onClick={handleToggleTorch}
              sx={{ 
                bgcolor: torchOn ? '#ff9800' : '#f1f5f9', 
                color: torchOn ? '#ffffff' : '#1e293b',
                border: '1px solid #e2e8f0',
                p: { xs: 0.5, sm: 0.7 },
                '&:hover': { bgcolor: torchOn ? '#f57c00' : '#e2e8f0' } 
              }}
            >
              {torchOn ? <FlashOff sx={{ fontSize: { xs: 16, sm: 18 } }} /> : <FlashOn sx={{ fontSize: { xs: 16, sm: 18 } }} />}
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
            size="small"
            onClick={() => fileInputRef.current?.click()}
            sx={{ bgcolor: '#f1f5f9', color: '#1e293b', border: '1px solid #e2e8f0', '&:hover': { bgcolor: '#e2e8f0' }, p: { xs: 0.5, sm: 0.7 } }}
          >
            <UploadFile sx={{ fontSize: { xs: 16, sm: 18 } }} />
          </IconButton>
        </Tooltip>

        <Button
          size="small"
          variant="outlined"
          startIcon={isScanning ? <VideocamOff sx={{ fontSize: '1rem !important' }} /> : <Videocam sx={{ fontSize: '1rem !important' }} />}
          onClick={handleTogglePower}
          sx={{
            borderColor: isScanning ? '#cbd5e1' : '#ff1955',
            color: isScanning ? '#64748b' : '#ff1955',
            borderRadius: 2,
            textTransform: 'none',
            fontSize: { xs: '0.72rem', sm: '0.78rem' },
            fontWeight: 600,
            py: { xs: 0.35, sm: 0.5 },
            px: { xs: 1.2, sm: 1.6 },
            '&:hover': {
              borderColor: '#ff1955',
              bgcolor: 'rgba(255, 25, 85, 0.05)',
            }
          }}
        >
          {isScanning ? 'Turn Off Camera' : 'Start Camera'}
        </Button>
      </Box>
    </Box>
  );
};

export default QrScanner;
