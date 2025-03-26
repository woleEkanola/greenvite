'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export const StoryAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Story elements
    const envelopes: Array<{
      x: number;
      y: number;
      size: number;
      speed: number;
      rotation: number;
      rotationSpeed: number;
      state: 'rising' | 'floating' | 'opening' | 'releasing';
      stateTime: number;
      targetY: number;
    }> = [];

    const tickets: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      speed: number;
      text: string;
    }> = [];

    const messages: Array<{
      x: number;
      y: number;
      text: string;
      size: number;
      speed: number;
      opacity: number;
      color: string;
    }> = [];

    const hearts: Array<{
      x: number;
      y: number;
      size: number;
      speed: number;
      rotation: number;
      rotationSpeed: number;
      opacity: number;
    }> = [];

    // Create story elements
    const createStoryElements = () => {
      // Create envelopes
      for (let i = 0; i < 12; i++) {
        envelopes.push({
          x: Math.random() * canvas.width,
          y: canvas.height + Math.random() * 300,
          size: 20 + Math.random() * 20,
          speed: 1 + Math.random() * 2,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
          state: 'rising',
          stateTime: 0,
          targetY: Math.random() * (canvas.height * 0.6) + canvas.height * 0.2
        });
      }

      // Create tickets
      const ticketTexts = ['ADMIT ONE', 'VIP', 'RSVP', 'EVENT'];
      for (let i = 0; i < 8; i++) {
        tickets.push({
          x: Math.random() * canvas.width,
          y: canvas.height + Math.random() * 500,
          width: 80 + Math.random() * 40,
          height: 40 + Math.random() * 20,
          speed: 0.8 + Math.random() * 1.5,
          text: ticketTexts[Math.floor(Math.random() * ticketTexts.length)]
        });
      }

      // Create floating messages
      const messageTexts = ['Invitation Sent!', 'RSVP Today!', 'Join Us!', 'Tickets Available', 'Special Event'];
      for (let i = 0; i < 6; i++) {
        messages.push({
          x: Math.random() * canvas.width,
          y: canvas.height + Math.random() * 700,
          text: messageTexts[Math.floor(Math.random() * messageTexts.length)],
          size: 14 + Math.random() * 10,
          speed: 0.6 + Math.random() * 1.2,
          opacity: 0.1 + Math.random() * 0.5,
          color: 'rgba(74, 222, 128, 0.8)' // Green color
        });
      }
    };

    // Draw envelope
    const drawEnvelope = (x: number, y: number, size: number, rotation: number, state: string, stateTime: number) => {
      if (!ctx) return;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.scale(size/40, size/40);
      
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.8)'; // Green stroke
      ctx.fillStyle = 'rgba(74, 222, 128, 0.2)'; // Light green fill
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
    const drawHeart = (x: number, y: number, size: number, rotation: number, opacity: number) => {
      if (!ctx) return;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.scale(size * 0.5, size * 0.5);
      
      ctx.strokeStyle = `rgba(239, 68, 68, ${opacity * 0.8})`; // Red stroke
      ctx.fillStyle = `rgba(239, 68, 68, ${opacity * 0.3})`; // Light red fill
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.bezierCurveTo(-12, -10, -30, 0, 0, 30);
      ctx.bezierCurveTo(30, 0, 12, -10, 0, 10);
      ctx.fill();
      ctx.stroke();
      
      ctx.restore();
    };

    // Draw ticket
    const drawTicket = (x: number, y: number, width: number, height: number, text: string) => {
      if (!ctx) return;
      
      ctx.save();
      ctx.translate(x, y);
      
      // Ticket body
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'; // Emerald light fill
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)'; // Emerald stroke
      ctx.lineWidth = 2;
      ctx.fillRect(-width/2, -height/2, width, height);
      ctx.strokeRect(-width/2, -height/2, width, height);
      
      // Ticket perforations
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.moveTo(-width/2 + width * 0.8, -height/2);
      ctx.lineTo(-width/2 + width * 0.8, height/2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Ticket text
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)'; // Emerald text
      ctx.font = `bold ${height * 0.4}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);
      
      ctx.restore();
    };

    // Draw message
    const drawMessage = (x: number, y: number, text: string, size: number, opacity: number, color: string) => {
      if (!ctx) return;
      
      ctx.save();
      ctx.translate(x, y);
      
      // Message text
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
      ctx.font = `bold ${size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);
      
      ctx.restore();
    };

    // Animation function
    const animate = () => {
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create a gradient background similar to home page
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(240, 253, 244, 1)'); // green-50
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)'); // white
      gradient.addColorStop(1, 'rgba(236, 253, 245, 1)'); // emerald-50
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw envelopes
      for (let i = 0; i < envelopes.length; i++) {
        const envelope = envelopes[i];
        
        // Update state and position
        envelope.stateTime++;
        envelope.rotation += envelope.rotationSpeed;

        switch (envelope.state) {
          case 'rising':
            envelope.y -= envelope.speed;
            if (envelope.y <= envelope.targetY) {
              envelope.state = 'floating';
              envelope.stateTime = 0;
            }
            break;

          case 'floating':
            envelope.y += Math.sin(envelope.stateTime * 0.02) * 0.5;
            if (envelope.stateTime > 100) {
              envelope.state = 'opening';
              envelope.stateTime = 0;
            }
            break;

          case 'opening':
            if (envelope.stateTime > 50) {
              envelope.state = 'releasing';
              envelope.stateTime = 0;
              
              // Create hearts
              for (let j = 0; j < 3; j++) {
                hearts.push({
                  x: envelope.x,
                  y: envelope.y,
                  size: 10 + Math.random() * 10,
                  speed: 1 + Math.random() * 2,
                  rotation: Math.random() * Math.PI * 2,
                  rotationSpeed: (Math.random() - 0.5) * 0.05,
                  opacity: 0.8
                });
              }
            }
            break;

          case 'releasing':
            if (envelope.stateTime > 100) {
              // Reset envelope
              envelope.y = canvas.height + Math.random() * 100;
              envelope.x = Math.random() * canvas.width;
              envelope.state = 'rising';
              envelope.stateTime = 0;
              envelope.targetY = Math.random() * (canvas.height * 0.6) + canvas.height * 0.2;
            }
            break;
        }
        
        // Draw envelope
        drawEnvelope(envelope.x, envelope.y, envelope.size, envelope.rotation, envelope.state, envelope.stateTime);
      }
      
      // Update and draw hearts
      for (let i = 0; i < hearts.length; i++) {
        const heart = hearts[i];
        
        // Update position
        heart.y -= heart.speed;
        heart.rotation += heart.rotationSpeed;
        heart.opacity -= 0.01;
        
        // Draw heart
        drawHeart(heart.x, heart.y, heart.size, heart.rotation, heart.opacity);
        
        // Remove faded hearts
        if (heart.opacity <= 0) {
          hearts.splice(i, 1);
          i--;
        }
      }
      
      // Update and draw tickets
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        
        // Update position
        ticket.y -= ticket.speed;
        
        // Draw ticket
        drawTicket(ticket.x, ticket.y, ticket.width, ticket.height, ticket.text);
        
        // Reset if off screen
        if (ticket.y < -50) {
          ticket.y = canvas.height + Math.random() * 100;
          ticket.x = Math.random() * canvas.width;
        }
      }
      
      // Update and draw messages
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        
        // Update position
        message.y -= message.speed;
        
        // Draw message
        drawMessage(message.x, message.y, message.text, message.size, message.opacity, message.color);
        
        // Reset if off screen
        if (message.y < -50) {
          message.y = canvas.height + Math.random() * 100;
          message.x = Math.random() * canvas.width;
        }
      }
      
      // Add sparkles where mouse is
      if (Math.random() > 0.7) {
        const sparkleSize = 2 + Math.random() * 3;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.7)'; // Emerald sparkles
        ctx.beginPath();
        ctx.arc(mouseRef.current.x, mouseRef.current.y, sparkleSize, 0, Math.PI * 2);
        ctx.fill();
      }
      
      requestAnimationFrame(animate);
    };
    
    // Resize function
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };
    
    // Event listeners
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', handleMouseMove);
    
    // Initialize
    resize();
    createStoryElements();
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', top: 0, left: 0, zIndex: -1 }}
    />
  );
};

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid credentials');
        setIsLoading(false);
        return;
      }

      // Get the session to check user role
      const response = await fetch('/api/auth/session');
      const session = await response.json();

      // Redirect based on role
      if (session?.user?.role === 'SUPERADMIN') {
        router.push('/superadmin');
      } else {
        router.push('/admin/dashboard');
      }
      
      router.refresh();
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <StoryAnimation />
      <motion.div 
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/90 backdrop-blur-lg rounded-lg shadow-xl p-8 w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Welcome Back</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          <div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
