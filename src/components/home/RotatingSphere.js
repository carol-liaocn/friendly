import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import mediaList from '../../data/mediaList.json';

/**
 * 旋转球体组件 - 使用Three.js创建可交互的视频立方体球体
 * 支持视频预加载和即时切换功能
 */
const RotatingSphere = () => {
  // ==================== THREE.JS 相关引用 ====================
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cubeGroupRef = useRef(null);
  const cameraRef = useRef(null);
  const textureLoaderRef = useRef(new THREE.TextureLoader());
  const animationIdRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const lastFrameTimeRef = useRef(0);
  
  // ==================== 鼠标交互相关引用 ====================
  const mouseRef = useRef({ isDown: false, x: 0, y: 0 });
  const mouseSpeedRef = useRef({ 
    lastPosition: { x: 0, y: 0 },
    lastTime: 0,
    currentSpeed: 0,
    history: [],
    lastUpdateTime: 0
  });
  const mousePosRef = useRef(new THREE.Vector2());
  const rotationRef = useRef({ x: 0, y: 0, z: 0 });
  const autoRotationRef = useRef({ x: 0.002, y: 0.005, z: 0.001 });
  
  // ==================== 立方体球体相关引用 ====================
  const cubesDataRef = useRef([]);
  const sphereHelperRef = useRef(null); // 用于鼠标检测的不可见球体
  
  // ==================== 视频系统相关引用 ====================
  const videoElementRef = useRef(null);
  const videoPoolRef = useRef(new Map()); // 视频预加载池
  const currentVideoPathRef = useRef(null);
  const preloadQueueRef = useRef([]);
  const isPreloadingRef = useRef(false);
  const isLoadingTextureRef = useRef(false);
  const lastSwitchTimeRef = useRef(0);
  const failedVideosRef = useRef(new Set());
  
  // ==================== 组件状态 ====================
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [, setWorkingVideos] = useState([]); // 记录失败的视频

  // 球体和立方体配置
  const SPHERE_CONFIG = useMemo(() => ({
    radius: 1.14, // 基础半径：原始1.2的95%
    cubesPerRing: 20, // 每个环的立方体数量（减少以提升性能）
    rings: 30, // 环的数量（从36减少到30，减少16.7%）
    cubeSize: 0.228, // 立方体大小：原始0.24的95%
    flipRadius: 0.25, // 鼠标影响半径
    flipDuration: 250, // 翻转动画时长（进一步提升响应速度）
    trailDuration: 300, // 拖尾持续时间（毫秒）- 减少以提升性能
    returnDuration: 250, // 回归时间（毫秒）- 减少以提升性能
    maxTrailRotation: Math.PI * 0.6, // 拖尾最大旋转角度（减少）
    initialTrailVelocity: 3.0, // 初始拖尾旋转速度（减少以提升性能）
    
    // 物理交互参数
    maxFloatHeight: 0.04, // 最大浮起高度（降低弹出高度）
    springStiffness: 10.0, // 弹簧刚性（优化）
    dampingRatio: 0.7, // 阻尼比
    explodeDuration: 250, // 破裂效果持续时间（毫秒）
    explodeDistance: 0.1, // 破裂最大距离（减少）
    mouseSpeedThreshold: 1.8, // 触发破裂效果的鼠标速度阈值（提高以减少触发）
  }), []);

  // 计算球体大小
  const calculateSphereSize = useCallback(() => {
    const viewportHeight = window.innerHeight;
    const titleBottomPosition = 80;
    const cameraDistance = 3;
    const fov = 75;
    
    const worldHeight = 2 * cameraDistance * Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const titleBottomInWorld = (titleBottomPosition / viewportHeight) * worldHeight;
    const bottomMargin = (40 / viewportHeight) * worldHeight;
    const availableHeight = worldHeight - titleBottomInWorld - bottomMargin;
    const radius = (availableHeight / 2) * 0.8075; // 动态计算系数：原始0.85的95%
    
    return Math.max(radius, 0.475); // 最小半径：原始0.5的95%
  }, []);

  // 生成球面上的立方体位置和UV坐标
  const generateCubePositions = useCallback((radius) => {
    const positions = [];
    const uvCoords = [];
    const { rings, cubeSize } = SPHERE_CONFIG;
    
    // 调整环间距，确保纵向完全覆盖，增加微量重叠
    const ringSpacing = Math.PI / (rings + 1); // 稍微密集分布
    const cubeOverlap = 0.15; // 立方体重叠系数，从0.2减少到0.15（较大立方体需要较小重叠）
    
    for (let ring = 0; ring < rings; ring++) {
      const phi = (ring + 0.5) * ringSpacing; // 从0到π，均匀分布，避免极点重叠
      const ringRadius = Math.sin(phi) * radius;
      const y = Math.cos(phi) * radius;
      
      // 根据环的大小调整立方体数量，确保水平方向覆盖
      const circumference = 2 * Math.PI * ringRadius;
      let cubesInThisRing;
      
      if (ring === 0 || ring === rings - 1) {
        // 极点处放置足够立方体确保覆盖（从12减少到10）
        cubesInThisRing = 10;
      } else if (ring < 3 || ring > rings - 4) {
        // 接近极点的环增加密度（从14减少到12）
        cubesInThisRing = Math.max(12, Math.floor(circumference / (cubeSize * cubeOverlap * 0.8)));
      } else {
        // 其他环根据周长计算，确保完全覆盖（从16减少到14）
        cubesInThisRing = Math.max(14, Math.floor(circumference / (cubeSize * cubeOverlap * 0.9)));
      }
      
      for (let i = 0; i < cubesInThisRing; i++) {
        const theta = (i / cubesInThisRing) * 2 * Math.PI;
        const x = ringRadius * Math.cos(theta);
        const z = ringRadius * Math.sin(theta);
        
        const position = new THREE.Vector3(x, y, z);
        
        // 计算UV坐标
        const u = (theta / (2 * Math.PI) + 0.5) % 1;
        const v = 1 - (phi / Math.PI);
        
        positions.push(position);
        uvCoords.push({ u, v });
      }
    }
    
    return { positions, uvCoords };
  }, [SPHERE_CONFIG]);

  // 创建不同深浅的黄色材质（优化内存使用）
  const yellowMaterials = useMemo(() => ({
    // 右面 - #ffff00
    right: new THREE.MeshBasicMaterial({ 
      color: 0xffff00, // #ffff00
      transparent: true,
      opacity: 1.0
    }),
    // 左面 - #ffe600  
    left: new THREE.MeshBasicMaterial({ 
      color: 0xffe600, // #ffe600
      transparent: true,
      opacity: 1.0
    }),
    // 上面 - #ffff6b
    top: new THREE.MeshBasicMaterial({ 
      color: 0xffff6b, // #ffff6b
      transparent: true,
      opacity: 1.0
    }),
    // 下面 - #ffe600
    bottom: new THREE.MeshBasicMaterial({ 
      color: 0xffe600, // #ffe600
      transparent: true,
      opacity: 1.0
    }),
    // 后面 - #ffff00
    back: new THREE.MeshBasicMaterial({ 
      color: 0xffff00, // #ffff00
      transparent: true,
      opacity: 1.0
    })
  }), []);

  // 共享的立方体几何体（优化内存使用）
  const sharedCubeGeometry = useMemo(() => 
    new THREE.BoxGeometry(
      SPHERE_CONFIG.cubeSize, // 使用配置参数
      SPHERE_CONFIG.cubeSize,
      SPHERE_CONFIG.cubeSize
    ), [SPHERE_CONFIG.cubeSize]
  );

  // 创建立方体几何体和材质
  const createCubeMaterials = useCallback((videoTexture, uv, fallbackMaterial = null) => {
    let frontMaterial;
    
    if (videoTexture) {
      // 有视频贴图时，使用视频贴图
      frontMaterial = new THREE.MeshBasicMaterial({
        map: videoTexture.clone(),
        transparent: true,
        opacity: 1.0,
      });
      
      // 设置UV偏移，让每个立方体显示贴图的不同部分
      frontMaterial.map.wrapS = THREE.RepeatWrapping;
      frontMaterial.map.wrapT = THREE.RepeatWrapping;
      
      // 计算UV偏移和重复（根据立方体大小调整）
      const uvSize = 0.055; // 每个立方体占用贴图的比例（从0.04增加到0.055，适应更大的立方体）
      frontMaterial.map.repeat.set(uvSize, uvSize);
      frontMaterial.map.offset.set(uv.u * (1 - uvSize), uv.v * (1 - uvSize));
      frontMaterial.map.needsUpdate = true;
    } else if (fallbackMaterial) {
      // 使用备用材质
      frontMaterial = fallbackMaterial.clone();
    } else {
      // 没有任何贴图时，使用默认黄色
      frontMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 1.0,
      });
    }
    
    return [
      yellowMaterials.right,  // 右面 - 亮黄色
      yellowMaterials.left,   // 左面 - 深黄色
      yellowMaterials.top,    // 上面 - 浅黄色
      yellowMaterials.bottom, // 下面 - 中等黄色
      frontMaterial,          // 前面（贴图面）
      yellowMaterials.back,   // 后面 - 暗黄色
    ];
  }, [yellowMaterials]);

  // 初始化立方体球体
  const initCubeSphere = useCallback((radius, videoTexture, fallbackMaterial = null) => {
    console.log('初始化立方体球体...', { hasVideoTexture: !!videoTexture, hasFallbackMaterial: !!fallbackMaterial });
    
    // 清理之前的立方体
    if (cubeGroupRef.current) {
      sceneRef.current.remove(cubeGroupRef.current);
      cubeGroupRef.current = null;
    }
    
    const cubeGroup = new THREE.Group();
    const { positions, uvCoords } = generateCubePositions(radius);
    
    // 存储立方体数据
    const cubesData = [];
    
    positions.forEach((position, index) => {
      // 为每个立方体创建独特的材质
      const materials = createCubeMaterials(videoTexture, uvCoords[index], fallbackMaterial);
      
      // 创建立方体（使用共享几何体）
      const cube = new THREE.Mesh(sharedCubeGeometry, materials);
      
      // 设置位置
      cube.position.copy(position);
      
      // 计算朝向球心外的方向，确保立方体的正面（贴图面）朝外
      const direction = position.clone().normalize();
      const targetPosition = position.clone().add(direction.multiplyScalar(0.1));
      cube.lookAt(targetPosition);
      
      // 存储立方体数据
      const cubeData = {
        mesh: cube,
        originalPosition: position.clone(),
        originalRotation: cube.rotation.clone(),
        uv: uvCoords[index],
        isFlipped: false,
        flipProgress: 0,
        targetFlipProgress: 0,
        flipDelay: 0,
        delayTimer: 0,
        // 物理交互效果相关属性
        trailTimer: 0, // 拖尾计时器
        isInTrail: false, // 是否处于拖尾状态
        isInReturn: false, // 是否处于回归状态
        isExploding: false, // 是否处于破裂状态
        lastActiveTime: 0, // 最后一次被鼠标激活的时间
        trailIntensity: 0, // 拖尾强度
        
        // 旋转相关
        rotationVelocity: 0, // 旋转速度（弧度/秒）
        maxRotationAngle: 0, // 最大旋转角度
        currentRotationAngle: 0, // 当前旋转角度
        
        // 位置偏移相关（浮起效果）
        currentOffset: new THREE.Vector3(0, 0, 0), // 当前位置偏移
        targetOffset: new THREE.Vector3(0, 0, 0), // 目标位置偏移
        offsetVelocity: new THREE.Vector3(0, 0, 0), // 位置偏移速度
        maxOffset: 0, // 最大偏移距离
        
        // 物理弹簧属性
        springStiffness: 8.0, // 弹簧刚性
        dampingRatio: 0.6, // 阻尼比
        
        // 视觉效果
        currentOpacity: 1.0, // 当前透明度
        targetOpacity: 1.0, // 目标透明度
        
        // 破裂效果
        explodeTimer: 0, // 破裂计时器
        explodeDirection: new THREE.Vector3(0, 0, 0), // 破裂方向
        explodeIntensity: 0, // 破裂强度
      };
      
      cubesData.push(cubeData);
      cubeGroup.add(cube);
    });
    
    cubesDataRef.current = cubesData;
    cubeGroupRef.current = cubeGroup;
    sceneRef.current.add(cubeGroup);
    
    // 创建用于鼠标检测的不可见球体
    const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      visible: false,
    });
    const sphereHelper = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereHelperRef.current = sphereHelper;
    cubeGroup.add(sphereHelper);
    
    console.log(`创建了 ${cubesData.length} 个立方体`);
  }, [generateCubePositions, createCubeMaterials, sharedCubeGeometry]);

  // 更新立方体贴图（分批处理以提升性能，优先更新正面立方体）
  const updateCubeTextures = useCallback((videoTexture) => {
    if (!cubesDataRef.current.length || !videoTexture || !cameraRef.current || !cubeGroupRef.current) return;
    
    console.log('开始分批更新立方体贴图（优先正面）...');
    
    // 设置贴图的基本属性
    videoTexture.wrapS = THREE.RepeatWrapping;
    videoTexture.wrapT = THREE.RepeatWrapping;
    videoTexture.needsUpdate = true;
    
    // 获取摄像机位置（考虑球体组的变换）
    const cameraWorldPosition = new THREE.Vector3();
    cameraRef.current.getWorldPosition(cameraWorldPosition);
    
    // 将摄像机位置转换到立方体组的本地坐标系
    const cameraLocalPosition = cameraWorldPosition.clone();
    cubeGroupRef.current.worldToLocal(cameraLocalPosition);
    
    // 计算每个立方体的优先级（离摄像机越近、越正面的优先级越高）
    const cubesWithPriority = cubesDataRef.current.map((cubeData, index) => {
      // 计算立方体到摄像机的距离
      const distanceToCamera = cubeData.originalPosition.distanceTo(cameraLocalPosition);
      
      // 计算立方体朝向摄像机的程度（dot product）
      const cubeToCamera = cameraLocalPosition.clone().sub(cubeData.originalPosition).normalize();
      const cubeNormal = cubeData.originalPosition.clone().normalize(); // 立方体法线（朝外）
      const facingDot = cubeNormal.dot(cubeToCamera); // 值越大表示越朝向摄像机
      
      // 综合优先级：朝向权重70%，距离权重30%
      const facingScore = Math.max(0, facingDot); // 0-1，越大越正面
      const distanceScore = 1 / (1 + distanceToCamera * 0.5); // 距离越近分数越高
      const priority = facingScore * 0.7 + distanceScore * 0.3;
      
      return {
        cubeData,
        index,
        priority,
        distanceToCamera,
        facingScore
      };
    });
    
    // 按优先级排序（优先级高的在前）
    cubesWithPriority.sort((a, b) => b.priority - a.priority);
    
    console.log(`按优先级排序完成，最高优先级: ${cubesWithPriority[0].priority.toFixed(3)}，最低优先级: ${cubesWithPriority[cubesWithPriority.length - 1].priority.toFixed(3)}`);
    
    let currentIndex = 0;
    const batchSize = 25; // 稍微增加批次大小，因为有了智能排序
    const totalCubes = cubesWithPriority.length;
    
    const processBatch = () => {
      const endIndex = Math.min(currentIndex + batchSize, totalCubes);
      
      for (let i = currentIndex; i < endIndex; i++) {
        const { cubeData } = cubesWithPriority[i];
        
        // 更新前面（贴图面）的材质
        if (cubeData.mesh.material[4]) {
          // 释放旧材质的贴图资源
          const oldMaterial = cubeData.mesh.material[4];
          if (oldMaterial.map) {
            oldMaterial.map.dispose();
          }
          
          // 创建新材质
          const newMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: oldMaterial.opacity || 1.0,
          });
          
          // 创建贴图副本并设置UV变换
          const textureClone = videoTexture.clone();
          textureClone.wrapS = THREE.RepeatWrapping;
          textureClone.wrapT = THREE.RepeatWrapping;
          
          const uvSize = 0.055;
          textureClone.repeat.set(uvSize, uvSize);
          textureClone.offset.set(cubeData.uv.u * (1 - uvSize), cubeData.uv.v * (1 - uvSize));
          textureClone.needsUpdate = true;
          
          newMaterial.map = textureClone;
          
          // 释放旧材质
          oldMaterial.dispose();
          
          // 更新材质
          cubeData.mesh.material[4] = newMaterial;
        }
      }
      
      currentIndex = endIndex;
      
      // 如果还有未处理的立方体，继续下一批
      if (currentIndex < totalCubes) {
        requestAnimationFrame(processBatch);
      } else {
        console.log(`完成更新 ${totalCubes} 个立方体的贴图（优先级排序）`);
      }
    };
    
    // 开始分批处理
    processBatch();
  }, []);

  // 处理鼠标移动时的立方体物理交互
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleCubeFlip = useCallback((intersectionPoint, mouseSpeed = 0) => {
    if (!cubesDataRef.current.length || !intersectionPoint || !cubeGroupRef.current) return;
    
    // 将世界坐标的交点转换为球体本地坐标
    const localIntersectionPoint = intersectionPoint.clone();
    cubeGroupRef.current.worldToLocal(localIntersectionPoint);
    
    const currentTime = performance.now();
    const isHighSpeed = mouseSpeed > SPHERE_CONFIG.mouseSpeedThreshold;
    
    cubesDataRef.current.forEach((cubeData) => {
      const distance = cubeData.originalPosition.distanceTo(localIntersectionPoint);
      
      // 计算影响强度
      if (distance < 0.25) {
        // 在影响半径内，立方体被激活
        const normalizedDistance = distance / 0.25;
        const fadeEffect = 1 - normalizedDistance; // 线性衰减
        
        // 如果鼠标速度很快，触发破裂效果
        if (isHighSpeed && !cubeData.isExploding) {
          cubeData.isExploding = true;
          cubeData.explodeTimer = 0;
          cubeData.explodeIntensity = Math.min(1.0, mouseSpeed / SPHERE_CONFIG.mouseSpeedThreshold);
          
          // 计算破裂方向（从球心向外）
          const direction = cubeData.originalPosition.clone().normalize();
          cubeData.explodeDirection.copy(direction);
          
          // 破裂时轻微透明度变化
          cubeData.targetOpacity = 0.85;
        } else if (!cubeData.isExploding) {
          // 正常交互
          cubeData.targetFlipProgress = Math.max(0.3, fadeEffect);
          cubeData.flipDelay = normalizedDistance * 0.05;
          
          // 计算浮起方向（从球心向外）
          const floatDirection = cubeData.originalPosition.clone().normalize();
          const floatDistance = SPHERE_CONFIG.maxFloatHeight * fadeEffect;
          cubeData.targetOffset.copy(floatDirection.multiplyScalar(floatDistance));
          cubeData.maxOffset = floatDistance;
          
          // 交互时轻微透明度变化
          cubeData.targetOpacity = 0.92;
        }
        
        // 更新状态属性
        cubeData.lastActiveTime = currentTime;
        cubeData.isInTrail = false;
        cubeData.isInReturn = false;
        cubeData.trailTimer = 0;
        cubeData.trailIntensity = fadeEffect;
        cubeData.rotationVelocity = 0;
        
      } else if (!cubeData.isInTrail && !cubeData.isInReturn && !cubeData.isExploding && cubeData.targetFlipProgress > 0) {
        // 鼠标离开但立方体之前被激活过，进入拖尾状态
        cubeData.isInTrail = true;
        cubeData.isInReturn = false;
        cubeData.trailTimer = 0;
        
        // 设置初始拖尾旋转速度
        cubeData.rotationVelocity = SPHERE_CONFIG.initialTrailVelocity * cubeData.trailIntensity;
        cubeData.maxRotationAngle = SPHERE_CONFIG.maxTrailRotation * cubeData.trailIntensity;
        cubeData.currentRotationAngle = cubeData.flipProgress * Math.PI;
      }
    });
  }, [SPHERE_CONFIG.mouseSpeedThreshold, SPHERE_CONFIG.maxFloatHeight, SPHERE_CONFIG.initialTrailVelocity, SPHERE_CONFIG.maxTrailRotation]);

  // 计算鼠标移动速度
  const calculateMouseSpeed = useCallback((x, y) => {
    const currentTime = performance.now();
    const deltaTime = currentTime - mouseSpeedRef.current.lastTime;
    
    if (deltaTime > 0) {
      const deltaX = x - mouseSpeedRef.current.lastPosition.x;
      const deltaY = y - mouseSpeedRef.current.lastPosition.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const speed = distance / (deltaTime / 1000); // 像素/秒
      
      // 更新速度历史（保留最近5次）
      mouseSpeedRef.current.history.push(speed);
      if (mouseSpeedRef.current.history.length > 5) {
        mouseSpeedRef.current.history.shift();
      }
      
      // 计算平均速度以平滑波动
      const avgSpeed = mouseSpeedRef.current.history.reduce((sum, s) => sum + s, 0) / mouseSpeedRef.current.history.length;
      mouseSpeedRef.current.currentSpeed = avgSpeed;
      
      mouseSpeedRef.current.lastPosition = { x, y };
      mouseSpeedRef.current.lastTime = currentTime;
      
      return avgSpeed;
    }
    
    return mouseSpeedRef.current.currentSpeed;
  }, []);

  // 重置所有立方体的拖尾状态（鼠标离开球体时调用）
  const resetTrailStates = useCallback(() => {
    cubesDataRef.current.forEach((cubeData) => {
      if ((cubeData.targetFlipProgress > 0 || cubeData.targetOffset.length() > 0) && 
          !cubeData.isInTrail && !cubeData.isInReturn && !cubeData.isExploding) {
        // 将还未进入拖尾状态的立方体设置为拖尾状态
        cubeData.isInTrail = true;
        cubeData.isInReturn = false;
        cubeData.trailTimer = 0;
        cubeData.trailIntensity = Math.max(cubeData.targetFlipProgress, cubeData.targetOffset.length() / SPHERE_CONFIG.maxFloatHeight);
        
        // 设置初始拖尾旋转速度
        cubeData.rotationVelocity = SPHERE_CONFIG.initialTrailVelocity * cubeData.trailIntensity;
        cubeData.maxRotationAngle = SPHERE_CONFIG.maxTrailRotation * cubeData.trailIntensity;
        cubeData.currentRotationAngle = cubeData.flipProgress * Math.PI;
        
        // 开始位置偏移的物理回归
        cubeData.targetOffset.set(0, 0, 0);
        
        // 拖尾开始时保持当前透明度
        if (cubeData.currentOpacity < 0.92) {
          cubeData.currentOpacity = 0.92;
        }
      }
    });
  }, [SPHERE_CONFIG.maxFloatHeight, SPHERE_CONFIG.initialTrailVelocity, SPHERE_CONFIG.maxTrailRotation]);

  // 更新立方体物理动画系统
  const updateCubeAnimations = useCallback((deltaTime) => {
    if (!cubesDataRef.current.length) return;
    
    const speed = 1 / (SPHERE_CONFIG.flipDuration / 1000); // 转换为每秒的速度
    const deltaTimeMs = deltaTime * 1000; // 转换为毫秒
    
    cubesDataRef.current.forEach((cubeData) => {
      let needsUpdate = false;
      
      // 处理破裂效果
      if (cubeData.isExploding) {
        cubeData.explodeTimer += deltaTimeMs;
        
        if (cubeData.explodeTimer < SPHERE_CONFIG.explodeDuration) {
          // 破裂动画进行中
          const explodeProgress = cubeData.explodeTimer / SPHERE_CONFIG.explodeDuration;
          const easeOut = 1 - Math.pow(1 - explodeProgress, 3); // 缓出动画
          
          // 快速旋转
          cubeData.currentRotationAngle = easeOut * Math.PI * 2 * cubeData.explodeIntensity;
          
          // 向外弹出
          const explodeDistance = SPHERE_CONFIG.explodeDistance * cubeData.explodeIntensity * Math.sin(explodeProgress * Math.PI);
          cubeData.currentOffset.copy(cubeData.explodeDirection).multiplyScalar(explodeDistance);
          
          // 破裂时逐渐透明
          const explodeOpacity = 0.85 + (1 - explodeProgress) * 0.15;
          cubeData.currentOpacity = explodeOpacity;
          
          needsUpdate = true;
        } else {
          // 破裂效果结束，进入回归状态
          cubeData.isExploding = false;
          cubeData.isInReturn = true;
          cubeData.trailTimer = 0;
          cubeData.targetOpacity = 1.0;
        }
      }
      
      // 处理拖尾运动状态
      else if (cubeData.isInTrail) {
        cubeData.trailTimer += deltaTimeMs;
        
        if (cubeData.trailTimer < SPHERE_CONFIG.trailDuration) {
          // 拖尾阶段：继续翻转但速度逐渐减慢
          const trailProgress = cubeData.trailTimer / SPHERE_CONFIG.trailDuration;
          
          // 速度线性衰减到0
          cubeData.rotationVelocity = (SPHERE_CONFIG.initialTrailVelocity * cubeData.trailIntensity) * (1 - trailProgress);
          
          // 继续旋转
          cubeData.currentRotationAngle += cubeData.rotationVelocity * deltaTime;
          
          // 限制最大角度
          if (cubeData.currentRotationAngle > cubeData.maxRotationAngle) {
            cubeData.currentRotationAngle = cubeData.maxRotationAngle;
            cubeData.rotationVelocity = 0;
          }
          
          // 拖尾时透明度逐渐回升
          cubeData.targetOpacity = 0.92 + trailProgress * 0.08; // 从0.92逐渐回到1.0
          
          needsUpdate = true;
        } else {
          // 拖尾时间结束，进入回归阶段
          cubeData.isInTrail = false;
          cubeData.isInReturn = true;
          cubeData.trailTimer = 0;
          cubeData.rotationVelocity = 0;
        }
      }
      
      // 处理回归状态
      else if (cubeData.isInReturn) {
        cubeData.trailTimer += deltaTimeMs;
        
        const returnProgress = cubeData.trailTimer / SPHERE_CONFIG.returnDuration;
        const easeInOut = returnProgress < 0.5 ? 
          2 * returnProgress * returnProgress : 
          1 - Math.pow(-2 * returnProgress + 2, 3) / 2; // 缓入缓出
        
        if (returnProgress >= 1) {
          // 回归完成，重置所有状态
          cubeData.isInReturn = false;
          cubeData.currentRotationAngle = 0;
          cubeData.flipProgress = 0;
          cubeData.targetFlipProgress = 0;
          cubeData.trailTimer = 0;
          cubeData.trailIntensity = 0;
          cubeData.rotationVelocity = 0;
          cubeData.maxRotationAngle = 0;
          cubeData.currentOffset.set(0, 0, 0);
          cubeData.targetOffset.set(0, 0, 0);
          cubeData.currentOpacity = 1.0;
          cubeData.targetOpacity = 1.0;
          
          needsUpdate = true;
        } else {
          // 使用弹簧回归
          const currentAngle = cubeData.maxRotationAngle * (1 - easeInOut);
          cubeData.currentRotationAngle = currentAngle;
          
          // 位置偏移也回归
          cubeData.currentOffset.multiplyScalar(1 - easeInOut);
          
          // 透明度平滑回归到1.0
          cubeData.targetOpacity = cubeData.currentOpacity + (1.0 - cubeData.currentOpacity) * easeInOut;
          
          needsUpdate = true;
        }
      }
      
      // 处理正常状态的物理弹簧模拟
      else {
        // 简化延迟处理
        if (cubeData.flipDelay > 0) {
          cubeData.delayTimer += deltaTime;
          if (cubeData.delayTimer < cubeData.flipDelay) {
            return; // 还在延迟期间，跳过动画更新
          }
        }
        
        // 旋转动画
        const rotDiff = cubeData.targetFlipProgress - cubeData.flipProgress;
        if (Math.abs(rotDiff) > 0.01) {
          cubeData.flipProgress += Math.sign(rotDiff) * Math.min(Math.abs(rotDiff), speed * deltaTime);
          cubeData.currentRotationAngle = cubeData.flipProgress * Math.PI;
          needsUpdate = true;
        }
        
        // 物理弹簧模拟位置偏移
        const offsetDiff = cubeData.targetOffset.clone().sub(cubeData.currentOffset);
        if (offsetDiff.length() > 0.001) {
          // 弹簧力 = k * 位移
          const springForce = offsetDiff.clone().multiplyScalar(SPHERE_CONFIG.springStiffness);
          
          // 阻尼力 = -c * 速度
          const dampingForce = cubeData.offsetVelocity.clone().multiplyScalar(-SPHERE_CONFIG.dampingRatio);
          
          // 合力 = 弹簧力 + 阻尼力
          const totalForce = springForce.add(dampingForce);
          
          // 更新速度和位置
          cubeData.offsetVelocity.add(totalForce.multiplyScalar(deltaTime));
          cubeData.currentOffset.add(cubeData.offsetVelocity.clone().multiplyScalar(deltaTime));
          
          needsUpdate = true;
        } else {
          cubeData.offsetVelocity.set(0, 0, 0);
          cubeData.delayTimer = 0;
        }
        
        // 透明度动画（微妙变化）
        const opacityDiff = cubeData.targetOpacity - cubeData.currentOpacity;
        if (Math.abs(opacityDiff) > 0.005) {
          cubeData.currentOpacity += Math.sign(opacityDiff) * Math.min(Math.abs(opacityDiff), 2.0 * deltaTime);
          needsUpdate = true;
        } else {
          // 没有交互时回到完全不透明
          if (cubeData.targetFlipProgress === 0 && cubeData.targetOffset.length() === 0) {
            cubeData.targetOpacity = 1.0;
          }
        }
      }
      
      // 应用所有变换
      if (needsUpdate) {
        // 应用旋转
        cubeData.mesh.rotation.copy(cubeData.originalRotation);
        cubeData.mesh.rotateY(cubeData.currentRotationAngle);
        
        // 应用位置偏移
        const newPosition = cubeData.originalPosition.clone().add(cubeData.currentOffset);
        cubeData.mesh.position.copy(newPosition);
        
        // 应用透明度
        if (cubeData.mesh.material) {
          if (Array.isArray(cubeData.mesh.material)) {
            cubeData.mesh.material.forEach(mat => {
              if (mat && mat.opacity !== undefined) {
                mat.opacity = cubeData.currentOpacity;
              }
            });
          } else if (cubeData.mesh.material.opacity !== undefined) {
            cubeData.mesh.material.opacity = cubeData.currentOpacity;
          }
        }
        
        // 更新状态
        cubeData.flipProgress = cubeData.currentRotationAngle / Math.PI;
        cubeData.isFlipped = cubeData.flipProgress > 0.5;
      }
    });
  }, [SPHERE_CONFIG.flipDuration, SPHERE_CONFIG.explodeDuration, SPHERE_CONFIG.explodeDistance, SPHERE_CONFIG.trailDuration, SPHERE_CONFIG.initialTrailVelocity, SPHERE_CONFIG.returnDuration, SPHERE_CONFIG.springStiffness, SPHERE_CONFIG.dampingRatio]);

  // 初始化Three.js场景
  const initThreeJS = useCallback(() => {
    if (!mountRef.current) return {};

    console.log('初始化Three.js场景...');

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x131313);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 3;
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // 将渲染器添加到DOM
    const mountElement = mountRef.current;
    mountElement.appendChild(renderer.domElement);

    console.log('Three.js场景初始化完成');
    setIsInitialized(true);
    return { scene, camera, renderer, mountElement };
  }, []);

  // 创建备用球体（无贴图）
  const createFallbackSphere = useCallback(() => {
    console.log('🎨 创建备用球体...');
    const sphereRadius = calculateSphereSize();
    
    // 创建渐变黄色材质
    const fallbackMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFFD700,
      transparent: true,
      opacity: 0.9
    });
    
    console.log('✨ 备用球体创建完成');
    console.log('💡 提示: 所有视频文件都无法加载，请检查 homepage-videos 文件夹');
    
    initCubeSphere(sphereRadius, null, fallbackMaterial);
  }, [calculateSphereSize, initCubeSphere]);

  // 构建视频URL - 处理完整URL和相对路径
  const buildVideoUrl = useCallback((filePath) => {
    console.log('🎬 处理视频路径:', filePath);
    
    // 如果已经是完整URL（以http://或https://开头），直接返回
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      console.log('✅ 检测到完整URL，直接使用:', filePath);
      return filePath;
    }
    
    // 如果是相对路径，进行传统的路径构建
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    let url;
    if (isDevelopment) {
      // 开发环境：直接使用根路径
      url = `/${filePath}`;
    } else {
      // 生产环境：使用PUBLIC_URL
      const publicUrl = process.env.PUBLIC_URL || '';
      url = `${publicUrl}/${filePath}`;
    }
    
    console.log('🎬 构建的相对路径URL:', url);
    console.log('🌐 环境:', isDevelopment ? '开发环境' : '生产环境');
    return url;
  }, []);

  // 清理单个视频资源
  const cleanupVideo = useCallback((video) => {
    if (!video) return;
    
    try {
      // 移除所有事件监听器
      const events = ['loadedmetadata', 'loadeddata', 'canplaythrough', 'error', 'loadstart', 'canplay'];
      events.forEach(event => {
        video.removeEventListener(event, () => {}, true);
      });
      
      // 停止播放并清空资源
      video.pause();
      video.currentTime = 0;
      video.src = '';
      video.load();
      
      // 从DOM中移除
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
    } catch (error) {
      console.warn('清理视频时出错:', error);
    }
  }, []);

  // 清理当前视频资源
  const cleanupCurrentVideo = useCallback(() => {
    if (videoElementRef.current) {
      console.log('🧹 清理当前主视频资源...');
      cleanupVideo(videoElementRef.current);
      videoElementRef.current = null;
      console.log('✅ 主视频资源清理完成');
    }
  }, [cleanupVideo]);

  // 预加载单个视频
  const preloadVideo = useCallback((filePath) => {
    return new Promise((resolve, reject) => {
      console.log('📥 开始预加载视频:', filePath);
      
      // 检查是否已经在加载或已加载
      const existing = videoPoolRef.current.get(filePath);
      if (existing) {
        if (existing.isReady) {
          console.log('✅ 视频已预加载:', filePath);
          resolve(existing);
          return;
        } else if (existing.isLoading) {
          console.log('⏳ 视频正在加载中:', filePath);
          // 等待现有加载完成
          return;
        }
      }
      
      const videoUrl = buildVideoUrl(filePath);
      const video = document.createElement('video');
      
      // 设置视频属性
      video.muted = true;
      video.autoplay = false;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      video.style.display = 'none';
      
      const videoData = {
        video,
        texture: null,
        isReady: false,
        isLoading: true,
        filePath
      };
      
      videoPoolRef.current.set(filePath, videoData);
      
      const handleLoadedData = () => {
        console.log('✅ 视频预加载完成:', filePath);
        
        try {
          // 创建VideoTexture
          const videoTexture = new THREE.VideoTexture(video);
          videoTexture.minFilter = THREE.LinearFilter;
          videoTexture.magFilter = THREE.LinearFilter;
          videoTexture.format = THREE.RGBFormat;
          videoTexture.generateMipmaps = false;
          videoTexture.flipY = false;
          
          videoData.texture = videoTexture;
          videoData.isReady = true;
          videoData.isLoading = false;
          
          console.log('🎨 VideoTexture创建成功:', filePath);
          resolve(videoData);
          
          // 从失败列表中移除（如果存在）
          failedVideosRef.current.delete(filePath);
          
        } catch (error) {
          console.error('❌ VideoTexture创建失败:', filePath, error);
          handleError(error);
        }
      };
      
      const handleError = (error) => {
        console.error('❌ 视频预加载失败:', filePath, error);
        videoData.isLoading = false;
        videoData.isReady = false;
        
        // 清理失败的视频
        cleanupVideo(video);
        videoPoolRef.current.delete(filePath);
        failedVideosRef.current.add(filePath);
        
        reject(error);
      };
      
      // 绑定事件
      video.addEventListener('loadeddata', handleLoadedData, { once: true });
      video.addEventListener('error', handleError, { once: true });
      
      // 添加到DOM并设置src
      document.body.appendChild(video);
      
      // 延迟设置src
      setTimeout(() => {
        video.src = videoUrl;
      }, 100);
      
      // 超时处理
      setTimeout(() => {
        if (videoData.isLoading && !videoData.isReady) {
          handleError(new Error('预加载超时'));
        }
      }, 8000);
    });
  }, [buildVideoUrl, cleanupVideo]);

  // 批量预加载视频
  const preloadVideos = useCallback(async () => {
    if (isPreloadingRef.current) return;
    isPreloadingRef.current = true;
    
    console.log('🚀 开始批量预加载视频...');
    
    // 过滤出未失败的视频
    const availableVideos = mediaList.filter(video => !failedVideosRef.current.has(video));
    preloadQueueRef.current = [...availableVideos];
    
    const preloadPromises = availableVideos.map(async (filePath, index) => {
      // 错开加载时间，避免同时加载过多视频
      await new Promise(resolve => setTimeout(resolve, index * 200));
      
      try {
        await preloadVideo(filePath);
        console.log(`📥 预加载进度: ${index + 1}/${availableVideos.length}`);
      } catch (error) {
        console.warn(`⚠️ 预加载失败: ${filePath}`, error);
      }
    });
    
    try {
      await Promise.allSettled(preloadPromises);
      console.log('🎉 视频预加载完成！');
      
      const readyVideos = Array.from(videoPoolRef.current.values()).filter(v => v.isReady);
      console.log(`📊 成功预加载 ${readyVideos.length}/${availableVideos.length} 个视频`);
    } catch (error) {
      console.error('预加载过程出错:', error);
    } finally {
      isPreloadingRef.current = false;
    }
     }, [preloadVideo]);

  // 加载并应用贴图
  const loadAndApplyTexture = useCallback((filePath) => {
    console.log('🎬 开始加载贴图:', filePath);
    
    if (!filePath) {
      console.log('没有提供文件路径，创建备用球体');
      createFallbackSphere();
      return;
    }
    
    // 先清理当前视频资源，避免冲突
    cleanupCurrentVideo();
    
    // 构建视频URL
    const videoUrl = buildVideoUrl(filePath);
    
    const extension = filePath.split('.').pop().toLowerCase();
    console.log('文件扩展名:', extension);
    
    if (['mp4', 'webm', 'mov'].includes(extension)) {
      
      console.log('开始创建视频元素:', filePath);
      
      // 简化：直接创建视频，移除预测试
      
      const video = document.createElement('video');
      
      // 设置Three.js VideoTexture兼容的属性
      video.muted = true;
      video.autoplay = false;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'auto'; // Three.js VideoTexture需要完整加载
      video.crossOrigin = 'anonymous'; // 避免CORS问题
      video.style.display = 'none';
      
      // 重要：先不设置src，等事件监听器绑定后再设置
      document.body.appendChild(video);
      videoElementRef.current = video;
      
      console.log('✅ 视频元素已创建，准备绑定事件监听器');
      
      // 延迟创建VideoTexture，确保视频元素完全准备好
      let videoTexture = null;
      
      const handleLoadedData = () => {
        console.log('✅ 视频数据加载完成:', filePath);
        console.log('📊 视频详情:', {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState,
          currentSrc: video.currentSrc
        });
        
        // 重要：只有在视频完全加载后才创建VideoTexture
        try {
          videoTexture = new THREE.VideoTexture(video);
          videoTexture.minFilter = THREE.LinearFilter;
          videoTexture.magFilter = THREE.LinearFilter;
          videoTexture.format = THREE.RGBFormat;
          videoTexture.generateMipmaps = false;
          videoTexture.flipY = false;
          
          console.log('🎨 VideoTexture创建成功');
          
          // 记录成功的视频
          setWorkingVideos(prev => {
            if (!prev.includes(filePath)) {
              console.log('✅ 添加到可用视频列表:', filePath);
              return [...prev, filePath];
            }
            return prev;
          });
          
          // 开始播放视频
          video.play().then(() => {
            console.log('✅ 视频播放成功');
            
            // 视频播放成功后应用贴图
            if (!cubeGroupRef.current) {
              const sphereRadius = calculateSphereSize();
              initCubeSphere(sphereRadius, videoTexture);
            } else {
              updateCubeTextures(videoTexture);
            }
          }).catch((playError) => {
            console.warn('⚠️ 视频播放失败但继续尝试贴图:', playError);
            // 即使播放失败，也尝试应用贴图
            if (!cubeGroupRef.current) {
              const sphereRadius = calculateSphereSize();
              initCubeSphere(sphereRadius, videoTexture);
            } else {
              updateCubeTextures(videoTexture);
            }
          });
          
        } catch (textureError) {
          console.error('❌ VideoTexture创建失败:', textureError);
          handleError(textureError);
          return;
        }
        
        // 清理事件监听器
        cleanupEventListeners();
        clearTimeout(timeoutId);
      };
      
      const cleanupEventListeners = () => {
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('canplaythrough', handleCanPlayThrough);
        video.removeEventListener('error', handleError);
      };
      
      const handleLoadedMetadata = () => {
        console.log('✅ 视频元数据加载完成:', filePath);
        console.log('元数据信息:', {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight
        });
      };
      
      const handleCanPlayThrough = () => {
        console.log('✅ 视频可以流畅播放:', filePath);
        // 如果loadeddata还没触发，这里触发处理
        if (video.readyState >= 2) {
          handleLoadedData();
        }
      };
      
      const handleError = (error) => {
        console.error('❌ 视频加载失败:', filePath);
        console.error('🔗 视频URL:', videoUrl);
        console.error('📊 视频状态:', {
          readyState: video.readyState,
          networkState: video.networkState,
          currentSrc: video.currentSrc,
          src: video.src
        });
        
        if (video.error) {
          console.error('💥 MediaError详情:', {
            code: video.error.code,
            message: video.error.message,
            MEDIA_ERR_ABORTED: video.error.MEDIA_ERR_ABORTED,
            MEDIA_ERR_NETWORK: video.error.MEDIA_ERR_NETWORK,
            MEDIA_ERR_DECODE: video.error.MEDIA_ERR_DECODE,
            MEDIA_ERR_SRC_NOT_SUPPORTED: video.error.MEDIA_ERR_SRC_NOT_SUPPORTED
          });
          
          // 根据错误类型提供建议
                    switch(video.error.code) {
            case 1:
              console.warn('⚠️  错误类型: MEDIA_ERR_ABORTED - 用户中止了视频加载');
              break;
            case 2:
              console.warn('⚠️  错误类型: MEDIA_ERR_NETWORK - 网络错误，检查文件是否存在');
              break;
            case 3:
              console.warn('⚠️  错误类型: MEDIA_ERR_DECODE - 解码错误，视频文件可能损坏');
              break;
            case 4:
              console.warn('⚠️  错误类型: MEDIA_ERR_SRC_NOT_SUPPORTED - 不支持的视频格式或路径错误');
              console.log('💡 可能的解决方案:');
              console.log('   1. 检查视频文件是否存在于 public/homepage-videos/ 目录');
              console.log('   2. 确认视频编码格式（推荐: H.264 + AAC）');
              console.log('   3. 验证文件完整性（可能文件损坏）');
              console.log('   4. 尝试重新编码视频文件');
              console.log('   5. 检查服务器MIME类型配置');
              break;
            default:
              console.warn('⚠️  未知的媒体错误类型:', video.error.code);
              break;
          }
        }
        
        // 只有在严重错误时才将视频加入黑名单
        // 避免因为切换等临时问题而误判
        const shouldBlacklist = video.error && 
          (video.error.code === 3 || video.error.code === 4) && 
          video.networkState === 3;
        
        if (shouldBlacklist) {
          failedVideosRef.current.add(filePath);
          console.log('📝 已将失败视频添加到黑名单:', filePath);
        } else {
          console.log('⚠️ 临时错误，不加入黑名单:', filePath);
        }
        
        cleanupEventListeners();
        clearTimeout(timeoutId);
        
        // 如果只有一个视频且这个视频出问题，不要创建备用球体，而是重试
        if (mediaList.length === 1 && filePath === mediaList[0]) {
          console.log('🔄 唯一视频出现问题，尝试重试而不是黑名单...');
          setTimeout(() => {
            // 重试当前视频，不加入黑名单
            loadAndApplyTexture(filePath);
          }, 1000);
          return;
        }
        
        // 尝试加载下一个可用视频，如果都失败了才创建备用球体
        const remainingVideos = mediaList.filter(video => !failedVideosRef.current.has(video));
        if (remainingVideos.length > 0) {
          console.log(`🔄 尝试下一个视频，剩余 ${remainingVideos.length} 个`);
          const nextVideo = remainingVideos[Math.floor(Math.random() * remainingVideos.length)];
          setTimeout(() => loadAndApplyTexture(nextVideo), 100);
        } else {
          console.log('🎯 所有视频都失败了，创建备用球体...');
          createFallbackSphere();
        }
      };
      
      // 绑定事件监听器
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('canplaythrough', handleCanPlayThrough);
      video.addEventListener('error', handleError);
      
      // 添加超时机制
      const timeoutId = setTimeout(() => {
        console.warn('⏰ 视频加载超时 (5秒):', filePath);
        console.warn('当前视频状态:', {
          readyState: video.readyState,
          networkState: video.networkState,
          src: video.src
        });
        handleError(new Error('视频加载超时'));
      }, 5000); // 5秒超时
      
      // 重要：延迟设置src，确保所有事件监听器都已绑定
      console.log('🎬 准备设置视频源:', videoUrl);
      setTimeout(() => {
        console.log('📡 正在设置video.src...');
        video.src = videoUrl;
        console.log('✅ video.src已设置，开始加载视频...');
      }, 200);
      
      return videoTexture;
    } else {
      // 图片贴图
      const texture = textureLoaderRef.current.load(
        filePath,
        (loadedTexture) => {
          console.log('图片贴图加载成功:', filePath);
          loadedTexture.wrapS = THREE.RepeatWrapping;
          loadedTexture.wrapT = THREE.RepeatWrapping;
          loadedTexture.format = THREE.RGBFormat;
          
          if (!cubeGroupRef.current) {
            const sphereRadius = calculateSphereSize();
            initCubeSphere(sphereRadius, loadedTexture);
          } else {
            updateCubeTextures(loadedTexture);
          }
        },
        (progress) => {
          console.log('贴图加载进度:', progress, filePath);
        },
        (error) => {
          console.error('图片贴图加载失败:', filePath, error);
          // 创建备用球体
          createFallbackSphere();
        }
      );
      
      return texture;
    }
      }, [calculateSphereSize, initCubeSphere, updateCubeTextures, createFallbackSphere, buildVideoUrl, cleanupCurrentVideo]);

  // 即时切换视频（使用预加载池）
  const instantSwitchVideo = useCallback((targetFilePath) => {
    console.log('⚡ 即时切换视频:', targetFilePath);
    
    const videoData = videoPoolRef.current.get(targetFilePath);
    if (!videoData || !videoData.isReady || !videoData.texture) {
      console.warn('⚠️ 目标视频未准备好，使用传统加载方式');
      loadAndApplyTexture(targetFilePath);
      return false;
    }
    
    try {
      // 停止当前视频
      if (videoElementRef.current) {
        videoElementRef.current.pause();
      }
      
      // 设置新的主视频
      videoElementRef.current = videoData.video;
      currentVideoPathRef.current = targetFilePath;
      
      // 开始播放新视频
      videoData.video.currentTime = 0;
      videoData.video.play().catch(error => {
        console.warn('视频播放失败:', error);
      });
      
      // 立即更新球体贴图
      if (!cubeGroupRef.current) {
        const sphereRadius = calculateSphereSize();
        initCubeSphere(sphereRadius, videoData.texture);
      } else {
        updateCubeTextures(videoData.texture);
      }
      
      console.log('⚡ 即时切换完成!');
      return true;
    } catch (error) {
      console.error('即时切换失败:', error);
      return false;
    }
  }, [loadAndApplyTexture, calculateSphereSize, initCubeSphere, updateCubeTextures]);

  // 切换贴图（优先使用预加载，无缝切换）
  const switchTexture = useCallback(() => {
    if (mediaList.length === 0) return;
    
    const currentTime = Date.now();
    const timeSinceLastSwitch = currentTime - lastSwitchTimeRef.current;
    
    // 防抖：避免300ms内重复切换（缩短间隔以支持快速切换）
    if (timeSinceLastSwitch < 300 || isLoadingTextureRef.current) {
      console.log('切换过于频繁，忽略此次请求');
      return;
    }
    
    // 获取所有已准备好的视频
    const readyVideos = Array.from(videoPoolRef.current.entries())
      .filter(([, videoData]) => videoData.isReady)
      .map(([filePath]) => filePath);
    
    console.log('🎬 可即时切换的视频:', readyVideos);
    
    if (readyVideos.length === 0) {
      console.log('⚠️ 没有预加载完成的视频，使用传统切换方式');
      // 降级到传统切换方式
      const availableVideos = mediaList.filter(video => !failedVideosRef.current.has(video));
      if (availableVideos.length > 0) {
        const selectedVideo = availableVideos[Math.floor(Math.random() * availableVideos.length)];
        loadAndApplyTexture(selectedVideo);
      } else {
        createFallbackSphere();
      }
      return;
    }
    
    lastSwitchTimeRef.current = currentTime;
    
    // 选择下一个视频
    let selectedVideo;
    if (readyVideos.length === 1) {
      // 只有一个视频时，重新播放当前视频
      selectedVideo = readyVideos[0];
      console.log('🔄 重新播放唯一视频:', selectedVideo);
    } else {
      // 多个视频时，选择不同的视频
      const currentVideo = currentVideoPathRef.current;
      const otherVideos = readyVideos.filter(video => video !== currentVideo);
      selectedVideo = otherVideos.length > 0 ? 
        otherVideos[Math.floor(Math.random() * otherVideos.length)] :
        readyVideos[Math.floor(Math.random() * readyVideos.length)];
    }
    
    console.log(`⚡ 即时切换到: ${selectedVideo}`);
    setCurrentMediaIndex(mediaList.indexOf(selectedVideo));
    
    // 执行即时切换
    const success = instantSwitchVideo(selectedVideo);
    if (!success) {
      console.warn('即时切换失败，使用传统方式');
      loadAndApplyTexture(selectedVideo);
    }
     }, [instantSwitchVideo, loadAndApplyTexture, createFallbackSphere]);

  // 鼠标事件处理
  const handleMouseDown = useCallback((event) => {
    mouseRef.current.isDown = true;
    mouseRef.current.x = event.clientX;
    mouseRef.current.y = event.clientY;
  }, []);

  const handleMouseMove = useCallback((event) => {
    // 更新鼠标位置用于射线检测
    if (!rendererRef.current) return;
    
    // 性能优化：限制检测频率到约30fps
    const now = performance.now();
    if (now - mouseSpeedRef.current.lastUpdateTime < 33) return;
    mouseSpeedRef.current.lastUpdateTime = now;
    
    // 计算鼠标速度
    const mouseSpeed = calculateMouseSpeed(event.clientX, event.clientY);
    
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    mousePosRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mousePosRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // 如果在拖拽，处理球体旋转
    if (mouseRef.current.isDown && cubeGroupRef.current) {
      const deltaX = event.clientX - mouseRef.current.x;
      const deltaY = event.clientY - mouseRef.current.y;
      
      rotationRef.current.y += deltaX * 0.01;
      rotationRef.current.x += deltaY * 0.01;
      
      cubeGroupRef.current.rotation.y = rotationRef.current.y;
      cubeGroupRef.current.rotation.x = rotationRef.current.x;
      cubeGroupRef.current.rotation.z = rotationRef.current.z;
      
      mouseRef.current.x = event.clientX;
      mouseRef.current.y = event.clientY;
    }
    
    // 无论是否在拖拽，都进行鼠标悬停检测（但拖拽时不翻转）
    if (sphereHelperRef.current && cameraRef.current) {
      raycasterRef.current.setFromCamera(mousePosRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObject(sphereHelperRef.current);
      
      if (intersects.length > 0 && !mouseRef.current.isDown) {
        // 只在非拖拽状态下翻转立方体，传入鼠标速度
        handleCubeFlip(intersects[0].point, mouseSpeed);
      } else if (!mouseRef.current.isDown) {
        // 鼠标不在球体上且没有拖拽时，启动拖尾效果
        resetTrailStates();
      }
    }
  }, [handleCubeFlip, resetTrailStates, calculateMouseSpeed]);

  const handleMouseUp = useCallback(() => {
    mouseRef.current.isDown = false;
  }, []);

  // 点击切换贴图
  const handleClick = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('🖱️ 点击切换视频');
    const readyVideos = Array.from(videoPoolRef.current.values()).filter(v => v.isReady);
    console.log(`📊 状态: ${readyVideos.length}/${mediaList.length} 个视频已预加载`);
    
    // 确保有可用的视频
    const availableVideos = mediaList.filter(video => !failedVideosRef.current.has(video));
    
    if (availableVideos.length === 0) {
      console.log('⚠️ 没有可用视频，重置黑名单并重试...');
      failedVideosRef.current.clear();
    }
    
    switchTexture();
  }, [switchTexture]);

  // 窗口大小调整
  const handleResize = useCallback(() => {
    if (!cameraRef.current || !rendererRef.current) return;
    
    cameraRef.current.aspect = window.innerWidth / window.innerHeight;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    
    // 如果立方体球体已经存在，重新创建以适应新尺寸
    if (cubeGroupRef.current) {
      const newRadius = calculateSphereSize();
      const currentTexture = videoElementRef.current ? 
        new THREE.VideoTexture(videoElementRef.current) : null;
      
      if (currentTexture) {
        initCubeSphere(newRadius, currentTexture);
      }
    }
  }, [calculateSphereSize, initCubeSphere]);

  // 动画循环
  const animate = useCallback((currentTime = performance.now()) => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    
    // 性能优化：动态调整帧率
    const deltaTime = currentTime - lastFrameTimeRef.current;
    const targetFPS = mouseRef.current.isDown ? 60 : 30; // 拖拽时60fps，否则30fps
    const frameInterval = 1000 / targetFPS;
    
    if (deltaTime < frameInterval) {
      animationIdRef.current = requestAnimationFrame(animate);
      return;
    }
    
    lastFrameTimeRef.current = currentTime;
    const actualDeltaTime = Math.min(deltaTime / 1000, 0.033); // 限制最大帧时间
    
    // 自动旋转（除非正在拖拽）
    if (!mouseRef.current.isDown && cubeGroupRef.current) {
      cubeGroupRef.current.rotation.x += autoRotationRef.current.x;
      cubeGroupRef.current.rotation.y += autoRotationRef.current.y;
      cubeGroupRef.current.rotation.z += autoRotationRef.current.z;
      
      rotationRef.current.x = cubeGroupRef.current.rotation.x;
      rotationRef.current.y = cubeGroupRef.current.rotation.y;
      rotationRef.current.z = cubeGroupRef.current.rotation.z;
    }
    
    // 更新立方体翻转动画
    updateCubeAnimations(actualDeltaTime);
    
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    animationIdRef.current = requestAnimationFrame(animate);
  }, [updateCubeAnimations]);

  const initializeVideos = useCallback(() => {
    console.log('🎬 初始化视频列表...');
    console.log('📹 媒体文件数量:', mediaList.length);
    
    setWorkingVideos([...mediaList]);
    return mediaList;
  }, []);

  useEffect(() => {
    console.log('🚀 RotatingSphere 组件初始化...');
    console.log(`📹 发现 ${mediaList.length} 个视频文件`);
    
    // 在useEffect开始就保存ref值，避免在cleanup函数中直接引用ref
    const savedVideoPool = videoPoolRef.current;
    const savedCubesData = cubesDataRef.current;

    
    // 初始化Three.js
    const { scene, renderer, mountElement } = initThreeJS();
    
    if (!renderer || !mountElement) {
      console.error('Three.js初始化失败');
      return;
    }
    
    // 添加事件监听器
    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);
    
    // 开始动画
    animate();
    
    // 强制创建备用球体作为后备
    setTimeout(() => {
      if (!cubeGroupRef.current) {
        console.log('5秒后仍无球体，强制创建备用球体');
        createFallbackSphere();
      }
    }, 5000);
    
    // 初始化视频列表
    const availableVideos = initializeVideos();
    if (availableVideos.length > 0) {
      console.log('🚀 启动视频预加载系统...');
      
      // 立即开始预加载所有视频
      preloadVideos();
      
      // 先用传统方式加载第一个视频，同时预加载其他视频
      const randomIndex = Math.floor(Math.random() * availableVideos.length);
      const selectedVideo = availableVideos[randomIndex];
      setCurrentMediaIndex(randomIndex);
      currentVideoPathRef.current = selectedVideo;
      console.log(`🎯 选择初始视频 (${randomIndex + 1}/${availableVideos.length}):`, selectedVideo);
      
      setTimeout(() => {
        loadAndApplyTexture(selectedVideo);
      }, 100);
    } else {
      console.log('❌ 媒体列表为空，创建备用球体');
      setTimeout(() => {
        createFallbackSphere();
      }, 100);
    }
    
    // 清理函数
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (canvas) {
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('click', handleClick);
      }
      window.removeEventListener('resize', handleResize);
      
      if (mountElement && renderer.domElement && mountElement.contains(renderer.domElement)) {
        mountElement.removeChild(renderer.domElement);
      }
      
      if (videoElementRef.current) {
        videoElementRef.current.pause();
        videoElementRef.current.remove();
      }
      
      // 清理视频预加载池
      console.log('🧹 清理视频预加载池...');
      // 使用useEffect开始时保存的ref值，避免ESLint警告
      if (savedVideoPool) {
        for (const [, videoData] of savedVideoPool) {
          if (videoData.video) {
            try {
              // 清理单个视频 - 内联清理逻辑避免依赖外部函数
              const video = videoData.video;
              const events = ['loadedmetadata', 'loadeddata', 'canplaythrough', 'error', 'loadstart', 'canplay'];
              events.forEach(event => {
                video.removeEventListener(event, () => {}, true);
              });
              video.pause();
              video.currentTime = 0;
              video.src = '';
              video.load();
              if (video.parentNode) {
                video.parentNode.removeChild(video);
              }
            } catch (error) {
              console.warn('清理视频时出错:', error);
            }
          }
          if (videoData.texture) {
            videoData.texture.dispose();
          }
        }
        savedVideoPool.clear();
      }
      
      if (scene) {
        scene.clear();
      }
      if (renderer) {
        renderer.dispose();
      }
      
      // 清理立方体相关资源
      savedCubesData.forEach((cubeData) => {
        if (cubeData.mesh.geometry) {
          cubeData.mesh.geometry.dispose();
        }
        if (cubeData.mesh.material) {
          if (Array.isArray(cubeData.mesh.material)) {
            cubeData.mesh.material.forEach(mat => mat.dispose());
          } else {
            cubeData.mesh.material.dispose();
          }
        }
      });
      // 注意：这里仍然需要清空当前的ref，因为组件可能还会继续使用
      cubesDataRef.current = [];
    };
  }, [animate, handleClick, handleMouseDown, handleMouseMove, handleMouseUp, handleResize, initThreeJS, loadAndApplyTexture, createFallbackSphere, initializeVideos, buildVideoUrl, preloadVideos]);

  // 当媒体文件加载完成且Three.js初始化完成时，确保贴图正确加载
  useEffect(() => {
    if (mediaList.length > 0 && isInitialized && currentMediaIndex >= 0) {
      console.log('Three.js已初始化，加载贴图:', mediaList[currentMediaIndex]);
      
      const filePath = mediaList[currentMediaIndex];
      loadAndApplyTexture(filePath);
    }
  }, [currentMediaIndex, isInitialized, loadAndApplyTexture]);

  return (
    <>
      {/* Three.js 立方体球体容器 */}
      <div 
        ref={mountRef} 
        style={{ 
          width: '100vw', 
          height: '100vh', 
          position: 'fixed',
          top: 0,
          left: 0,
          cursor: mouseRef.current?.isDown ? 'grabbing' : 'grab',
          zIndex: 1
        }} 
      />
    </>
  );
};

export default RotatingSphere; 