import { useEffect, useRef } from 'react';

interface CanvasBackgroundProps {
  theme: 'light' | 'dark';
}

export function CanvasBackground({ theme }: CanvasBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Dynamic wave mesh particles
    const cols = 28;
    const rows = 18;
    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const isDark = theme === 'dark';
      const cellWidth = width / cols;
      const cellHeight = height / rows;

      ctx.lineWidth = 1;

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = i * cellWidth;
          const y = j * cellHeight;
          
          // Subtle harmonic sine wave displacement
          const dist = Math.sqrt((x - width / 2) ** 2 + (y - height / 2) ** 2);
          const offset = Math.sin(dist * 0.003 - time * 1.5) * Math.cos(x * 0.002 + time) * 6;

          const dotRadius = Math.max(1, 1.4 + Math.sin(time + i * 0.2 + j * 0.2) * 0.6);

          ctx.beginPath();
          ctx.arc(x, y + offset, dotRadius, 0, Math.PI * 2);

          if (isDark) {
            ctx.fillStyle = `rgba(255, 87, 34, ${0.08 + Math.sin(time + i * 0.1) * 0.04})`;
          } else {
            ctx.fillStyle = `rgba(15, 23, 42, ${0.09 + Math.sin(time + i * 0.1) * 0.04})`;
          }
          ctx.fill();
        }
      }

      time += 0.012;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.85 }}
    />
  );
}
