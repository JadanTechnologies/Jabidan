import React, { useEffect, useRef } from 'react';
import { Renderer, Camera, Transform, Plane, Program, Mesh, Texture, Raycast, Vec2 } from 'ogl';
import { HandCursor } from '../types';

interface CircularGalleryProps {
  items: string[];
  cursorRef: React.MutableRefObject<HandCursor>;
  onItemSelect: (index: number) => void;
  selectedIndex: number | null;
}

// --- SHADERS ---

const vertex = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = `
  precision highp float;
  uniform sampler2D tMap;
  uniform float uHover;
  varying vec2 vUv;
  void main() {
    vec4 color = texture2D(tMap, vUv);
    
    // Hover Effect: Brightness boost + Cyan tint
    vec3 hoverTint = vec3(0.0, 1.0, 1.0);
    // Mix original color with tint based on hover factor
    color.rgb = mix(color.rgb, hoverTint, uHover * 0.15);
    // Boost brightness
    color.rgb *= (1.0 + uHover * 0.3);
    
    gl_FragColor = color;
  }
`;

// Ring Visualizer Vertex Shader
const ringVertex = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Ring Visualizer Fragment Shader (Sci-Fi HUD Style)
const ringFragment = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uSpeed;

  void main() {
    vec2 centered = vUv - 0.5;
    float dist = length(centered);
    float angle = atan(centered.y, centered.x);

    // 1. Outer solid thin ring
    float r1 = smoothstep(0.48, 0.482, dist) - smoothstep(0.485, 0.487, dist);
    
    // 2. Inner dashed ring (rotates with time)
    float tickCount = 40.0;
    float tick = sin(angle * tickCount + uTime * 0.5);
    float r2Mask = step(0.5, tick);
    float r2 = (smoothstep(0.42, 0.422, dist) - smoothstep(0.43, 0.432, dist)) * r2Mask;
    
    // 3. Scanner Arc (active based on speed)
    float scanSpeed = uTime * 2.0;
    float inScan = step(0.0, sin(angle + scanSpeed)); // Half circle
    float r3 = (smoothstep(0.45, 0.452, dist) - smoothstep(0.455, 0.457, dist)) * inScan;

    // 4. Directional Force Arc (Visualizes Intent)
    // speedDir: +1 for right, -1 for left
    float speedDir = sign(uSpeed);
    // Magnitude clamped for visibility
    float speedMag = min(abs(uSpeed) * 15.0, 1.0); 
    
    // Target angle: 0 (Right) or PI (Left)
    float targetAngle = (speedDir > 0.0) ? 0.0 : 3.14159;
    
    // Calculate angular distance
    float angleDiff = abs(atan(sin(angle - targetAngle), cos(angle - targetAngle)));
    
    // Create arc that grows with speed
    float arcWidth = 0.8; 
    float directionalArc = smoothstep(arcWidth, 0.0, angleDiff) * speedMag;
    
    // Outer glow ring for direction
    float r4 = (smoothstep(0.50, 0.505, dist) - smoothstep(0.52, 0.525, dist)) * directionalArc;
    
    // Add pulsing effect to the directional arc
    r4 *= (0.7 + 0.3 * sin(uTime * 15.0));

    // 5. Center glow (faint)
    float glow = (1.0 - smoothstep(0.0, 0.5, dist)) * 0.05;

    // Combine
    // r1/r2 are base rings. r3 represents idle scanning. r4 represents active input.
    float alpha = r1 * 0.3 + r2 * 0.2 + r3 * (0.1 + abs(uSpeed)*2.0) + r4 + glow;
    
    // Base Cyan Color
    vec3 color = vec3(0.0, 0.9, 1.0);
    
    // Make directional arc slightly brighter/whiter
    vec3 activeColor = vec3(0.5, 1.0, 1.0);
    vec3 finalColor = mix(color, activeColor, r4);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// --- AUDIO MANAGER ---

class AudioManager {
  ctx: AudioContext | null = null;
  osc: OscillatorNode | null = null;
  gain: GainNode | null = null;
  isInitialized = false;

  init() {
    if (this.isInitialized) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      this.osc = this.ctx.createOscillator();
      this.gain = this.ctx.createGain();
      
      this.osc.type = 'sine'; // Sine wave for smooth drone
      this.osc.frequency.value = 60;
      this.gain.gain.value = 0;
      
      this.osc.connect(this.gain);
      this.gain.connect(this.ctx.destination);
      this.osc.start();
      
      this.isInitialized = true;
    } catch (e) {
      console.error("Audio init failed", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  updateDrone(speed: number) {
    if (!this.ctx || !this.osc || !this.gain) return;
    
    // Smooth transition
    const now = this.ctx.currentTime;
    const absSpeed = Math.abs(speed);
    
    // Frequency modulation: 60Hz base + speed factor
    const targetFreq = 60 + (absSpeed * 2000); 
    
    // Volume modulation
    const targetGain = 0.02 + (absSpeed * 0.15);

    this.osc.frequency.setTargetAtTime(targetFreq, now, 0.1);
    this.gain.gain.setTargetAtTime(targetGain, now, 0.1);
  }

  playSelectSound() {
    if (!this.ctx) return;
    this.resume();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Sci-fi chirp
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
}

// --- COMPONENT ---

export const CircularGallery: React.FC<CircularGalleryProps> = ({ items, cursorRef, onItemSelect, selectedIndex }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioManager = useRef(new AudioManager());
  const raycast = useRef(new Raycast());
  const mouse = useRef(new Vec2());
  
  // Track specific gallery state outside react render cycle for performance
  const galleryState = useRef({
    scrollCurrent: 0,
    scrollTarget: 0,
    itemWidth: 1.5, // Approx width of items in 3D space
    padding: 0.2,
    totalWidth: 0,
    activeIndex: 0,
    isPinching: false,
    lastPinchTime: 0,
    currentSpeed: 0,
  });

  // Track animation states for each mesh (scale, z-offset)
  const meshStates = useRef(items.map(() => ({ scale: 1, zOffset: 0 })));

  // Reset mesh states when items change
  useEffect(() => {
    meshStates.current = items.map(() => ({ scale: 1, zOffset: 0 }));
    galleryState.current.scrollTarget = 0;
    galleryState.current.scrollCurrent = 0;
  }, [items]);

  useEffect(() => {
    // Init audio on mount
    const handleFirstInteraction = () => {
       audioManager.current.init();
       window.removeEventListener('click', handleFirstInteraction);
       window.removeEventListener('touchstart', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    audioManager.current.init();

    if (!containerRef.current) return;

    const count = items.length;
    galleryState.current.totalWidth = count * (galleryState.current.itemWidth + galleryState.current.padding);

    // Setup OGL
    const renderer = new Renderer({ alpha: true });
    const gl = renderer.gl;
    containerRef.current.appendChild(gl.canvas);

    const camera = new Camera(gl, { fov: 45 });
    camera.position.set(0, 0, 15);
    camera.lookAt([0, 0, 0]);

    const scene = new Transform();
    
    // Container for the carousel to allow independent rotation
    const carouselGroup = new Transform();
    carouselGroup.setParent(scene);

    // --- HUD RING ---
    // A large plane lying flat on the ground to visualize the floor/gyroscope
    const ringGeometry = new Plane(gl, { width: 14, height: 14 });
    const ringProgram = new Program(gl, {
      vertex: ringVertex,
      fragment: ringFragment,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 0 },
      },
      transparent: true,
      depthWrite: false, // Don't write to depth buffer so it doesn't occlude awkwardly
    });
    const ringMesh = new Mesh(gl, { geometry: ringGeometry, program: ringProgram });
    ringMesh.rotation.x = -Math.PI / 2; // Flat on floor
    ringMesh.position.y = -2; // Below the cards
    ringMesh.setParent(scene); // Attached to scene so it tilts with the hand gesture

    // --- CAROUSEL MESHES ---
    const planeGeometry = new Plane(gl, { width: galleryState.current.itemWidth, height: galleryState.current.itemWidth * 1.4 }); // 3:4 aspect

    const meshes: Mesh[] = [];

    items.forEach((src, i) => {
      const texture = new Texture(gl);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      img.onload = () => (texture.image = img);

      const program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
          tMap: { value: texture },
          uHover: { value: 0 }, // Init hover uniform
        },
        cullFace: null,
      });

      const mesh = new Mesh(gl, { geometry: planeGeometry, program });
      mesh.setParent(carouselGroup);
      meshes.push(mesh);
    });

    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    };
    window.addEventListener('resize', resize);
    resize();

    // Radius of the circle
    const radius = 6; 
    const angleStep = (Math.PI * 2) / count;

    let animationFrameId: number;

    const update = (t: number) => {
      animationFrameId = requestAnimationFrame(update);
      const timeSeconds = t * 0.001;

      const isDetailOpen = selectedIndex !== null;

      // --- HAND CONTROL LOGIC ---
      const cursor = cursorRef.current;
      let targetSpeed = 0;
      
      // 1. SCROLLING Logic
      if (!isDetailOpen && cursor.isVisible) {
        const x = cursor.x;
        const deadZone = 0.15; 
        const center = 0.5;
        
        if (x > center + deadZone) {
          const normalized = (x - (center + deadZone)) / (0.5 - deadZone);
          targetSpeed = Math.pow(normalized, 0.6) * 0.2; 
        } else if (x < center - deadZone) {
          const normalized = ((center - deadZone) - x) / (0.5 - deadZone);
          targetSpeed = -Math.pow(normalized, 0.6) * 0.2;
        }

        galleryState.current.scrollTarget += targetSpeed;
      }

      // 2. TILT/ROTATION Logic
      if (cursor.isVisible) {
         // Tilt X (Up/Down) based on cursor Y
         const targetRotationX = (cursor.y - 0.5) * 1.5; 
         // Roll Z (Bank left/right)
         const targetRotationZ = (cursor.x - 0.5) * -0.5;

         // Smoothly lerp scene rotation
         scene.rotation.x += (targetRotationX - scene.rotation.x) * 0.05;
         scene.rotation.z += (targetRotationZ - scene.rotation.z) * 0.05;
      } else {
         scene.rotation.x += (0 - scene.rotation.x) * 0.05;
         scene.rotation.z += (0 - scene.rotation.z) * 0.05;
      }

      // 3. SOUND Logic
      audioManager.current.updateDrone(targetSpeed);

      // 4. RAYCAST HOVER Logic
      let hoveredIndex = -1;
      if (cursor.isVisible && !isDetailOpen && !cursor.isPinching) {
          mouse.current.set(2.0 * cursor.x - 1.0, 2.0 * (1.0 - cursor.y) - 1.0);
          raycast.current.castMouse(camera, mouse.current);
          const hits = raycast.current.intersectBounds(meshes);
          if (hits && hits.length > 0) {
             hoveredIndex = meshes.indexOf(hits[0]);
          }
      }

      // 5. PINCH Logic
      const isInPinchableArea = cursor.x > 0.2 && cursor.x < 0.8 && cursor.y > 0.2 && cursor.y < 0.8;
      if (cursor.isVisible && isInPinchableArea && cursor.isPinching) {
        const now = Date.now();
        if (!galleryState.current.isPinching && (now - galleryState.current.lastPinchTime > 1000)) {
           const targetIndex = hoveredIndex !== -1 ? hoveredIndex : galleryState.current.activeIndex;
           onItemSelect(targetIndex);
           galleryState.current.lastPinchTime = now;
           audioManager.current.playSelectSound();
        }
        galleryState.current.isPinching = true;
      } else {
        galleryState.current.isPinching = false;
      }

      // --- UPDATE ANIMATIONS ---

      // Update Ring Visuals
      ringProgram.uniforms.uTime.value = timeSeconds;
      ringProgram.uniforms.uSpeed.value = targetSpeed;
      ringMesh.rotation.z -= targetSpeed * 0.5;

      // Smooth lerp scroll
      galleryState.current.scrollCurrent += (galleryState.current.scrollTarget - galleryState.current.scrollCurrent) * 0.1;

      // Position meshes
      meshes.forEach((mesh, i) => {
        const mState = meshStates.current[i];
        const isSelected = selectedIndex === i;
        const isAnySelected = selectedIndex !== null;
        
        // Check hover state (only if not selected/interacting)
        const isHovered = (i === hoveredIndex);

        // Calculate target scale
        let targetScale = 1.0;
        if (isSelected) targetScale = 1.3;
        else if (isAnySelected) targetScale = 0.8;
        else if (isHovered) targetScale = 1.15; // Hover scale

        // Calculate target Z
        let targetZOffset = 0;
        if (isSelected) targetZOffset = 2.5;
        else if (isAnySelected) targetZOffset = -1.0;
        else if (isHovered) targetZOffset = 0.5; // Pop out slightly

        mState.scale += (targetScale - mState.scale) * 0.1;
        mState.zOffset += (targetZOffset - mState.zOffset) * 0.1;

        // Update Shader Uniform for Glow
        const currentHoverVal = mesh.program.uniforms.uHover.value;
        const targetHoverVal = isHovered ? 1.0 : 0.0;
        mesh.program.uniforms.uHover.value += (targetHoverVal - currentHoverVal) * 0.1;

        const angle = (i * angleStep) - galleryState.current.scrollCurrent;
        
        mesh.position.x = Math.sin(angle) * radius;
        mesh.position.z = (Math.cos(angle) * radius - radius) + mState.zOffset;
        mesh.rotation.y = angle;
        mesh.scale.set(mState.scale);

        if (!isDetailOpen) {
          let normalizedAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
          if (Math.abs(normalizedAngle) < angleStep / 2) {
               galleryState.current.activeIndex = i;
          }
        }
      });

      renderer.render({ scene, camera });
    };

    animationFrameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      if (containerRef.current && containerRef.current.contains(gl.canvas)) {
        containerRef.current.removeChild(gl.canvas);
      }
    };
  }, [items, selectedIndex]);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
};
