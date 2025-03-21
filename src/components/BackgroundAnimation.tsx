import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  scale: number;
  speed: number;
  type: 'envelope' | 'heart' | 'star';
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  targetY?: number;
  state: 'rising' | 'floating' | 'opening' | 'releasing';
  stateTime: number;
}

export default function BackgroundAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const particleCount = 8;

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Initialize particles
    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(createParticle(canvas.width, canvas.height));
      }
    };

    const createParticle = (width: number, height: number): Particle => {
      return {
        x: Math.random() * width,
        y: height + 100,
        scale: Math.random() * 0.5 + 1, // Increased scale
        speed: Math.random() * 1 + 0.5, // Increased speed
        type: 'envelope',
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        opacity: 0.8, // Increased opacity
        state: 'rising',
        stateTime: 0,
        targetY: Math.random() * (height * 0.6) + height * 0.2
      };
    };

    // Draw envelope
    const drawEnvelope = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, rotation: number, state: string, stateTime: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);
      
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.8)';
      ctx.fillStyle = 'rgba(74, 222, 128, 0.2)';
      ctx.lineWidth = 2;
      
      // Envelope body
      ctx.beginPath();
      ctx.rect(-20, -15, 40, 30);
      ctx.fill();
      ctx.stroke();

      // Envelope flap animation
      if (state === 'opening') {
        const flapAngle = (stateTime / 50) * Math.PI; // Flap animation
        ctx.beginPath();
        ctx.moveTo(-20, -15);
        ctx.lineTo(0, -15 + Math.sin(flapAngle) * 20);
        ctx.lineTo(20, -15);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(-20, -15);
        ctx.lineTo(0, 5);
        ctx.lineTo(20, -15);
        ctx.stroke();
      }
      
      ctx.restore();
    };

    // Draw heart
    const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, rotation: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.scale(scale * 0.5, scale * 0.5);
      
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.bezierCurveTo(-12, -10, -30, 0, 0, 30);
      ctx.bezierCurveTo(30, 0, 12, -10, 0, 10);
      ctx.fill();
      ctx.stroke();
      
      ctx.restore();
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        // Update particle state
        particle.stateTime++;

        switch (particle.state) {
          case 'rising':
            particle.y -= particle.speed;
            if (particle.y <= particle.targetY!) {
              particle.state = 'floating';
              particle.stateTime = 0;
            }
            break;

          case 'floating':
            particle.y += Math.sin(particle.stateTime * 0.02) * 0.5;
            if (particle.stateTime > 100) {
              particle.state = 'opening';
              particle.stateTime = 0;
            }
            break;

          case 'opening':
            if (particle.stateTime > 50) {
              particle.state = 'releasing';
              particle.stateTime = 0;
              // Create hearts
              for (let i = 0; i < 3; i++) {
                particles.push({
                  x: particle.x,
                  y: particle.y,
                  scale: particle.scale * 0.6,
                  speed: particle.speed * 1.5,
                  type: 'heart',
                  rotation: Math.random() * Math.PI * 2,
                  rotationSpeed: (Math.random() - 0.5) * 0.1,
                  opacity: 0.8,
                  state: 'rising',
                  stateTime: 0
                });
              }
            }
            break;

          case 'releasing':
            particle.opacity -= 0.02;
            if (particle.opacity <= 0) {
              // Reset particle
              Object.assign(particle, createParticle(canvas.width, canvas.height));
            }
            break;
        }

        // Update rotation
        particle.rotation += particle.rotationSpeed;

        // Draw particle with current opacity
        ctx.globalAlpha = particle.opacity;
        if (particle.type === 'envelope') {
          drawEnvelope(ctx, particle.x, particle.y, particle.scale, particle.rotation, particle.state, particle.stateTime);
        } else if (particle.type === 'heart') {
          drawHeart(ctx, particle.x, particle.y, particle.scale, particle.rotation);
        }
        ctx.globalAlpha = 1;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    // Handle resize
    const handleResize = () => {
      setCanvasSize();
      initParticles();
    };

    // Initialize
    setCanvasSize();
    initParticles();
    animate();

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
