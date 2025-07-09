import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import ProjectModal from './ProjectModal';
import LazyMedia from './LazyMedia';
import LoadingSpinner from './LoadingSpinner';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import inspirationData from '../data/inspiration_data.json';
import './InspirationPage.css';

const InspirationPage = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [visibleRows, setVisibleRows] = useState(new Set()); // 记录已经可见的行
  const observerRef = useRef(null);
  const rowRefs = useRef({});

  // 处理标签字符串，转换为数组
  const processedProjects = useMemo(() => 
    inspirationData.map(project => ({
      ...project,
      // 将tags字符串分割为数组，并去除空格
      tags: project.tags.split(',').map(tag => tag.trim())
    })), []);

  // 筛选项目
  const filteredProjects = useMemo(() => 
    activeFilter === 'All' 
      ? processedProjects 
      : processedProjects.filter(project => 
          project.tags.some(tag => tag.toLowerCase() === activeFilter.toLowerCase())
        ), [activeFilter, processedProjects]);

  // 使用无限滚动Hook - 优化首屏加载
  const {
    displayedItems: displayedProjects,
    isLoading,
    hasMore,
    lastItemRef,
    reset
  } = useInfiniteScroll(filteredProjects, 12); // 增加到12个项目，这样有4行

  // 当筛选条件改变时重置
  useEffect(() => {
    reset();
    setVisibleRows(new Set()); // 重置可见行
    
    // 如果选择了非"All"筛选，立即显示所有行
    if (activeFilter !== 'All') {
      // 延迟一帧确保DOM更新后再设置可见行
      requestAnimationFrame(() => {
        const totalRows = Math.ceil(filteredProjects.length / 3);
        const allRows = new Set();
        for (let i = 0; i < totalRows; i++) {
          allRows.add(i);
        }
        setVisibleRows(allRows);
        console.log(`🎯 非All筛选(${activeFilter})：立即显示所有 ${totalRows} 行`);
      });
    } else {
      // All筛选时，延迟启动第一排动画
      setTimeout(() => {
        if (displayedProjects.length > 0) {
          setVisibleRows(prev => {
            const newVisible = new Set(prev);
            newVisible.add(0); // 立即显示第一排
            console.log('🎬 筛选器点击 - 第一排立即开始动画');
            return newVisible;
          });
        }
      }, 100); // 100ms延迟，让重置生效后再启动动画
    }
  }, [activeFilter, reset, filteredProjects.length]);

  // 当displayedProjects改变时，确保第一排动画触发
  useEffect(() => {
    if (displayedProjects.length > 0) {
      setTimeout(() => {
        setVisibleRows(prev => {
          if (!prev.has(0)) {
            const newVisible = new Set(prev);
            newVisible.add(0); // 确保第一排始终可见
            console.log('🎬 内容加载完成 - 第一排开始动画');
            return newVisible;
          }
          return prev;
        });
      }, 50);
    }
  }, [displayedProjects.length]);

  // 设置Intersection Observer - 只在"All"筛选时启用
  useEffect(() => {
    // 清理之前的observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    // 只在"All"筛选时创建observer
    if (activeFilter === 'All') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const rowIndex = parseInt(entry.target.dataset.rowIndex, 10);
              // 跳过第一排，因为第一排通过筛选器直接触发
              if (rowIndex > 0) {
                setVisibleRows(prev => {
                  const newVisible = new Set(prev);
                  newVisible.add(rowIndex);
                  console.log(`🎬 第${rowIndex + 1}行滚动进入视图，开始动画`);
                  return newVisible;
                });
              }
            }
          });
        },
        {
          threshold: 0.3, // 当30%的行可见时触发
          rootMargin: '0px 0px -50px 0px' // 稍微提前触发
        }
      );

      observerRef.current = observer;
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [activeFilter]);

  // 观察行元素 - 只在"All"筛选时观察
  const setRowRef = useCallback((element, rowIndex) => {
    if (element) {
      element.dataset.rowIndex = rowIndex;
      rowRefs.current[rowIndex] = element;
      
      // 只在"All"筛选且observer存在时观察元素
      if (activeFilter === 'All' && observerRef.current) {
        observerRef.current.observe(element);
      }
    }
  }, [activeFilter]);

  // 筛选器点击处理函数
  const handleFilterClick = (option) => {
    console.log(`🎯 点击筛选器: ${option}`);
    setActiveFilter(option);
  };

  const filterOptions = ['All', 'Branding', 'Digital', 'Motion', 'Graphic', 'Typography', 'Generative Art', 'AIGC'];

  const getTagColor = (tag) => {
    const colors = {
      'Branding': 'bg-design-green',
      'Typography': 'bg-design-yellow',
      'Generative Art': 'bg-design-purple',
      'Motion': 'bg-orange-500',
      'Digital': 'bg-cyan-500',
      'Graphic': 'bg-pink-500',
      'AIGC': 'bg-red-500'
    };
    return colors[tag] || 'bg-gray-500';
  };

  // 不需要手动编码URL，浏览器会自动处理
  const getEncodedPath = (path) => {
    return path;
  };

  // 获取项目所在的行
  const getRowIndex = (index) => Math.floor(index / 3);

  // 获取项目在行内的位置（0, 1, 2）
  const getPositionInRow = (index) => index % 3;

  // 获取动画类名
  const getAnimationClass = (index) => {
    const rowIndex = getRowIndex(index);
    const positionInRow = getPositionInRow(index);
    const isRowVisible = visibleRows.has(rowIndex);
    
    return isRowVisible 
      ? `inspiration-item-enter inspiration-item-enter-active position-${positionInRow}` 
      : `inspiration-item-enter position-${positionInRow}`;
  };

  // 将项目按行分组
  const projectRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < displayedProjects.length; i += 3) {
      rows.push(displayedProjects.slice(i, i + 3));
    }
    return rows;
  }, [displayedProjects]);

  return (
    <div className="ml-80 min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="flex justify-between items-start px-8 py-8">
        <h2 className="text-2xl font-medium text-light-gray uppercase">inspiration</h2>
        <div className="flex space-x-4 text-sm font-medium">
          {filterOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleFilterClick(option)}
              className={`transition-colors duration-200 hover:opacity-80 ${
                activeFilter === option 
                  ? 'text-[#E2E2E2]' 
                  : 'text-[#787878]'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="px-8 pb-8">
        {displayedProjects.length > 0 ? (
          <>
            {projectRows.map((row, rowIndex) => (
              <div
                key={`row-${rowIndex}-${activeFilter}`}
                ref={(el) => setRowRef(el, rowIndex)}
                className="grid grid-cols-3 gap-6 mb-6"
              >
                {row.map((project, positionInRow) => {
                  const projectIndex = rowIndex * 3 + positionInRow;
                  return (
                    <div
                      key={project.id}
                      ref={projectIndex === displayedProjects.length - 1 ? lastItemRef : null}
                      className={`cursor-pointer group ${getAnimationClass(projectIndex)}`}
                      onClick={() => setSelectedProject(project)}
                    >
                      <div className="aspect-[4/5] bg-design-gray rounded-xl overflow-hidden mb-6 group-hover:opacity-80 transition-opacity">
                        <LazyMedia
                          src={getEncodedPath(project.cover)}
                          alt={project.title}
                          className="w-full h-full object-cover"
                          threshold={0.2} // 提前20%开始加载
                          placeholder={
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                              <div className="spinner">
                                <div className="bounce1"></div>
                                <div className="bounce2"></div>
                                <div className="bounce3"></div>
                              </div>
                            </div>
                          }
                        />
                      </div>
                      <h3 className="text-light-gray text-3xl font-medium mb-2.5 group-hover:opacity-80 transition-opacity uppercase">
                        {project.title}
                      </h3>
                      <div className="flex flex-wrap gap-1.5 mb-8">
                        {project.tags.map((tag, index) => (
                          <span
                            key={index}
                            className={`px-2 py-0.5 text-sm font-medium text-dark-bg rounded-md leading-tight ${getTagColor(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            
            {/* 加载更多指示器 */}
            {isLoading && (
              <div className="mt-8">
                <LoadingSpinner 
                  size="md" 
                  className="py-8"
                />
              </div>
            )}
            
            {/* 底部状态 */}
            {!hasMore && displayedProjects.length > 0 && (
              <div className="text-center py-8">
                <p className="text-[#787878] text-lg">
                  已显示全部 {displayedProjects.length} 个案例
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-[#787878] text-lg">没有找到符合条件的案例</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
};

export default InspirationPage; 