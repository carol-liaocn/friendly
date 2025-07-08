import React, { useState, useMemo } from 'react';
import ProjectModal from './ProjectModal';
import LazyMedia from './LazyMedia';
import LoadingSpinner from './LoadingSpinner';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import inspirationData from '../data/inspiration_data.json';

const InspirationPage = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');

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
  } = useInfiniteScroll(filteredProjects, 6); // 每次加载6个项目，优化首屏性能

  // 当筛选条件改变时重置
  React.useEffect(() => {
    reset();
  }, [activeFilter, reset]);

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

  // inspiration页面专注于快速加载cover，不需要复杂的预览图逻辑

  return (
    <div className="ml-80 min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="flex justify-between items-start px-8 py-8">
        <h2 className="text-2xl font-medium text-light-gray uppercase">inspiration</h2>
        <div className="flex space-x-4 text-sm font-medium">
          {filterOptions.map((option) => (
            <button
              key={option}
              onClick={() => setActiveFilter(option)}
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
            <div className="grid grid-cols-3 gap-6">
              {displayedProjects.map((project, index) => (
                <div
                  key={project.id}
                  ref={index === displayedProjects.length - 1 ? lastItemRef : null}
                  className="cursor-pointer group"
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
              ))}
            </div>
            
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