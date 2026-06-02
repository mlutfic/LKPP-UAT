"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import jsQR from "jsqr";
import { Camera, CameraOff, ScanLine, Upload, X } from "lucide-react";

import { AppButton } from "@/components/ui/app-button";
import { AppNotice } from "@/components/ui/app-notice";
import { AppSelect } from "@/components/ui/app-select";

type BarcodeDetectorResultLike = {
  rawValue?: string;
};

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetectorResultLike[]>;
};

type BarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
  }
}

function isFirefoxBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /firefox/i.test(navigator.userAgent);
}

function getCameraErrorMessage(error: unknown, firefoxMode: boolean) {
  const name = error instanceof Error ? error.name : "";
  const rawMessage = error instanceof Error ? error.message : "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Akses kamera ditolak. Izinkan kamera di browser lalu coba lagi.";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Kamera tidak ditemukan di perangkat ini. Gunakan input manual di bawah.";
  }

  if (
    name === "NotReadableError" ||
    name === "TrackStartError" ||
    name === "AbortError" ||
    /Failed to allocate videosource/i.test(rawMessage)
  ) {
    return firefoxMode
      ? "Firefox belum berhasil membuka kamera. Coba pilih kamera lain, upload gambar QR, atau gunakan input manual."
      : "Kamera sedang dipakai aplikasi lain atau belum siap. Tutup aplikasi kamera lain lalu coba lagi.";
  }

  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return firefoxMode
      ? "Firefox belum cocok dengan kamera ini. Coba pilih kamera lain, upload gambar QR, atau gunakan input manual."
      : "Pengaturan kamera tidak cocok di perangkat ini. Coba lagi atau gunakan input manual.";
  }

  return firefoxMode
    ? "Kamera Firefox belum berhasil dibuka. Coba pilih kamera lain, upload gambar QR, atau gunakan input manual."
    : "Kamera tidak bisa diakses. Gunakan input manual di bawah.";
}

