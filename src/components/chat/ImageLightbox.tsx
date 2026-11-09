'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Download, ImageOff, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import toast from 'react-hot-toast';

export interface LightboxImage {
  id: string;
  src: string;
  name?: string;
  caption?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.5;
const SWIPE_THRESHOLD_PX = 60;
const CLOSE_ANIMATION_MS = 180;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function fileNameFor(image: LightboxImage) {
  if (image.name) return image.name;
  const last = image.src.split('?')[0].split('/').pop();
  return last || 'image';
}

export default function ImageLightbox({ images, index, onIndexChange, onClose }: ImageLightboxProps) {
  const image = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDownloading, setIsDownloading] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ startDist: number; startScale: number; startX: number; startY: number; lastX: number; lastY: number } | null>(null);

  // Open animation, focus management and background scroll lock
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => setVisible(true));
    closeButtonRef.current?.focus();
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // New image: show the spinner again and reset zoom
  useEffect(() => {
    setStatus('loading');
    resetZoom();
  }, [image?.src, resetZoom]);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    setTimeout(onClose, CLOSE_ANIMATION_MS);
  }, [onClose]);

  const zoomTo = useCallback((next: number) => {
    const s = clamp(next, MIN_SCALE, MAX_SCALE);
    setScale(s);
    if (s === 1) setOffset({ x: 0, y: 0 });
  }, []);

  const goPrev = useCallback(() => hasPrev && onIndexChange(index - 1), [hasPrev, index, onIndexChange]);
  const goNext = useCallback(() => hasNext && onIndexChange(index + 1), [hasNext, index, onIndexChange]);

  const handleDownload = useCallback(async () => {
    if (!image || isDownloading) return;
    setIsDownloading(true);
    try {
      // Fetch as a blob so the browser saves the file instead of navigating to it
      const res = await fetch(image.src);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileNameFor(image);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      toast.error('Could not download this image');
    } finally {
      setIsDownloading(false);
    }
  }, [image, isDownloading]);

  // Keyboard: Escape closes, arrows navigate, +/-/0 zoom, Tab stays inside the dialog
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          requestClose();
          return;
        case 'ArrowLeft':
          if (scale === 1) goPrev();
          return;
        case 'ArrowRight':
          if (scale === 1) goNext();
          return;
        case '+':
        case '=':
          zoomTo(scale + ZOOM_STEP);
          return;
        case '-':
          zoomTo(scale - ZOOM_STEP);
          return;
        case '0':
          resetZoom();
          return;
        case 'Tab': {
          const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
          if (!focusable || focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [requestClose, goPrev, goNext, zoomTo, resetZoom, scale]);

  // Mouse wheel zoom. React's onWheel is passive, so preventDefault needs a native listener.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      if (status !== 'loaded') return;
      e.preventDefault();
      setScale((s) => {
        const next = clamp(s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), MIN_SCALE, MAX_SCALE);
        if (next === 1) setOffset({ x: 0, y: 0 });
        return next;
      });
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [status]);

  // Pointer gestures on the image: two-finger pinch zoom, drag to pan while zoomed
  const onPointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointers.current.values());
    gesture.current = {
      startDist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
      startScale: scale,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointers.current.values());
    const g = gesture.current;
    if (pts.length === 2 && g.startDist > 0) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      zoomTo(g.startScale * (dist / g.startDist));
    } else if (pts.length === 1 && scale > 1) {
      const dx = e.clientX - g.lastX;
      const dy = e.clientY - g.lastY;
      setOffset((o) => ({ x: o.x + dx / scale, y: o.y + dy / scale }));
    }
    g.lastX = e.clientX;
    g.lastY = e.clientY;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    pointers.current.delete(e.pointerId);
    const rest = Array.from(pointers.current.values());
    if (rest.length === 0) {
      // A horizontal swipe on an unzoomed image moves to the previous/next image
      const g = gesture.current;
      if (g && g.startDist === 0 && scale === 1 && e.type === 'pointerup') {
        const dx = e.clientX - g.startX;
        if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(e.clientY - g.startY)) {
          if (dx < 0) goNext();
          else goPrev();
        }
      }
      gesture.current = null;
    } else if (gesture.current) {
      // Pinch ended with one finger still down: continue as a pan from that finger
      gesture.current = { startDist: 0, startScale: scale, startX: rest[0].x, startY: rest[0].y, lastX: rest[0].x, lastY: rest[0].y };
    }
  };

  const onImageDoubleClick = () => (scale > 1 ? resetZoom() : zoomTo(2));

  if (!image || typeof document === 'undefined') return null;

  const controlClass =
    'w-10 h-10 rounded-full flex items-center justify-center text-white/80 bg-white/10 hover:bg-white/20 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6EFF]';

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Image ${index + 1} of ${images.length}${image.name ? `: ${image.name}` : ''}`}
      data-testid="image-lightbox"
      className={`fixed inset-0 z-[300] flex flex-col bg-black/85 backdrop-blur-md transition-opacity duration-200 motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={requestClose}
    >
      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-3 sm:px-5 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0 text-white/80 font-sans">
          <p className="text-sm truncate">{image.name || 'Image'}</p>
          {images.length > 1 && (
            <p className="text-[11px] text-white/40" aria-live="polite">
              {index + 1} / {images.length}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button type="button" className={controlClass} onClick={() => zoomTo(scale - ZOOM_STEP)} disabled={status !== 'loaded' || scale <= MIN_SCALE} aria-label="Zoom out" title="Zoom out (−)">
            <ZoomOut size={18} />
          </button>
          <span className="hidden sm:inline w-12 text-center text-xs text-white/50 tabular-nums" aria-live="polite">
            {Math.round(scale * 100)}%
          </span>
          <button type="button" className={controlClass} onClick={() => zoomTo(scale + ZOOM_STEP)} disabled={status !== 'loaded' || scale >= MAX_SCALE} aria-label="Zoom in" title="Zoom in (+)">
            <ZoomIn size={18} />
          </button>
          <button type="button" className={`${controlClass} hidden sm:flex`} onClick={resetZoom} disabled={scale === 1} aria-label="Reset zoom" title="Reset zoom (0)">
            <RotateCcw size={16} />
          </button>
          <button type="button" className={controlClass} onClick={handleDownload} disabled={status === 'error' || isDownloading} aria-label="Download image" title="Download">
            <Download size={18} />
          </button>
          <button ref={closeButtonRef} type="button" className={controlClass} onClick={requestClose} aria-label="Close image viewer" title="Close (Esc)">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Stage: clicks on empty space close the viewer */}
      <div ref={stageRef} className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden px-2 sm:px-16 pb-4" data-testid="lightbox-stage">
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" role="status" aria-label="Loading image">
            <div className="w-10 h-10 rounded-full border-2 border-white/15 border-t-[#7C6EFF] animate-spin" />
          </div>
        )}

        {status === 'error' ? (
          <div className="flex flex-col items-center gap-3 text-center px-6 py-8 rounded-2xl bg-white/5 border border-white/10 max-w-xs" role="alert" onClick={(e) => e.stopPropagation()}>
            <ImageOff size={32} className="text-white/40" />
            <p className="text-sm text-white/80 font-sans">This image couldn&apos;t be loaded</p>
            <p className="text-xs text-white/40 font-sans">It may have been deleted or your connection dropped.</p>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={image.src}
            src={image.src}
            alt={image.caption || image.name || 'Shared image'}
            draggable={false}
            data-testid="lightbox-image"
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={onImageDoubleClick}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              transform: `scale(${visible ? scale : scale * 0.95}) translate(${offset.x}px, ${offset.y}px)`,
              touchAction: 'none',
            }}
            className={`max-w-full max-h-full object-contain select-none rounded-md shadow-2xl transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
              status === 'loaded' && visible ? 'opacity-100' : 'opacity-0'
            } ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
          />
        )}

        {hasPrev && (
          <button
            type="button"
            className={`${controlClass} absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-black/40`}
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous image"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            className={`${controlClass} absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-black/40`}
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next image"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {image.caption && (
        <p className="relative z-10 px-6 pb-5 text-center text-sm text-white/70 font-sans line-clamp-3" onClick={(e) => e.stopPropagation()}>
          {image.caption}
        </p>
      )}
    </div>,
    document.body
  );
}
