import React, { useState, useRef, useEffect } from 'react';
import { getImageUrl } from '../config/supabase';

const LazyMedia = ({ 
  src, 
  alt, 
  className = "w-full h-full object-cover",
  type = 'auto',
  placeholder = null,
  onLoad = () => {},
  onError = () => {},
  threshold = 0.1,
  previewSrc = null,
  showVideoControls = false
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(null);
  const mediaRef = useRef(null);
  const observerRef = useRef(null);

  // 判断文件是否为视频
  const isVideo = (filePath) => {
    if (type === 'video') return true;
    if (type === 'image') return false;
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi'];
    return videoExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
  };

  // 重试加载机制
  const retryLoad = () => {
    if (retryCount < 2) { // 最多重试2次
      console.log(`🔄 重试加载媒体 (${retryCount + 1}/2): ${src}`);
      setRetryCount(prev => prev + 1);
      setHasError(false);
      setIsLoading(true);
      
      // 延迟重试，避免频繁请求
      setTimeout(() => {
        setCurrentSrc(getImageUrl(src) + `?retry=${retryCount + 1}`);
      }, 1000 * (retryCount + 1));
    } else {
      console.error(`❌ 媒体加载最终失败: ${src}`);
      setHasError(true);
      setIsLoading(false);
    }
  };

  // 智能生成预览图片URL（如果没有提供previewSrc）
  // eslint-disable-next-line no-unused-vars
  const getPreviewUrl = (videoUrl) => {
    if (previewSrc) return previewSrc;
    
    // 尝试将视频文件名转换为可能的静态预览图片
    const commonPatterns = [
      { from: '.mp4', to: '.jpg' },
      { from: '.mp4', to: '.png' },
      { from: '.webm', to: '.jpg' },
      { from: '.mov', to: '.jpg' },
      // eslint-disable-next-line no-useless-escape
      { from: /\/[^\/]+\.mp4$/, to: '/cover.jpg' },
      // eslint-disable-next-line no-useless-escape
      { from: /\/[^\/]+\.mp4$/, to: '/preview.jpg' }
    ];
    
    for (const pattern of commonPatterns) {
      if (typeof pattern.from === 'string') {
        if (videoUrl.includes(pattern.from)) {
          return videoUrl.replace(pattern.from, pattern.to);
        }
      } else if (pattern.from instanceof RegExp) {
        if (pattern.from.test(videoUrl)) {
          return videoUrl.replace(pattern.from, pattern.to);
        }
      }
    }
    
    return null;
  };

  // 设置Intersection Observer - 增强懒加载策略
  useEffect(() => {
    const target = mediaRef.current;
    if (!target) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isInView) {
          console.log(`📺 开始加载媒体: ${src}`);
          const fullSrc = getImageUrl(src);
          console.log(`📺 构建的完整URL: ${fullSrc}`);
          setIsInView(true);
          setIsLoading(true);
          setCurrentSrc(fullSrc);
        }
      },
      {
        threshold: threshold || 0.1,
        // 根据网络速度和设备性能调整预加载范围
        rootMargin: window.navigator.connection?.effectiveType === '4g' ? '200px' : '100px'
      }
    );

    observerRef.current.observe(target);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isInView, threshold, src]);

  // 处理预览图片加载完成
  const handlePreviewLoad = () => {
    console.log('✅ 预览图片加载成功');
    setPreviewLoaded(true);
    setIsLoading(false);
    setHasError(false);
    setRetryCount(0);
    onLoad();
  };

  // 处理视频加载完成
  const handleVideoLoad = () => {
    console.log('✅ 视频加载成功');
    setVideoLoaded(true);
    setIsLoading(false);
    setHasError(false);
    setRetryCount(0);
    onLoad();
    
    // 视频加载成功后，延迟1秒再隐藏预览图片，实现平滑过渡
    setTimeout(() => {
      setShowPreview(false);
    }, 1000);
  };

  // 处理媒体加载完成（非视频）
  const handleLoad = () => {
    console.log('✅ 媒体加载成功:', src);
    setIsLoaded(true);
    setIsLoading(false);
    setHasError(false);
    setRetryCount(0);
    onLoad();
  };

  // 处理媒体加载错误
  const handleError = (error) => {
    console.error(`❌ 媒体加载失败: ${src}`, error);
    console.error(`❌ 当前URL: ${currentSrc}`);
    onError(error);
    
    // 启动重试机制
    retryLoad();
  };

  // 渲染占位符
  const renderPlaceholder = () => {
    if (placeholder) {
      return placeholder;
    }
    
    return (
      <div className={`${className} bg-gray-800 flex items-center justify-center`}>
        {isLoading ? (
          <div className="text-center">
            <div className="spinner">
              <div className="bounce1"></div>
              <div className="bounce2"></div>
              <div className="bounce3"></div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              正在加载{retryCount > 0 ? ` (重试 ${retryCount}/2)` : ''}...
            </div>
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center space-y-2 text-center p-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-gray-500">图片加载失败</span>
            <button 
              onClick={retryLoad}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              点击重试
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 bg-gray-700 rounded-lg"></div>
          </div>
        )}
      </div>
    );
  };

  // 渲染媒体内容
  const renderMedia = () => {
    if (!isInView || !currentSrc) {
      console.log('🚫 媒体渲染跳过:', { isInView, currentSrc: !!currentSrc, src });
      return null;
    }

    const isVideoFile = isVideo(src);
    const fullPreviewSrc = previewSrc ? getImageUrl(previewSrc) : null;
    
    console.log('🎬 渲染媒体:', { src, isVideoFile, currentSrc, previewSrc: !!previewSrc });

    if (isVideoFile) {
      // 如果提供了预览图片，使用渐进式加载
      if (previewSrc) {
        return (
          <div className="relative w-full h-full">
            {/* 预览图片层 */}
            {showPreview && (
              <img
                src={fullPreviewSrc}
                alt={alt}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                  previewLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={handlePreviewLoad}
                onError={(e) => {
                  console.log('⚠️ 预览图片加载失败，直接加载视频');
                  setShowPreview(false);
                }}
                style={{ 
                  display: previewLoaded ? 'block' : 'none',
                  zIndex: showPreview ? 2 : 1
                }}
              />
            )}
            
            {/* 视频层 */}
            <video
              src={currentSrc}
              autoPlay
              loop
              muted
              controls={showVideoControls}
              className={`${className} transition-opacity duration-1000 ${
                videoLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoadedData={handleVideoLoad}
              onError={handleError}
              style={{ 
                display: videoLoaded ? 'block' : 'none',
                zIndex: showPreview ? 1 : 2
              }}
            />
          </div>
        );
      } else {
        // 简化模式：直接加载视频，用于inspiration页面的cover
        return (
          <video
            src={currentSrc}
            autoPlay
            loop
            muted
            playsInline
            controls={showVideoControls}
            className={`absolute inset-0 w-full h-full object-cover ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
            onLoadedData={handleLoad}
            onError={handleError}
            preload="metadata" // 只预加载元数据，提升性能
          />
        );
      }
    } else {
      // 静态图片
      return (
        <img
          src={currentSrc}
          alt={alt}
          className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          onLoad={handleLoad}
          onError={handleError}
          style={{ display: isLoaded ? 'block' : 'none' }}
        />
      );
    }
  };

  return (
    <div ref={mediaRef} className={`relative ${className}`}>
      {/* 显示占位符的条件：正在加载或没有任何内容加载完成时 */}
      {(isInView && isLoading && !isLoaded && !previewLoaded && !videoLoaded) || (!isInView) ? renderPlaceholder() : null}
      {/* 媒体内容 */}
      {isInView && renderMedia()}
    </div>
  );
};

export default LazyMedia; 