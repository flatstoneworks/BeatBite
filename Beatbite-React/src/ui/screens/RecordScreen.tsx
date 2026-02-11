import { useEffect, useRef } from 'react';
import { useGuidedFlow } from '../../hooks/useGuidedFlow';

/**
 * RecordScreen - Radial HUD landing page with canvas-animated tick visualizer.
 * Click record button → startGuidedFlow().
 */
export function RecordScreen() {
  const { start: startGuidedFlow } = useGuidedFlow();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  // Inject keyframe animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes hud-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes hud-pulse-ring {
        0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
        50% { opacity: 0.3; }
        100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // Canvas radial tick animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tickCount = 120;
    const cx = 140;
    const cy = 140;
    const baseRadius = 105;
    const baseTickLength = 4;

    const draw = () => {
      ctx.clearRect(0, 0, 280, 280);
      const time = Date.now() * 0.002;

      for (let i = 0; i < tickCount; i++) {
        const angle = (i / tickCount) * Math.PI * 2;
        const noise = Math.sin(i * 0.1 + time) * 5;
        const tickLength = baseTickLength + Math.max(0, noise);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, -baseRadius);
        ctx.lineTo(0, -baseRadius - tickLength);
        ctx.strokeStyle = '#8E9299';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div
      style={{ backgroundColor: '#151619' }}
      className="h-full w-full flex flex-col"
    >
      {/* Header */}
      <div className="px-6 pt-6 flex justify-between items-start">
        <span
          className="font-mono uppercase"
          style={{ fontSize: '10px', color: '#8E9299', letterSpacing: '1px' }}
        >
          BEATBITE
        </span>
        <span
          className="font-mono uppercase"
          style={{ fontSize: '10px', color: '#8E9299', letterSpacing: '1px' }}
        >
          REC_READY
        </span>
      </div>

      {/* Visualizer stage */}
      <div className="flex-1 flex items-center justify-center relative">
        <div
          className="relative flex items-center justify-center"
          style={{ width: '280px', height: '280px' }}
        >
          {/* Canvas ticks */}
          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            className="absolute top-0 left-0"
          />

          {/* Dashed circular track */}
          <div
            className="absolute"
            style={{
              width: '176px',
              height: '176px',
              border: '1px dashed #8E9299',
              borderRadius: '50%',
              animation: 'hud-spin 60s linear infinite',
            }}
          />

          {/* Pulse ring */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '50%',
              left: '50%',
              width: '64px',
              height: '64px',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '50%',
              animation: 'hud-pulse-ring 2s infinite cubic-bezier(0.215, 0.61, 0.355, 1)',
            }}
          />

          {/* Record button */}
          <button
            onClick={startGuidedFlow}
            className="relative z-10 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: '1px solid #8E9299',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.6)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#8E9299';
            }}
            aria-label="Start Recording"
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#FFFFFF',
                borderRadius: '1px',
              }}
            />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-8">
        {/* Status */}
        <div className="flex flex-col gap-2 mb-4">
          <span
            className="font-mono uppercase"
            style={{ fontSize: '10px', letterSpacing: '1px', color: '#8E9299' }}
          >
            STATUS
          </span>
          <p style={{ fontSize: '14px', color: '#FFFFFF', lineHeight: 1.4 }}>
            Ready to record.
          </p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
            Select a band, set your tempo, and lay down tracks.
          </p>
        </div>

        {/* Timecode bar */}
        <div
          className="flex justify-between font-mono"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '16px',
            marginTop: '24px',
            fontSize: '11px',
            color: '#8E9299',
            letterSpacing: '1px',
          }}
        >
          <span>00:00:00:00</span>
          <span>VOICE → MUSIC</span>
        </div>
      </div>
    </div>
  );
}
