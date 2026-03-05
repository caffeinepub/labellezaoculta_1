import { X, ZoomIn } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ZoomOverlayProps {
  imageUrl: string;
  title: string;
  onClose: () => void;
}

export function ZoomOverlay({ imageUrl, title, onClose }: ZoomOverlayProps) {
  const [zoom, setZoom] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{
    mouseX: number;
    mouseY: number;
    posX: number;
    posY: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset position when zoom changes to 100%
  useEffect(() => {
    if (zoom === 100) {
      setPosition({ x: 0, y: 0 });
    }
  }, [zoom]);

  // Keyboard: Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 100) return;
      e.preventDefault();
      setIsDragging(true);
      dragStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [zoom, position],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragStart.current) return;
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      setPosition({
        x: dragStart.current.posX + dx,
        y: dragStart.current.posY + dy,
      });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStart.current = null;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (zoom <= 100) return;
      const touch = e.touches[0];
      dragStart.current = {
        mouseX: touch.clientX,
        mouseY: touch.clientY,
        posX: position.x,
        posY: position.y,
      };
      setIsDragging(true);
    },
    [zoom, position],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || !dragStart.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.current.mouseX;
      const dy = touch.clientY - dragStart.current.mouseY;
      setPosition({
        x: dragStart.current.posX + dx,
        y: dragStart.current.posY + dy,
      });
    },
    [isDragging],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    dragStart.current = null;
  }, []);

  const scale = zoom / 100;
  const canDrag = zoom > 100;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        data-ocid="zoom.modal"
      >
        {/* Backdrop */}
        <button
          type="button"
          className="absolute inset-0 w-full h-full"
          style={{ background: "oklch(0.03 0.002 285 / 0.97)" }}
          onClick={onClose}
          aria-label="Cerrar zoom"
        />

        {/* Top bar */}
        <div
          className="relative z-10 flex items-center justify-between px-5 py-4 shrink-0"
          style={{
            background:
              "linear-gradient(to bottom, oklch(0.03 0.002 285 / 0.9), transparent)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <ZoomIn className="w-4 h-4 text-gold" />
            <span className="font-display text-sm font-light text-foreground truncate max-w-xs">
              {title}
            </span>
          </div>
          <motion.button
            type="button"
            onClick={onClose}
            data-ocid="zoom.close_button"
            aria-label="Cerrar zoom"
            className="flex items-center justify-center w-9 h-9 rounded-full"
            style={{
              background: "oklch(0.13 0.006 285 / 0.7)",
              backdropFilter: "blur(12px)",
              border: "1px solid oklch(0.28 0.008 285 / 0.5)",
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
          >
            <X className="w-4 h-4 text-text-dim" />
          </motion.button>
        </div>

        {/* Image container */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: drag-to-pan is a pointer-specific interaction */}
        <div
          ref={containerRef}
          className="relative flex-1 flex items-center justify-center overflow-hidden"
          style={{
            cursor: canDrag ? (isDragging ? "grabbing" : "grab") : "default",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.img
            src={imageUrl}
            alt={title}
            draggable={false}
            className="max-w-full max-h-full object-contain select-none"
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transition: isDragging
                ? "none"
                : "transform 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
              transformOrigin: "center center",
            }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: scale }}
          />
        </div>

        {/* Bottom controls */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop-propagation on a non-interactive container */}
        <div
          className="relative z-10 shrink-0 px-6 py-5 flex flex-col items-center gap-3"
          style={{
            background:
              "linear-gradient(to top, oklch(0.03 0.002 285 / 0.9), transparent)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Zoom percentage */}
          <span
            className="font-mono text-xs tracking-widest tabular-nums"
            style={{ color: "oklch(0.78 0.14 75)" }}
          >
            {zoom}%
          </span>

          {/* Slider */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            <span className="font-mono text-[10px] text-text-subtle shrink-0">
              100%
            </span>
            <input
              type="range"
              min={100}
              max={200}
              step={5}
              value={zoom}
              onChange={(e) => {
                const val = Number(e.target.value);
                setZoom(val);
                if (val === 100) setPosition({ x: 0, y: 0 });
              }}
              className="flex-1 h-1.5 appearance-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
              style={{
                background: `linear-gradient(to right, oklch(0.78 0.14 75) 0%, oklch(0.78 0.14 75) ${zoom - 100}%, oklch(0.22 0.006 285) ${zoom - 100}%, oklch(0.22 0.006 285) 100%)`,
                accentColor: "oklch(0.78 0.14 75)",
              }}
              aria-label="Nivel de zoom"
              data-ocid="zoom.toggle"
            />
            <span className="font-mono text-[10px] text-text-subtle shrink-0">
              200%
            </span>
          </div>

          {canDrag && (
            <p className="text-text-subtle font-mono text-[10px] uppercase tracking-widest">
              Arrastra para mover
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
