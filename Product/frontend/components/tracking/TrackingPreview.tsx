"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { EyeTrackingStatus } from "@/hooks/useEyeTracking";
import { Eye, EyeOff, UserMinus } from "lucide-react";

interface TrackingPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: EyeTrackingStatus;
  className?: string;
}

export const TrackingPreview: React.FC<TrackingPreviewProps> = ({ videoRef, status, className }) => {
  const isError = !status.isFaceDetected || status.isOutOfFrame;
  const isWarning = status.isBlinking || status.isLeftEyeClosed || status.isRightEyeClosed;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card shadow-sm w-full h-full min-h-[300px]",
        isError ? "border-red-300" :
        isWarning ? "border-amber-300" :
        "border-border",
        className
      )}
    >
      {/* Video Feed */}
      <video
        ref={videoRef}
        muted
        autoPlay
        playsInline
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-500 -scale-x-100",
          isError ? "opacity-30 grayscale" : "opacity-100"
        )}
      />

      {/* Top Status Bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between p-3 bg-gradient-to-b from-black/40 to-transparent">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm border border-border text-xs font-medium shadow-sm">
          <div className={cn(
            "w-2 h-2 rounded-full",
            status.isFaceDetected ? "bg-green-500 animate-pulse" : "bg-red-500"
          )} />
          <span className="text-foreground/80">
            {status.isFaceDetected ? "Tracking Active" : "No Face Detected"}
          </span>
        </div>
      </div>

      {/* Center Error State */}
      {isError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/60 backdrop-blur-sm">
          <UserMinus className="w-10 h-10 text-red-400" />
          <p className="text-sm font-medium text-red-500 text-center px-4">
            {status.isOutOfFrame ? "Move closer to the camera" : "Face not detected"}
          </p>
        </div>
      )}

      {/* Bottom Info Bar */}
      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/40 to-transparent">
        <div className="flex items-center justify-between">
          {/* Eye Status */}
          <div className="flex gap-2">
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium backdrop-blur-sm",
              status.isLeftEyeClosed
                ? "bg-amber-100/90 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                : "bg-white/80 text-muted-foreground dark:bg-black/50"
            )}>
              {status.isLeftEyeClosed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>L</span>
            </div>
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium backdrop-blur-sm",
              status.isRightEyeClosed
                ? "bg-amber-100/90 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                : "bg-white/80 text-muted-foreground dark:bg-black/50"
            )}>
              {status.isRightEyeClosed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>R</span>
            </div>
          </div>

          {/* Stability Score */}
          {!isError && (
            <div className="flex items-center gap-3 px-3 py-1 rounded-lg bg-white/80 dark:bg-black/50 backdrop-blur-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground font-medium">EYE</span>
                <span className="text-xs font-bold text-green-600 dark:text-green-400">94</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground font-medium">POS</span>
                <span className="text-xs font-bold text-green-600 dark:text-green-400">88</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
