import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './App.css';

type LetterStep = 'hidden' | 'small' | 'opening' | 'opened' | 'message';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [letterStep, setLetterStep] = useState<LetterStep>('hidden');
  const letterStepRef = useRef<LetterStep>('hidden');
  
  // Đồng bộ ref với state
  useEffect(() => {
    letterStepRef.current = letterStep;
  }, [letterStep]);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Setup Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Config Camera
    const updateCameraPosition = () => {
      const isMobile = window.innerWidth < 768;
      const isPortrait = window.innerHeight > window.innerWidth;
      if (isMobile && isPortrait) {
        camera.position.set(0, -1, 16);
      } else if (isMobile) {
        camera.position.set(0, 0, 13);
      } else {
        camera.position.set(0, 0, 12);
      }
    };
    updateCameraPosition();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // 2. Data Arrays
    const particles: THREE.Vector3[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    const brightnesses: number[] = [];
    const moveOffsets: any[] = [];

    const treeHeight = 10;
    const baseRadius = 4;
    const layers = 100;
    const particlesPerLayer = 70;

    // 3. Generate Tree Particles
    for (let layer = 0; layer < layers; layer++) {
      const heightRatio = layer / layers;
      const y = heightRatio * treeHeight - treeHeight / 2;
      const radius = baseRadius * (1 - heightRatio * 0.95);
      const particlesAtThisLayer = Math.max(8, Math.floor(particlesPerLayer * (1 - heightRatio * 0.8)));
      
      for (let i = 0; i < particlesAtThisLayer; i++) {
        const angle = (i / particlesAtThisLayer) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
        const r = radius * (0.95 + Math.random() * 0.1);
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;

        particles.push(new THREE.Vector3(x, y, z));
        brightnesses.push(0.7 + Math.random() * 0.5);
        
        // Color logic
        const colorChoice = Math.random();
        let color: [number, number, number] = [0, 1, 0];
        if (colorChoice < 0.40) { // Green (Giảm còn 40%)
             const intensity = 0.85 + Math.random() * 0.15;
             color = [0.15 * intensity, (0.6 + Math.random() * 0.4) * intensity, 0.15 * intensity];
        } else if (colorChoice < 0.70) { // Gold (Tăng lên 30%)
             const intensity = 0.9 + Math.random() * 0.1;
             color = [1 * intensity, (0.84 + Math.random() * 0.15) * intensity, 0.1 * intensity]; // Vàng rực hơn
        } else if (colorChoice < 0.95) { // Red (Tăng lên 25%)
             const intensity = 0.9 + Math.random() * 0.1;
             color = [1 * intensity, 0.15 * intensity, 0.1 * intensity];
        } else { // Blue (Giảm còn 5%)
             const intensity = 0.85 + Math.random() * 0.15;
             color = [0.4 * intensity, (0.6 + Math.random() * 0.3) * intensity, 1 * intensity];
        }
        colors.push(...color);

        // Size
        const sizeType = Math.random();
        if (sizeType < 0.25) sizes.push(0.02 + Math.random() * 0.04);
        else if (sizeType < 0.5) sizes.push(0.06 + Math.random() * 0.06);
        else if (sizeType < 0.75) sizes.push(0.12 + Math.random() * 0.08);
        else sizes.push(0.22 + Math.random() * 0.1);

        // Movement
        const frequencyVariation = 0.5 + Math.random() * 3;
        const amplitudeVariation = 0.3 + Math.random() * 1.2;
        moveOffsets.push({
          speedX: (Math.random() - 0.2) * 2 * frequencyVariation,
          speedY: (Math.random() - 0.2) * 2 * frequencyVariation,
          speedZ: (Math.random() - 0.2) * 2 * frequencyVariation,
          amplitudeX: amplitudeVariation,
          amplitudeY: amplitudeVariation * 0.8,
          amplitudeZ: amplitudeVariation
        });
      }
    }

    // Trunk
    for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const y = -treeHeight / 2 - Math.random() * 1.5;
        particles.push(new THREE.Vector3(Math.cos(angle) * 0.4, y, Math.sin(angle) * 0.4));
        colors.push(0.4, 0.25, 0.1); 
        sizes.push(0.08);
        brightnesses.push(0.5);
        moveOffsets.push({ speedX: 0.5, speedY: 0.5, speedZ: 0.5, amplitudeX: 0.2, amplitudeY: 0.1, amplitudeZ: 0.2 });
    }

    // 4. Create Tree Geometry & Material (CLEANED UP - REMOVED GPU DISPERSION)
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particles.length * 3);
    const originalPositions = new Float32Array(particles.length * 3);
    
    particles.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      originalPositions[i * 3] = p.x;
      originalPositions[i * 3 + 1] = p.y;
      originalPositions[i * 3 + 2] = p.z;
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(sizes), 1));
    geometry.setAttribute('brightness', new THREE.BufferAttribute(new Float32Array(brightnesses), 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        sizeMultiplier: { value: window.innerWidth < 768 ? 2.5 : 1.0 }
      },
      vertexShader: `
        attribute float size;
        attribute float brightness;
        varying vec3 vColor;
        varying float vBrightness;
        uniform float time;
        uniform float sizeMultiplier;
        void main() {
          vColor = color;
          vBrightness = brightness;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float twinkle = sin(time * 2.5 + position.x * 10.0 + position.y * 5.0) * 0.5 + 0.5;
          float pulse = sin(time * 1.5 + position.y * 4.0) * 0.3 + 0.7;
          gl_PointSize = size * (280.0 / -mvPosition.z) * (0.6 + twinkle * 0.9) * pulse * brightness * sizeMultiplier;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vBrightness;
        void main() {
          vec2 uv = gl_PointCoord;
          float dist = length(uv - vec2(0.5));
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor * 2.0 * vBrightness, alpha * vBrightness);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
      vertexColors: true
    });

    const treeParticles = new THREE.Points(geometry, material);
    scene.add(treeParticles);

    // 5. Stars (Logic Simplified)
    const starParticles: THREE.Vector3[] = [];
    const starColors: number[] = [];
    const starOriginalPositions: number[] = [];
    const starMoveOffsets: any[] = [];
    
    // Create 5-pointed star - WIRE-FRAME style matching reference image
    const createStarPoints = (centerX: number, centerY: number, centerZ: number, outerRadius: number, innerRadius: number) => {
      const points: THREE.Vector3[] = [];
      const particlesPerEdge = 20; // Dense particles for clear lines
      
      // Store all 5 outer and 5 inner points
      const outerPoints: { x: number; y: number }[] = [];
      const innerPoints: { x: number; y: number }[] = [];
      
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 2 * Math.PI) / 5 + Math.PI / 2; // UP instead of DOWN
        const innerAngle = ((i + 0.5) * 2 * Math.PI) / 5 + Math.PI / 2;
        
        outerPoints.push({
          x: centerX + Math.cos(outerAngle) * outerRadius,
          y: centerY + Math.sin(outerAngle) * outerRadius
        });
        
        innerPoints.push({
          x: centerX + Math.cos(innerAngle) * innerRadius,
          y: centerY + Math.sin(innerAngle) * innerRadius
        });
      }
      
      // 1. Lines from CENTER to each OUTER point (radial lines)
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j <= particlesPerEdge; j++) {
          const t = j / particlesPerEdge;
          points.push(new THREE.Vector3(
            centerX + (outerPoints[i].x - centerX) * t,
            centerY + (outerPoints[i].y - centerY) * t,
            centerZ
          ));
        }
      }
      
      // 2. Lines connecting outer points to inner points (star outline)
      for (let i = 0; i < 5; i++) {
        const nextInner = i; // Current inner point
        
        // From outer point to next inner point (clockwise)
        for (let j = 0; j <= particlesPerEdge; j++) {
          const t = j / particlesPerEdge;
          points.push(new THREE.Vector3(
            outerPoints[i].x + (innerPoints[nextInner].x - outerPoints[i].x) * t,
            outerPoints[i].y + (innerPoints[nextInner].y - outerPoints[i].y) * t,
            centerZ
          ));
        }
        
        // From inner point to next outer point
        const nextOuter = (i + 1) % 5;
        for (let j = 0; j <= particlesPerEdge; j++) {
          const t = j / particlesPerEdge;
          points.push(new THREE.Vector3(
            innerPoints[nextInner].x + (outerPoints[nextOuter].x - innerPoints[nextInner].x) * t,
            innerPoints[nextInner].y + (outerPoints[nextOuter].y - innerPoints[nextInner].y) * t,
            centerZ
          ));
        }
      }
      
      return points;
    };

    const starPointsArray = createStarPoints(0, treeHeight / 2 + 0.7, 0, 0.9, 0.36); // Higher position
    starPointsArray.forEach(p => {
      starParticles.push(p);
      starColors.push(1.0, 0.84, 0.0); // Golden star - Pure Yellow (Gold)
      // Star has EXTREME size variation - LARGER overall for visibility
      const starSize = Math.random();
      if (starSize < 0.15) {
        // Medium-small
      } else if (starSize < 0.4) {
        // Medium-large
      } else {
        // Very large
      }
      
      const frequencyVar = 0.3 + Math.random() * 0.5; // Much SLOWER oscillation (was 1-3.5)
      const amplitudeVar = 0.2 + Math.random() * 0.3; // Much SMALLER amplitude (was 0.5-1.5)
      
      starMoveOffsets.push({
        x: 0,
        y: 0,
        z: 0,
        speedX: (Math.random() - 0.5) * 1 * frequencyVar, // Slower speed
        speedY: (Math.random() - 0.5) * 1 * frequencyVar,
        speedZ: (Math.random() - 0.5) * 0.5 * frequencyVar,
        amplitudeX: amplitudeVar * 0.5,
        amplitudeY: amplitudeVar * 0.5,
        amplitudeZ: amplitudeVar * 0.2
      });
    });

    starParticles.forEach(p => {
        starOriginalPositions.push(p.x, p.y, p.z);
    });

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starParticles.length * 3);
    starParticles.forEach((p, i) => { starPositions[i*3] = p.x; starPositions[i*3+1] = p.y; starPositions[i*3+2] = p.z; });
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3).setUsage(THREE.DynamicDrawUsage));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(starColors.length).fill(1), 3)); // Fill dummy colors
    starGeometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(starParticles.length).fill(0.15), 1));
    starGeometry.setAttribute('brightness', new THREE.BufferAttribute(new Float32Array(starParticles.length).fill(1), 1));
    
    const star = new THREE.Points(starGeometry, material); // Dùng chung material
    scene.add(star);

    // 6. Snow
    const snowCount = 1200;
    const snowGeometry = new THREE.BufferGeometry();
    const snowPositions = new Float32Array(snowCount * 3);
    const snowData: any[] = [];
    for (let i = 0; i < snowCount; i++) {
      snowPositions[i * 3] = (Math.random() - 0.5) * 35;
      snowPositions[i * 3 + 1] = Math.random() * 25 - 5;
      snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 35;
      snowData.push({ speed: 0.02 + Math.random() * 0.03, drift: Math.random() * Math.PI * 2 });
    }
    snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    const snow = new THREE.Points(snowGeometry, new THREE.PointsMaterial({color: 0xffffff, size: 0.07, transparent: true, opacity: 0.8}));
    scene.add(snow);

    // ============ LOGIC DISPERSION (CHỈ DÙNG CPU) ============
    
    let isDispersed = false;
    let disperseAmount = 0;

    // Tạo điểm đến ngẫu nhiên (Target) - CHỈ TẠO 1 LẦN
    const treeTargets = particles.map(() => ({
        x: (Math.random() - 0.5) * 50,
        y: (Math.random() - 0.5) * 40,
        z: (Math.random() - 0.5) * 20
    }));
    const starTargets = starParticles.map(() => ({
        x: (Math.random() - 0.5) * 50,
        y: (Math.random() - 0.5) * 40,
        z: (Math.random() - 0.5) * 20
    }));

    // ============ XỬ LÝ SỰ KIỆN CHUỘT/CẢM ỨNG (FIXED) ============
    
    let isDragging = false;
    let isMouseDown = false;
    let startDragX = 0;
    let startDragY = 0;

    // Hàm chung xử lý di chuyển (cho cả Mouse và Touch)
    const handleMoveInput = (clientX: number, clientY: number) => {
        if (isMouseDown) {
            // Nếu đã ấn xuống và di chuyển > 15px thì là Kéo (Drag) - tăng ngưỡng để dễ click
            const moveDistance = Math.sqrt(
                Math.pow(clientX - startDragX, 2) + 
                Math.pow(clientY - startDragY, 2)
            );
            if (moveDistance > 15) {
                isDragging = true;
            }
        }
    };

    const onMouseMove = (e: MouseEvent) => handleMoveInput(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
        e.preventDefault(); // Prevent scrolling
        if (e.touches.length > 0) {
            handleMoveInput(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    // Hàm chung xử lý ấn xuống
    const onDown = (clientX: number, clientY: number) => {
        isMouseDown = true;
        isDragging = false;
        startDragX = clientX;
        startDragY = clientY;
    };

    const onMouseDown = (e: MouseEvent) => onDown(e.clientX, e.clientY);
    const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length > 0) {
            onDown(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    // Hàm chung xử lý nhả ra - Đơn giản hóa: chỉ cần không drag là click
    const onUp = () => {
        if (isMouseDown && !isDragging) {
            // Nếu không phải drag -> là click -> toggle phân tán
            isDispersed = !isDispersed;
            console.log('Dispersion toggled (onUp):', isDispersed, 'disperseAmount will animate to:', isDispersed ? 1 : 0);
        }
        isMouseDown = false;
        isDragging = false;
    };

    // Hàm xử lý click trực tiếp - đơn giản và đáng tin cậy hơn
    const onClick = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isDispersed = !isDispersed;
        console.log('Dispersion toggled (onClick):', isDispersed, 'disperseAmount will animate to:', isDispersed ? 1 : 0);
    };

    // Thêm event listener trực tiếp vào canvas để đảm bảo click được phát hiện
    const canvas = renderer.domElement;
    canvas.style.cursor = 'pointer'; // Hiển thị con trỏ pointer để người dùng biết có thể click
    
    // Thêm cả click event (đơn giản nhất)
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    const onTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        // Chỉ dùng onClick cho touch, không dùng onUp để tránh double toggle
        onClick(e);
    };
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    
    // Thêm vào container để đảm bảo
    if (containerRef.current) {
        containerRef.current.addEventListener('click', onClick);
    }
    
    // Giữ lại các listener trên window/document để xử lý mouse move khi ra ngoài canvas
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onUp);

    // ============ ANIMATION LOOP ============
    const clock = new THREE.Clock();

    const animate = () => {
      requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      material.uniforms.time.value = elapsed;

      // 1. Tính toán trạng thái phân tán (Smooth Transition)
      const targetAmount = isDispersed ? 1 : 0;
      disperseAmount += (targetAmount - disperseAmount) * 0.08; // Lerp nhanh hơn để dễ quan sát

      // Hiển thị phong thư nhỏ khi phân tán > 0.5
      if (disperseAmount > 0.5 && letterStepRef.current === 'hidden') {
        setLetterStep('small');
      } else if (disperseAmount < 0.3 && letterStepRef.current === 'small') {
        setLetterStep('hidden');
      }

      // 2. Cập nhật vị trí cây (CPU Animation)
      const pos = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particles.length; i++) {
         const offset = moveOffsets[i];
         const ox = originalPositions[i * 3];
         const oy = originalPositions[i * 3 + 1];
         const oz = originalPositions[i * 3 + 2];

         // Vị trí bình thường (rung rinh)
         const normalX = ox + Math.sin(elapsed * offset.speedX) * 0.08 * offset.amplitudeX;
         const normalY = oy + Math.sin(elapsed * offset.speedY + 1) * 0.06 * offset.amplitudeY;
         const normalZ = oz + Math.cos(elapsed * offset.speedZ) * 0.08 * offset.amplitudeZ;

         // Vị trí mục tiêu (nổ)
         const tx = treeTargets[i].x;
         const ty = treeTargets[i].y;
         const tz = treeTargets[i].z;

         // Lerp giữa bình thường và nổ
         pos[i * 3]     = normalX + (tx - normalX) * disperseAmount;
         pos[i * 3 + 1] = normalY + (ty - normalY) * disperseAmount;
         pos[i * 3 + 2] = normalZ + (tz - normalZ) * disperseAmount;
      }
      geometry.attributes.position.needsUpdate = true;

      // 3. Cập nhật sao (Tương tự)
      const sPos = starGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < starParticles.length; i++) {
          // ... Logic tương tự cây, giản lược để ngắn gọn code ...
          // Nếu bạn dùng mảng offset cho sao, hãy áp dụng vào đây
          const offset = starMoveOffsets[i];
          const ox = starOriginalPositions[i*3], oy = starOriginalPositions[i*3+1], oz = starOriginalPositions[i*3+2];
          const tx = starTargets[i].x, ty = starTargets[i].y, tz = starTargets[i].z;
          
          const normalX = ox + Math.sin(elapsed * offset.speedX) * 0.04 * offset.amplitudeX;
          const normalY = oy + Math.sin(elapsed * offset.speedY + 1) * 0.04 * offset.amplitudeY;
          const normalZ = oz + Math.cos(elapsed * offset.speedZ) * 0.02 * offset.amplitudeZ;

          sPos[i*3]   = normalX + (tx - normalX) * disperseAmount;
          sPos[i*3+1] = normalY + (ty - normalY) * disperseAmount;
          sPos[i*3+2] = normalZ + (tz - normalZ) * disperseAmount;
      }
      starGeometry.attributes.position.needsUpdate = true;

      // 4. Xoay cây (Dừng khi nổ)
      if (disperseAmount < 0.1) {
         treeParticles.rotation.y = elapsed * 0.1; // Chỉ tự quay, không theo chuột
         treeParticles.rotation.x = 0;
      } else {
         treeParticles.rotation.y *= 0.95;
         treeParticles.rotation.x *= 0.95;
      }

      // 5. Tuyết rơi
      const snPos = snowGeometry.attributes.position.array as Float32Array;
      for(let i=0; i<snowCount; i++) {
          snPos[i*3+1] -= snowData[i].speed;
          if(snPos[i*3+1] < -10) {
              snPos[i*3+1] = 18;
          }
      }
      snowGeometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
        updateCameraPosition();
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (material) material.uniforms.sizeMultiplier.value = window.innerWidth < 768 ? 2.5 : 1.0;
    };
    window.addEventListener('resize', handleResize);


    return () => {
        // Remove canvas event listeners
        canvas.removeEventListener('click', onClick);
        canvas.removeEventListener('mousedown', onMouseDown);
        canvas.removeEventListener('mouseup', onUp);
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchend', onTouchEnd);
        canvas.removeEventListener('touchmove', onTouchMove);
        
        // Remove container event listeners
        if (containerRef.current) {
            containerRef.current.removeEventListener('click', onClick);
        }
        
        // Remove window/document event listeners
        window.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onUp);
        window.removeEventListener('resize', handleResize);
        
        // Cleanup Three.js resources
        containerRef.current?.removeChild(renderer.domElement);
        geometry.dispose(); 
        material.dispose();
        starGeometry.dispose(); 
        snowGeometry.dispose();
        renderer.dispose();
    };
  }, []);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Mock data for surrounding images
  const memories = [
    // Góc trên trái (gần hơn)
    { id: 1, url: '/1.jpg', x: 25, y: 30, r: -15, delay: 0 },
    // Góc trên phải (gần hơn)
    { id: 2, url: '/2.jpg', x: 75, y: 25, r: 10, delay: 0.2 },
    // Góc dưới trái (gần hơn)
    { id: 3, url: '/3.jpg', x: 20, y: 70, r: 8, delay: 0.4 },
    // Góc dưới phải (gần hơn)
    { id: 4, url: '/4.jpg', x: 80, y: 75, r: -12, delay: 0.6 },
    // Giữa trên
    { id: 5, url: '/5.jpg', x: 50, y: 20, r: 5, delay: 0.8 },
    // Giữa dưới
    { id: 6, url: '/6.jpg', x: 50, y: 80, r: -5, delay: 1.0 },
    // Giữa trái
    { id: 7, url: '/7.jpg', x: 15, y: 50, r: 15, delay: 1.2 },
    // Giữa phải
    { id: 8, url: '/8.jpg', x: 85, y: 50, r: -8, delay: 1.4 },
  ];

  // Component ảnh bay xung quanh
  const FloatingImages = () => {
    // Chỉ hiển thị khi đã phân tán (letterStep không phải hidden) và chưa vào trang cuối
    // Update: User said "hiển thị thêm các ảnh xung quanh sau khi phân tán"
    // We can show them when letterStep is 'small' or greater.
    if (letterStep === 'hidden') return null;

    return (
      <>
        {memories.map((mem) => (
          <div 
            key={mem.id}
            className="floating-image-card"
            style={{
              top: `${mem.y}%`,
              left: `${mem.x}%`,
              transform: `translate(-50%, -50%) rotate(${mem.r}deg)`,
              animationDelay: `${mem.delay + 1.5}s`
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(mem.url);
            }}
          >
            <div className="image-card-inner">
               <img src={mem.url} alt="Christmas memory" />
            </div>
          </div>
        ))}
      </>
    );
  };

  // Component xem ảnh to (Modal)
  const ImageModal = () => {
    if (!selectedImage) return null;
    return (
       <div className="image-modal" onClick={() => setSelectedImage(null)}>
         <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} alt="Full size memory" />
            <button className="close-button" onClick={() => setSelectedImage(null)}>×</button>
         </div>
       </div>
    );
  };

  // Component phong thư nhỏ lơ lửng
  const SmallLetter = () => {
    if (letterStep !== 'small') return null;
    return (
      <div className="small-letter" onClick={(e) => {
        e.stopPropagation();
        setLetterStep('opening');
      }}>
        <div className="letter-envelope">
          <div className="letter-flap"></div>
          <div className="letter-body"></div>
        </div>
      </div>
    );
  };

  // Component phong thư mở
  const OpenedLetter = () => {
    if (letterStep !== 'opening' && letterStep !== 'opened') return null;
    
    // Tự động chuyển sang 'opened' sau khi animation mở xong
    if (letterStep === 'opening') {
      setTimeout(() => setLetterStep('opened'), 800);
    }
    
    return (
      <div className={`opened-letter ${letterStep === 'opening' ? 'opening' : 'opened'}`}>
        <div className="letter-backdrop" onClick={(e) => {
          e.stopPropagation();
          setLetterStep('small');
        }}></div>
        <div className="letter-content">
          <div className="letter-paper" onClick={(e) => {
            e.stopPropagation();
            setLetterStep('message');
          }}>
            <div className="letter-text">
              <h2>🎄 Giáng Sinh An Lành 🎄</h2>
              <p>Ấn vào để xem lời chúc...</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Component trang lời chúc
  const MessagePage = () => {
    if (letterStep !== 'message') return null;
    return (
      <div className="message-page">
        <div className="message-backdrop" onClick={(e) => {
          e.stopPropagation();
          setLetterStep('small');
        }}></div>
        <div className="message-content">
          <h1>🎄 Chúc Mừng Giáng Sinh 🎄</h1>
          <div className="message-text">
            <p>Chúc bạn và gia đình một mùa Giáng Sinh thật ấm áp và hạnh phúc!</p>
            <p>Mong rằng năm mới sẽ mang đến nhiều niềm vui và thành công!</p>
            <p>✨ Merry Christmas & Happy New Year! ✨</p>
          </div>
        </div>
      </div>
    );
  };



  return (
    <div className="app">
      <div ref={containerRef} className="canvas-container" />
      <div className="overlay">
        <h1 className="title">🎄 Merry Christmas 🎄</h1>
        <p className="subtitle">Ấn vào để xem bất ngờ hihi</p>
      </div>
      <FloatingImages />
      <SmallLetter />
      <OpenedLetter />
      <MessagePage />
      <ImageModal />

    </div>
  );
}

export default App;
