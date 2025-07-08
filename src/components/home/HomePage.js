import React, { useState, useEffect, useRef } from 'react';
import RotatingSphere from './RotatingSphere';
import LoadingSpinner from '../LoadingSpinner';
import './HomePage.css';

const HomePage = ({ activeTab, setActiveTab }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);
  const sphereContainerRef = useRef(null);

  // 减少首页加载时间，提升用户体验
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800); // 0.8秒后隐藏loading，更快响应

    return () => clearTimeout(timer);
  }, []);

  // 滚轮事件监听 - 只在球体容器内监听，避免干扰球体点击
  useEffect(() => {
    let scrollTimeout;
    // 在useEffect开始时保存ref值，避免cleanup函数中直接引用ref
    const savedSphereContainer = sphereContainerRef.current;

    const handleWheel = (e) => {
      // 防止滚动过于频繁触发
      if (isScrolling) return;

      // 只在向下滚动时触发
      if (e.deltaY > 0) {
        console.log('🎢 检测到向下滚动，切换到inspiration页面');
        setIsScrolling(true);
        
        // 延迟切换页面，让用户感受到过渡
        setTimeout(() => {
          setActiveTab('inspiration');
        }, 200);

        // 防止短时间内重复触发
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          setIsScrolling(false);
        }, 1000);
      }
    };

    // 确保页面已加载完成并且球体容器存在
    if (!isLoading && savedSphereContainer) {
      // 只在球体容器上监听滚轮事件，避免全局监听
      savedSphereContainer.addEventListener('wheel', handleWheel, { passive: true });
      console.log('🎯 滚轮事件监听器已激活（球体容器）');
    }

    return () => {
      if (savedSphereContainer) {
        savedSphereContainer.removeEventListener('wheel', handleWheel);
      }
      clearTimeout(scrollTimeout);
      console.log('🧹 滚轮事件监听器已清理');
    };
  }, [isLoading, isScrolling, setActiveTab]);

  const navItems = [
    { id: 'inspiration', label: 'inspiration' },
    { id: 'artist', label: 'artist' },
    { id: 'team project', label: 'team project' }
  ];

  return (
    <div className="homepage">
      {/* Loading 覆盖层 */}
      {isLoading && (
        <LoadingSpinner 
          fullScreen={true}
          size="xl"
        />
      )}

      {/* 滚动提示 - 仅在非loading状态显示 */}
      {!isLoading && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-20 opacity-60 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="flex flex-col items-center text-light-gray">
            <span className="text-sm mb-2">向下滚动探索更多 | 点击球体切换视频</span>
            <div className="animate-bounce">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 5v14M19 12l-7 7-7-7"/>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* 左侧导航栏 - 与标准Sidebar完全一致 */}
      <div className={`fixed left-0 top-0 h-full w-80 z-10 transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        {/* Logo区域 */}
        <div className="px-8 py-8">
          <div className="flex items-center">
            <h1 className="text-light-gray text-2xl font-bold whitespace-nowrap">
              设计友好报
            </h1>
            <span className="ml-4 text-2xl">🔎</span>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="px-8 space-y-1.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="block text-left text-2xl font-medium uppercase tracking-wide transition-colors duration-200 whitespace-nowrap text-light-gray opacity-60 hover:opacity-80"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 右上角REDesign标志 */}
      <div className={`redesign-logo transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <img 
          src="./images/redesign-logo.svg"
          alt="REDesign" 
          className="h-full w-auto"
          onError={(e) => {
            e.target.style.display = 'none';
            console.log('REDesign logo loading failed');
          }}
        />
      </div>

      {/* 中央球体区域 - 全屏居中，确保可以接收点击和滚轮事件 */}
      <div 
        ref={sphereContainerRef}
        className={`sphere-container transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 1,
          pointerEvents: 'auto' // 确保可以接收事件
        }}
      >
        <RotatingSphere />
      </div>
    </div>
  );
};

export default HomePage; 