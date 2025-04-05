'use client';

import { useState, useEffect, useRef } from 'react';

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
      ctx.scale(size/20, size/20);
      
      ctx.fillStyle = `rgba(255, 99, 132, ${opacity})`; // Pink heart
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-10, -10, -10, -5, 0, 5);
      ctx.bezierCurveTo(10, -5, 10, -10, 0, 0);
      ctx.fill();
      
      ctx.restore();
    };

    // Draw ticket
    const drawTicket = (x: number, y: number, width: number, height: number, text: string) => {
      if (!ctx) return;
      
      ctx.save();
      ctx.translate(x, y);
      
      // Ticket body
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.8)';
      ctx.lineWidth = 2;
      
      // Rounded rectangle
      const radius = 5;
      ctx.beginPath();
      ctx.moveTo(0, radius);
      ctx.arcTo(0, 0, radius, 0, radius);
      ctx.lineTo(width - radius, 0);
      ctx.arcTo(width, 0, width, radius, radius);
      ctx.lineTo(width, height - radius);
      ctx.arcTo(width, height, width - radius, height, radius);
      ctx.lineTo(radius, height);
      ctx.arcTo(0, height, 0, height - radius, radius);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Ticket text
      ctx.fillStyle = 'rgba(74, 222, 128, 0.9)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, width/2, height/2);
      
      ctx.restore();
    };

    // Draw message
    const drawMessage = (x: number, y: number, text: string, size: number, opacity: number, color: string) => {
      if (!ctx) return;
      
      ctx.save();
      ctx.translate(x, y);
      
      ctx.font = `${size}px Arial`;
      ctx.fillStyle = color.replace(')', `, ${opacity})`).replace('rgba', 'rgba');
      ctx.textAlign = 'center';
      ctx.fillText(text, 0, 0);
      
      ctx.restore();
    };

    // Animation function
    const animate = () => {
      if (!ctx || !canvas) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw envelopes
      for (let i = 0; i < envelopes.length; i++) {
        const env = envelopes[i];
        
        // Update state
        if (env.state === 'rising') {
          env.y -= env.speed;
          
          // If reached target, start floating
          if (env.y <= env.targetY) {
            env.state = 'floating';
          }
        } else if (env.state === 'floating') {
          // Gentle floating motion
          env.y += Math.sin(Date.now() * 0.001 + i) * 0.5;
          
          // Check if mouse is near
          const dx = mouseRef.current.x - env.x;
          const dy = mouseRef.current.y - env.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            env.state = 'opening';
            env.stateTime = 0;
          }
        } else if (env.state === 'opening') {
          env.stateTime += 1;
          
          if (env.stateTime > 50) {
            env.state = 'releasing';
            
            // Create hearts
            for (let j = 0; j < 5; j++) {
              hearts.push({
                x: env.x,
                y: env.y,
                size: 10 + Math.random() * 10,
                speed: 1 + Math.random() * 2,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.1,
                opacity: 0.8
              });
            }
          }
        } else if (env.state === 'releasing') {
          // Move back to top
          env.y = canvas.height + Math.random() * 300;
          env.x = Math.random() * canvas.width;
          env.state = 'rising';
          env.stateTime = 0;
        }
        
        // Update rotation
        env.rotation += env.rotationSpeed;
        
        // Draw envelope
        drawEnvelope(env.x, env.y, env.size, env.rotation, env.state, env.stateTime);
      }
      
      // Update and draw tickets
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        
        // Move upward
        ticket.y -= ticket.speed;
        
        // Reset if off screen
        if (ticket.y < -ticket.height) {
          ticket.y = canvas.height + Math.random() * 200;
          ticket.x = Math.random() * canvas.width;
        }
        
        // Draw ticket
        drawTicket(ticket.x, ticket.y, ticket.width, ticket.height, ticket.text);
      }
      
      // Update and draw messages
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        
        // Move upward
        message.y -= message.speed;
        
        // Reset if off screen
        if (message.y < -50) {
          message.y = canvas.height + Math.random() * 200;
          message.x = Math.random() * canvas.width;
        }
        
        // Draw message
        drawMessage(message.x, message.y, message.text, message.size, message.opacity, message.color);
      }
      
      // Update and draw hearts
      for (let i = 0; i < hearts.length; i++) {
        const heart = hearts[i];
        
        // Move upward with some randomness
        heart.y -= heart.speed;
        heart.x += (Math.random() - 0.5) * 2;
        
        // Rotate
        heart.rotation += heart.rotationSpeed;
        
        // Fade out
        heart.opacity -= 0.01;
        
        // Remove if faded out
        if (heart.opacity <= 0) {
          hearts.splice(i, 1);
          i--;
          continue;
        }
        
        // Draw heart
        drawHeart(heart.x, heart.y, heart.size, heart.rotation, heart.opacity);
      }
      
      requestAnimationFrame(animate);
    };

    // Resize function
    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY
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

export default StoryAnimation;
