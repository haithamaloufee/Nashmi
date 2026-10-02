"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Maximize, Minimize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { registerFeedVideo } from "./feedVideoPlayback";

function clock(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export default function FeedVideoPlayer({ url, title }: { url: string; title: string }) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const playback = useRef<ReturnType<typeof registerFeedVideo> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const video = videoRef.current!;
    let disposed = false;
    let pending = false;
    let autoplayBlocked = false;
    let interruptedRetries = 0;
    let retryFrame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const start = () => {
      if (pending || !video.paused || video.ended || autoplayBlocked || disposed) return;
      // Assign the source only when playback is requested; offscreen videos make no requests.
      if (!video.getAttribute("src")) video.src = url;
      else if (video.error) video.load();
      pending = true;
      setFailed(false);
      setLoading(true);
      void video.play().then(() => { interruptedRetries = 0; }).catch((error: unknown) => {
        if (disposed) return;
        setLoading(false);
        // History restoration/scroll can interrupt play without denying autoplay.
        if (error instanceof DOMException && error.name === "AbortError" && interruptedRetries < 2) {
          interruptedRetries++;
          retryFrame = requestAnimationFrame(() => { if (!disposed) coordinator.refresh(); });
        } else autoplayBlocked = true;
      }).finally(() => { pending = false; });
    };
    const coordinator = registerFeedVideo(video, () => {
      if (!reducedMotion.matches && !connection?.saveData) start();
    }, () => { autoplayBlocked = false; interruptedRetries = 0; });
    playback.current = {
      ...coordinator,
      play() {
        autoplayBlocked = false;
        interruptedRetries = 0;
        // User gestures may play even when automatic motion/data loading is disabled.
        coordinator.play();
        if (video.ended) video.currentTime = 0;
        start();
      }
    };
    const onFullscreen = () => setFullscreen(document.fullscreenElement === panelRef.current);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      disposed = true;
      cancelAnimationFrame(retryFrame);
      playback.current = null;
      coordinator.dispose();
      video.removeAttribute("src"); video.load();
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [url]);

  const toggle = () => {
    if (videoRef.current?.paused) playback.current?.play();
    else playback.current?.suspend();
  };
  const updateProgress = () => {
    const video = videoRef.current!;
    setTime(video.currentTime);
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    setBuffered(video.buffered.length && video.duration > 0 ? video.buffered.end(video.buffered.length - 1) / video.duration * 100 : 0);
  };
  const seek = (value: number) => {
    const video = videoRef.current!;
    if (Number.isFinite(video.duration) && video.duration > 0) { video.currentTime = Math.max(0, Math.min(video.duration, value)); setTime(video.currentTime); }
  };
  const toggleMute = () => { const video = videoRef.current!; video.muted = !video.muted; setMuted(video.muted); };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (panelRef.current?.requestFullscreen) await panelRef.current.requestFullscreen();
      else (videoRef.current as HTMLVideoElement & { webkitEnterFullscreen?: () => void })?.webkitEnterFullscreen?.();
    } catch { /* Keep inline controls usable when the browser denies fullscreen. */ }
  };
  const buttonClass = "grid h-11 w-11 shrink-0 place-items-center rounded-full text-white hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white";

  return <div ref={panelRef} data-feed-video className="feed-video-player group relative isolate overflow-hidden bg-black text-white" role="group" aria-label={`${t("video.player")}: ${title}`}>
    <video ref={videoRef} className="aspect-video max-h-[80dvh] w-full object-contain" playsInline muted={muted} preload="none" aria-label={title}
      onPlay={() => setPlaying(true)} onPause={() => { setPlaying(false); setLoading(false); }}
      onPlaying={() => setLoading(false)} onWaiting={() => setLoading(true)}
      onEnded={() => { setPlaying(false); setLoading(false); playback.current?.suspend(); }}
      onLoadedMetadata={updateProgress} onTimeUpdate={updateProgress} onProgress={updateProgress}
      onVolumeChange={() => setMuted(videoRef.current?.muted ?? true)}
      onError={() => { setFailed(true); setLoading(false); }} />
    <button type="button" onClick={toggle} className="absolute inset-0 grid w-full place-items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white" aria-label={playing ? t("video.pause") : t("video.play")}>
      {loading ? <LoaderCircle aria-hidden="true" className="h-10 w-10 animate-spin motion-reduce:animate-none drop-shadow" /> : !playing && !failed ? <span className="grid h-16 w-16 place-items-center rounded-full bg-black/45 ring-1 ring-white/40 backdrop-blur-sm"><Play aria-hidden="true" className="h-7 w-7 fill-white" /></span> : null}
    </button>
    {failed ? <p role="status" className="pointer-events-none absolute inset-x-3 top-1/3 text-center text-sm">{t("video.unavailable")}</p> : null}
    <div className="feed-video-controls relative -mt-16 flex h-16 items-end gap-1 bg-gradient-to-t from-black/90 to-transparent px-2 pb-1" dir="ltr">
      <button type="button" className={buttonClass} onClick={toggle} aria-label={playing ? t("video.pause") : t("video.play")}><span aria-hidden="true">{playing ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}</span></button>
      <span className="feed-video-time mb-3 whitespace-nowrap text-xs tabular-nums" aria-hidden="true">{clock(time)} / {clock(duration)}</span>
      <div className="feed-video-timeline relative mx-2 flex h-11 min-w-8 flex-1 items-center">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 h-1 overflow-hidden rounded-full bg-white/25"><div className="absolute h-full bg-white/45" style={{ width: `${buffered}%` }} /><div className="absolute h-full bg-white" style={{ width: `${duration ? time / duration * 100 : 0}%` }} /></div>
        <input type="range" min="0" max={duration || 1} step="0.1" value={time} disabled={!duration} onChange={event => seek(Number(event.target.value))} aria-label={t("video.seek")} aria-valuetext={`${clock(time)} / ${clock(duration)}`} className="relative h-11 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-white [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent [&::-moz-range-progress]:bg-transparent [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white" />
      </div>
      <button type="button" className={buttonClass} onClick={toggleMute} aria-label={muted ? t("video.unmute") : t("video.mute")} aria-pressed={!muted}>{muted ? <VolumeX aria-hidden="true" className="h-5 w-5" /> : <Volume2 aria-hidden="true" className="h-5 w-5" />}</button>
      <button type="button" className={buttonClass} onClick={() => void toggleFullscreen()} aria-label={fullscreen ? t("video.exitFullscreen") : t("video.fullscreen")}>{fullscreen ? <Minimize aria-hidden="true" className="h-5 w-5" /> : <Maximize aria-hidden="true" className="h-5 w-5" />}</button>
    </div>
  </div>;
}
