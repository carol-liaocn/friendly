import React, { useState, useMemo } from 'react';
import LazyMedia from './LazyMedia';
import LoadingSpinner from './LoadingSpinner';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import artistData from '../data/artist_data.json';

const ArtistPage = () => {
  const [activeFilter, setActiveFilter] = useState('All');

  // 筛选艺术家
  const filteredArtists = useMemo(() => 
    activeFilter === 'All' 
      ? artistData 
      : artistData.filter(artist => 
          artist.categories.some(category => 
            category.toLowerCase() === activeFilter.toLowerCase()
          )
        ), [activeFilter]);

  // 使用无限滚动Hook
  const {
    displayedItems: displayedArtists,
    isLoading,
    hasMore,
    lastItemRef,
    reset
  } = useInfiniteScroll(filteredArtists, 6); // 每次加载6个艺术家

  // 当筛选条件改变时重置
  React.useEffect(() => {
    reset();
  }, [activeFilter, reset]);
  
  const filterOptions = [
    'All',
    'Branding',
    'Digital',
    'Motion',
    'Graphic',
    'Typography',
    'Generative Art',
    'AIGC'
  ];



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
        <h2 className="text-2xl font-medium text-light-gray uppercase">artist</h2>
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

      {/* First Divider Line - aligned with ARTIST text */}
      <div className="px-8">
        <div className="w-full" style={{ height: '0.2px', backgroundColor: '#E2E2E2' }}></div>
      </div>
      <div className="mb-4"></div>

      {/* Artists Grid */}
      <div className="px-8 space-y-16">
        {displayedArtists.map((artist, index) => (
          <div 
            key={artist.id}
            ref={index === displayedArtists.length - 1 ? lastItemRef : null}
          >
            {/* Divider Line above each artist (except first) */}
            {index > 0 && (
              <>
                <div className="w-full" style={{ height: '0.2px', backgroundColor: '#E2E2E2' }}></div>
                <div className="mb-4"></div>
              </>
            )}
            
            {/* Artist Row - 4 Column Layout */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              
              {/* Column 1: Artist Information */}
              <div className="flex flex-col justify-between h-full">
                <div className="space-y-1.5">
                  {/* Artist Name */}
                  <h3 className="text-2xl font-medium text-light-gray leading-tight capitalize">
                    {artist.name}
                  </h3>
                  
                  {/* Category Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {artist.categories.map((category, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-0.5 text-sm font-medium text-dark-bg rounded-md leading-tight ${getCategoryColor(category)}`}
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* View All Button - aligned to bottom */}
                <button
                  className="flex items-center space-x-3 self-start focus:outline-none"
                  onClick={() => window.open(artist.description, '_blank', 'noopener,noreferrer')}
                  type="button"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ border: '0.2px solid #E2E2E2' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E2E2E2" strokeWidth="0.4" className="text-light-gray">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-light-gray">view all</span>
                </button>
              </div>

              {/* Columns 2-4: Works Grid (3 columns of works) - 3:4 Portrait Ratio */}
              <div className="col-span-3 grid grid-cols-3 gap-4">
                {artist.works.slice(0, 3).map((work, workIndex) => (
                  <div
                    key={work.id}
                    className="aspect-[3/4] bg-design-gray overflow-hidden"
                  >
                    <LazyMedia
                      src={work.image}
                      alt={`${artist.name} work ${work.id}`}
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
                ))}
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
      {!hasMore && displayedArtists.length > 0 && (
        <div className="text-center py-8 px-8">
          <p className="text-[#787878] text-lg">
            已显示全部 {displayedArtists.length} 位艺术家
          </p>
        </div>
      )}

      {/* No artists found message */}
      {displayedArtists.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-64">
          <p className="text-[#787878] text-lg">没有找到符合条件的艺术家</p>
        </div>
      )}
    </div>
  );
};

export default ArtistPage; 