export function LobbyQrScanner({
  onDetected,
  disabled = false,
  autoStart = false,
}: {
  onDetected: (value: string) => void;
  disabled?: boolean;
  autoStart?: boolean;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const frameRef = React.useRef<number | null>(null);
  const detectorRef = React.useRef<BarcodeDetectorLike | null>(null);
  const isProcessingRef = React.useRef(false);
  const hasAutoStartedRef = React.useRef(false);
  const uploadInputRef = React.useRef<HTMLInputElement | null>(null);

  const [isSupported, setIsSupported] = React.useState(false);
  const [isActive, setIsActive] = React.useState(false);
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [isStarting, setIsStarting] = React.useState(false);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [showFirefoxOptions, setShowFirefoxOptions] = React.useState(false);
  const [availableCameras, setAvailableCameras] = React.useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = React.useState("");

  const attachVideoStream = React.useCallback(async (video: HTMLVideoElement | null) => {
    const stream = streamRef.current;
    if (!video || !stream) {
      return;
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    await video.play();
  }, []);

  const setVideoElement = React.useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;

    if (!video) {
      return;
    }

    void attachVideoStream(video).catch(() => undefined);
  }, [attachVideoStream]);

  const stopScanner = React.useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    isProcessingRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
  }, []);

  const closeScanner = React.useCallback(() => {
    stopScanner();
    setIsScannerOpen(false);
  }, [stopScanner]);

  const refreshFirefoxCameras = React.useCallback(async () => {
    if (!isFirefoxBrowser() || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === "videoinput");
      setAvailableCameras(cameras);
      setSelectedCameraId((currentValue) => currentValue || cameras[0]?.deviceId || "");
    } catch {
      // Ignore camera listing failures; live scan and manual fallback stay available.
    }
  }, []);

  const decodeUploadedQrImage = React.useCallback(async (file: File) => {
    const imageUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error("Gambar QR tidak bisa dibaca."));
        nextImage.src = imageUrl;
      });

      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d", { willReadFrequently: true });
      const frameWidth = image.naturalWidth || image.width;
      const frameHeight = image.naturalHeight || image.height;

      if (!canvas || !context || frameWidth <= 0 || frameHeight <= 0) {
        throw new Error("Gambar QR tidak bisa diproses.");
      }

      canvas.width = frameWidth;
      canvas.height = frameHeight;
      context.drawImage(image, 0, 0, frameWidth, frameHeight);
      const imageData = context.getImageData(0, 0, frameWidth, frameHeight);

      return (
        jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        })?.data?.trim() || ""
      );
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }, []);

  const scanFrame = React.useCallback(async () => {
    const video = videoRef.current;

    if (!video || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
      frameRef.current = window.requestAnimationFrame(() => {
        void scanFrame();
      });
      return;
    }

    if (isProcessingRef.current) {
      frameRef.current = window.requestAnimationFrame(() => {
        void scanFrame();
      });
      return;
    }

    isProcessingRef.current = true;

    try {
      let rawValue = "";
      const detector = detectorRef.current;

      if (detector) {
        const results = await detector.detect(video);
        rawValue =
          results.find((item) => typeof item.rawValue === "string" && item.rawValue.trim())
            ?.rawValue?.trim() || "";
      } else {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d", { willReadFrequently: true });
        const frameWidth = video.videoWidth;
        const frameHeight = video.videoHeight;

        if (canvas && context && frameWidth > 0 && frameHeight > 0) {
          if (canvas.width !== frameWidth) {
            canvas.width = frameWidth;
          }
          if (canvas.height !== frameHeight) {
            canvas.height = frameHeight;
          }

          context.drawImage(video, 0, 0, frameWidth, frameHeight);
          const imageData = context.getImageData(0, 0, frameWidth, frameHeight);
          rawValue =
            jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "attemptBoth",
            })?.data?.trim() || "";
        }
      }

      if (rawValue) {
        closeScanner();
        onDetected(rawValue);
        return;
      }
    } catch {
      // Keep scanner calm; manual fallback stays available if detection fails.
    } finally {
      isProcessingRef.current = false;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      void scanFrame();
    });
  }, [closeScanner, onDetected]);

  const startScanner = React.useCallback(async (openFullscreen = true) => {
    if (disabled) return;

    if (streamRef.current) {
      if (openFullscreen) {
        setIsScannerOpen(true);
      }
      await attachVideoStream(videoRef.current);
      setIsActive(true);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Browser ini belum mendukung scan kamera. Gunakan input manual di bawah.");
      setIsSupported(false);
      return;
    }

    setIsStarting(true);
    if (openFullscreen) {
      setIsScannerOpen(true);
    }
    setCameraError(null);

    try {
      detectorRef.current = window.BarcodeDetector
        ? new window.BarcodeDetector({
            formats: ["qr_code"],
          })
        : null;

      const firefoxMode = isFirefoxBrowser();
      let stream: MediaStream;

      if (firefoxMode) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: selectedCameraId
              ? {
                  deviceId: {
                    exact: selectedCameraId,
                  },
                }
              : true,
            audio: false,
          });
        } catch (firefoxError) {
          if (selectedCameraId) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } else {
            throw firefoxError;
          }
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });
      }

      streamRef.current = stream;
      await attachVideoStream(videoRef.current);
      void refreshFirefoxCameras();

      setIsActive(true);
      frameRef.current = window.requestAnimationFrame(() => {
        void scanFrame();
      });
    } catch (error) {
      const message = getCameraErrorMessage(error, isFirefoxBrowser());
      setCameraError(message);
      stopScanner();
      setIsScannerOpen(false);
    } finally {
      setIsStarting(false);
    }
  }, [attachVideoStream, disabled, refreshFirefoxCameras, scanFrame, selectedCameraId, stopScanner]);

  React.useEffect(() => {
    setIsSupported(Boolean(navigator.mediaDevices?.getUserMedia));
    setShowFirefoxOptions(isFirefoxBrowser());
    return () => stopScanner();
  }, [stopScanner]);

  React.useEffect(() => {
    if (!showFirefoxOptions) {
      setAvailableCameras([]);
      setSelectedCameraId("");
      return;
    }

    void refreshFirefoxCameras();
  }, [refreshFirefoxCameras, showFirefoxOptions]);

  React.useEffect(() => {
    if (disabled && isActive) {
      closeScanner();
    }
  }, [closeScanner, disabled, isActive]);

  React.useEffect(() => {
    if (!autoStart) {
      hasAutoStartedRef.current = false;
      return;
    }

    if (disabled || isActive || isStarting || hasAutoStartedRef.current) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return;
    }

    if (isFirefoxBrowser()) {
      return;
    }

    hasAutoStartedRef.current = true;
    setIsScannerOpen(true);
    void startScanner(false);
  }, [autoStart, disabled, isActive, isStarting, startScanner]);

  React.useEffect(() => {
    if (!isScannerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isScannerOpen]);

  const scannerOverlay = isScannerOpen
    ? createPortal(
        <div className="fixed inset-0 z-[120] bg-black">
          <div className="absolute inset-0">
            <video
              ref={setVideoElement}
              className="h-full w-full object-cover"
              playsInline
              muted
              aria-label="Kamera scan QR"
            />
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/75" />

          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 p-4 text-white">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                Scan QR
              </p>
              <p className="mt-1 text-sm font-semibold">
                Arahkan QR ke dalam bingkai
              </p>
            </div>

            <button
              type="button"
              onClick={closeScanner}
              className="inline-flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur"
              aria-label="Tutup kamera"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="relative aspect-square w-full max-w-[min(78vw,420px)] rounded-[2rem] border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.38)]">
              <div className="absolute inset-x-6 top-0 h-1 rounded-full bg-white/80 shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
              <div className="absolute left-5 top-5 size-10 rounded-tl-[1.25rem] border-l-4 border-t-4 border-white" />
              <div className="absolute right-5 top-5 size-10 rounded-tr-[1.25rem] border-r-4 border-t-4 border-white" />
              <div className="absolute bottom-5 left-5 size-10 rounded-bl-[1.25rem] border-b-4 border-l-4 border-white" />
              <div className="absolute bottom-5 right-5 size-10 rounded-br-[1.25rem] border-b-4 border-r-4 border-white" />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-10 p-5 text-center text-white">
            <p className="text-sm font-semibold">
              QR akan terbaca otomatis saat kamera fokus.
            </p>
            <p className="mt-1 text-sm text-white/72">
              Jika kamera bermasalah, tutup scan lalu pakai input manual.
            </p>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-surface-container-lowest">
        <div className="flex aspect-[4/3] items-center justify-center bg-surface-container-low">
          <div className="flex max-w-sm flex-col items-center gap-3 px-6 py-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-role-accent-soft text-role-accent">
              <ScanLine className="size-7" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Scan QR antrean dari layar tamu
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                Saat kamera diaktifkan, scanner akan terbuka penuh agar QR lebih mudah terbaca.
              </p>
            </div>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" aria-hidden />

      {showFirefoxOptions ? (
        <div className="space-y-3 rounded-[24px] border border-border bg-surface-container-lowest p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Mode Firefox</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Pilih kamera yang ingin dipakai. Jika live camera masih gagal, upload gambar QR atau lanjutkan input manual.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Sumber kamera
            </p>
            <AppSelect
              value={selectedCameraId}
              onChange={(event) => setSelectedCameraId(event.target.value)}
              disabled={disabled || isStarting || availableCameras.length === 0}
            >
              <option value="">
                {availableCameras.length > 0 ? "Gunakan kamera default Firefox" : "Kamera akan muncul setelah izin diberikan"}
              </option>
              {availableCameras.map((camera, index) => (
                <option key={camera.deviceId || `${camera.kind}-${index}`} value={camera.deviceId}>
                  {camera.label.trim() || `Kamera ${index + 1}`}
                </option>
              ))}
            </AppSelect>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <AppButton
          type="button"
          onClick={isActive || isScannerOpen ? closeScanner : () => void startScanner()}
          disabled={disabled || isStarting}
        >
          {isActive || isScannerOpen ? (
            <>
              <CameraOff className="size-4" />
              Hentikan kamera
            </>
          ) : (
            <>
              <Camera className="size-4" />
              {isStarting ? "Menyalakan kamera..." : "Aktifkan kamera"}
            </>
          )}
        </AppButton>

        {showFirefoxOptions ? (
          <>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";

                if (!file || disabled) {
                  return;
                }

                closeScanner();
                setIsUploadingImage(true);
                setCameraError(null);

                void decodeUploadedQrImage(file)
                  .then((rawValue) => {
                    if (!rawValue) {
                      setCameraError("QR pada gambar belum terbaca. Coba gambar lain atau gunakan input manual.");
                      return;
                    }

                    onDetected(rawValue);
                  })
                  .catch(() => {
                    setCameraError("Gambar QR tidak bisa diproses. Coba gambar lain atau gunakan input manual.");
                  })
                  .finally(() => {
                    setIsUploadingImage(false);
                  });
              }}
            />
            <AppButton
              type="button"
              variant="outline"
              disabled={disabled || isUploadingImage}
              loading={isUploadingImage}
              loadingLabel="Memproses gambar..."
              onClick={() => uploadInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Upload gambar QR
            </AppButton>
          </>
        ) : null}
      </div>

      {!isSupported ? (
        <AppNotice
          icon={ScanLine}
          title="Kamera belum tersedia"
          description="Gunakan input manual untuk QR text atau ID antrean."
        />
      ) : null}

      {cameraError ? (
        <AppNotice
          icon={CameraOff}
          title="Kamera belum aktif"
          description={cameraError}
          tone="warning"
        />
      ) : null}

      {showFirefoxOptions ? (
        <AppNotice
          icon={Camera}
          title="Jalur aman Firefox"
          description="Chrome tetap memakai alur lama. Di Firefox, gunakan pilih kamera atau upload QR jika live camera tidak stabil."
        />
      ) : null}

      {scannerOverlay}
    </div>
  );
}
