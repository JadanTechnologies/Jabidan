import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';

export const useHandTracking = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number; isPinching: boolean; isVisible: boolean }>({
    x: 0.5,
    y: 0.5,
    isPinching: false,
    isVisible: false,
  });
  
  // Use a ref for the latest cursor state to avoid closure staleness in animation loops if accessed directly,
  // though we primarily export the state for React updates.
  const cursorRef = useRef(cursor);

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;

    const setupMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });

      startWebcam();
    };

    const startWebcam = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: 640,
              height: 480,
            },
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", predictWebcam);
          }
        } catch (err) {
          console.error("Error accessing webcam:", err);
        }
      }
    };

    let lastVideoTime = -1;
    const predictWebcam = async () => {
      if (videoRef.current && handLandmarker) {
        let startTimeMs = performance.now();
        
        if (videoRef.current.currentTime !== lastVideoTime) {
          lastVideoTime = videoRef.current.currentTime;
          const detections = handLandmarker.detectForVideo(videoRef.current, startTimeMs);

          if (detections.landmarks && detections.landmarks.length > 0) {
            const landmarks = detections.landmarks[0];
            
            // Index finger tip (8) and Thumb tip (4)
            const indexTip = landmarks[8];
            const thumbTip = landmarks[4];

            // Calculate distance for pinch
            const distance = Math.hypot(
              indexTip.x - thumbTip.x,
              indexTip.y - thumbTip.y
            );

            // Pinch threshold - Adjusted to be more sensitive as requested (0.05 is standard, 0.08 is easier)
            const isPinching = distance < 0.08;

            // Use index finger tip as cursor position
            // Mirror X because webcam is mirrored
            const x = 1.0 - indexTip.x;
            const y = indexTip.y;

            const newCursor = { x, y, isPinching, isVisible: true };
            cursorRef.current = newCursor;
            setCursor(newCursor);
          } else {
             setCursor(prev => ({ ...prev, isVisible: false }));
             cursorRef.current = { ...cursorRef.current, isVisible: false };
          }
        }
        animationFrameId = requestAnimationFrame(predictWebcam);
      }
    };

    setupMediaPipe();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (handLandmarker) {
        handLandmarker.close();
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return { videoRef, cursor, cursorRef };
};
