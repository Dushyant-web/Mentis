import { useEffect, useRef, useState } from "react";

export interface EyeTrackingStatus {
  isFaceDetected: boolean;
  isBlinking: boolean;
  isLeftEyeClosed: boolean;
  isRightEyeClosed: boolean;
  isOutOfFrame: boolean;
  lastUpdate: number;
}

export const useEyeTracking = (onData: (data: any) => void) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<any>(null);
  const requestRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const [status, setStatus] = useState<EyeTrackingStatus>({
    isFaceDetected: false,
    isBlinking: false,
    isLeftEyeClosed: false,
    isRightEyeClosed: false,
    isOutOfFrame: false,
    lastUpdate: Date.now(),
  });

  useEffect(() => {
    mountedRef.current = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 }, 
                height: { ideal: 480 },
                facingMode: "user" 
            } 
        });
        
        if (!mountedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        const { FaceMesh } = await import("@mediapipe/face_mesh");
        if (!mountedRef.current) return;

        const faceMesh = new FaceMesh({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        faceMeshRef.current = faceMesh;

      faceMesh.setOptions({
        selfieMode: true,
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      let lastEmit = 0;
      let smoothX: number | null = null;
      let smoothY: number | null = null;

      faceMesh.onResults((results: any) => {
        const now = Date.now();
        
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            setStatus(prev => ({
                ...prev,
                isFaceDetected: false,
                isOutOfFrame: true,
                lastUpdate: now
            }));
            return;
        }

        const landmarks = results.multiFaceLandmarks[0];
        if (!landmarks) return;

        // -------------------------
        // 👁️ BLINK DETECTION (EAR)
        // -------------------------
        // Left Eye: 159 (upper), 145 (lower), 130 (inner), 243 (outer)
        // Right Eye: 386 (upper), 374 (lower), 362 (inner), 263 (outer)
        
        const getDistance = (p1: any, p2: any) => {
            return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        };

        const leftEAR = getDistance(landmarks[159], landmarks[145]) / getDistance(landmarks[130], landmarks[243]);
        const rightEAR = getDistance(landmarks[386], landmarks[374]) / getDistance(landmarks[362], landmarks[263]);

        const EAR_THRESHOLD = 0.22;
        const leftClosed = leftEAR < EAR_THRESHOLD;
        const rightClosed = rightEAR < EAR_THRESHOLD;

        setStatus({
            isFaceDetected: true,
            isBlinking: leftClosed && rightClosed,
            isLeftEyeClosed: leftClosed,
            isRightEyeClosed: rightClosed,
            isOutOfFrame: false,
            lastUpdate: now
        });

        // throttle to ~60fps
        if (now - lastEmit < 16) return;
        lastEmit = now;

        if (!landmarks[468] || !landmarks[473]) return;

        const leftEye = landmarks[468];
        const rightEye = landmarks[473];

        let gazeX = (leftEye.x + rightEye.x) / 2;
        let gazeY = (leftEye.y + rightEye.y) / 2;

        const alpha = 0.35;
        if (smoothX === null || smoothY === null) {
          smoothX = gazeX;
          smoothY = gazeY;
        } else {
          smoothX = alpha * gazeX + (1 - alpha) * smoothX;
          smoothY = alpha * gazeY + (1 - alpha) * smoothY;
        }

        const scaledX = smoothX * 1000;
        const scaledY = smoothY * 1000;
        const point = { x: scaledX, y: scaledY, time: now };

        if (!(window as any).__eyeBuffer) {
          (window as any).__eyeBuffer = [];
          (window as any).__lastPoint = null;
        }

        const buffer = (window as any).__eyeBuffer as any[];
        const lastPoint = (window as any).__lastPoint as any | null;

        let velocity = 0;
        if (lastPoint) {
          const dx = point.x - lastPoint.x;
          const dy = point.y - lastPoint.y;
          velocity = Math.sqrt(dx * dx + dy * dy);
        }

        (window as any).__lastPoint = point;
        buffer.push({ ...point, velocity });

        const WINDOW = 15;
        if (buffer.length > WINDOW) buffer.shift();

        const avgVel = buffer.reduce((s, p) => s + (p.velocity || 0), 0) / (buffer.length || 1);
        const FIXATION_THRESHOLD = 25;
        const isFixation = avgVel < FIXATION_THRESHOLD;

        if (isFixation && buffer.length === WINDOW) {
          const cx = buffer.reduce((s, p) => s + p.x, 0) / buffer.length;
          const cy = buffer.reduce((s, p) => s + p.y, 0) / buffer.length;

          onData({
            x: cx,
            y: cy,
            time: now,
            type: "fixation",
            velocity: avgVel,
          });

          (window as any).__eyeBuffer = [];
        } else {
          onData({
            x: scaledX,
            y: scaledY,
            time: now,
            type: isFixation ? "smooth" : "saccade",
            velocity,
          });
        }
      });

        // 🚀 SPEED: FaceMesh inference is the heaviest op (esp. on iPad/tablets).
        // Throttle to ~20fps instead of running every animation frame (~60fps).
        // Gaze tracking does not need 60fps — this cuts CPU/GPU work ~3x.
        let lastSend = 0;
        const SEND_INTERVAL_MS = 50; // ~20fps

        const detect = async () => {
          if (!mountedRef.current) return;
          const now = Date.now();
          if (now - lastSend >= SEND_INTERVAL_MS && videoRef.current && faceMeshRef.current) {
            lastSend = now;
            try {
              await faceMeshRef.current.send({ image: videoRef.current });
            } catch (e) {
              console.warn("FaceMesh send error:", e);
            }
          }
          requestRef.current = requestAnimationFrame(detect);
        };

        requestRef.current = requestAnimationFrame(detect);
      } catch (e) {
        console.error("Eye tracking init error:", e);
      }
    };

    start();

    return () => {
      mountedRef.current = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);

      if (faceMeshRef.current) {
        try {
          faceMeshRef.current.close();
        } catch (e) {
          console.warn("FaceMesh cleanup error:", e);
        }
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      (window as any).__eyeBuffer = [];
      (window as any).__lastPoint = null;
    };
  }, []);

  return { videoRef, status };
};
