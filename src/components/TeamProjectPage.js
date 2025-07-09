import React, { useMemo } from 'react';
import LazyMedia from './LazyMedia';
import LoadingSpinner from './LoadingSpinner';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import teamProjectData from '../data/team_project_data.json';

const TeamProjectPage = () => {
  // 过滤掉有问题的项目数据
  const projects = useMemo(() => 
    teamProjectData.filter(project => 
      project.title && project.title !== 'NaN' && project.title.toString() !== 'null'
    ), []);

  // 使用无限滚动Hook
  const {
    displayedItems: displayedProjects,
    isLoading,
    hasMore,
    lastItemRef
  } = useInfiniteScroll(projects, 4); // 每次加载4个项目

  const getCategoryColor = (category) => {
    const colors = {
      'Branding': 'bg-design-green',
      'Digital': 'bg-cyan-500',
      'Motion': 'bg-orange-500',
      'Graphic': 'bg-pink-500',
      'Typography': 'bg-design-yellow',
      'Generative Art': 'bg-design-purple',
      'AIGC': 'bg-red-500'
    };
    return colors[category] || 'bg-design-gray';
  };

  return (
    <div className="ml-80 min-h-screen bg-dark-bg">
      {/* Page Header */}
      <div className="flex justify-between items-start px-8 py-8">
        <h2 className="text-2xl font-medium text-light-gray uppercase">team project</h2>
      </div>

      {/* First Divider Line - aligned with TEAM PROJECT text */}
      <div className="px-8">
        <div className="w-full" style={{ height: '0.2px', backgroundColor: '#E2E2E2' }}></div>
      </div>
      <div className="mb-4"></div>

      {/* Projects Grid */}
      <div className="px-8 space-y-16">
        {displayedProjects.map((project, index) => (
          <div 
            key={project.id}
            ref={index === displayedProjects.length - 1 ? lastItemRef : null}
          >
            {/* Divider Line above each project (except first) */}
            {index > 0 && (
              <>
                <div className="w-full" style={{ height: '0.2px', backgroundColor: '#E2E2E2' }}></div>
                <div className="mb-4"></div>
              </>
            )}
            
            {/* Project Row - 4 Column Layout */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              
              {/* Column 1: Project Information */}
              <div className="flex flex-col h-full">
                <div className="space-y-1.5">
                  {/* Project Title */}
                  <h3 className="text-2xl font-medium text-light-gray leading-tight capitalize">
                    {project.title}
                  </h3>
                  
                  {/* Project Author */}
                  <p className="text-lg font-medium text-medium-gray capitalize">
                    by {project.author}
                  </p>
                  
                  {/* Category Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {project.categories.map((category, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-0.5 text-sm font-medium text-dark-bg rounded-md leading-tight ${getCategoryColor(category)}`}
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Columns 2-4: Works Grid (3 columns of works) - 3:4 Portrait Ratio */}
              <div className="col-span-3 grid grid-cols-3 gap-4">
                {project.works && project.works.length > 0 ? (
                  project.works.slice(0, 3).map((work, workIndex) => (
                    <div
                      key={work.id}
                      className="aspect-[3/4] bg-design-gray overflow-hidden"
                    >
                      <LazyMedia
                        src={work.image}
                        alt={`${project.title} work ${work.id}`}
                        className="w-full h-full object-cover"
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
                  ))
                ) : (
                  // 如果没有作品，显示占位符
                  Array.from({ length: 3 }, (_, index) => (
                    <div
                      key={`placeholder-${index}`}
                      className="aspect-[3/4] bg-design-gray"
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 加载更多指示器 */}
      {isLoading && (
        <div className="px-8">
          <LoadingSpinner 
            size="md" 
            className="py-8"
          />
        </div>
      )}
      
      {/* 底部状态 */}
      {!hasMore && displayedProjects.length > 0 && (
        <div className="text-center py-8 px-8">
          <p className="text-[#787878] text-lg">
            已显示全部 {displayedProjects.length} 个团队项目
          </p>
        </div>
      )}
    </div>
  );
};

export default TeamProjectPage; 