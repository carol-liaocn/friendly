import { useState, useEffect, useCallback, useRef } from 'react';

const useInfiniteScroll = (items, itemsPerPage = 12) => {
  const [displayedItems, setDisplayedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef(false);

  // 初始化显示的项目
  useEffect(() => {
    if (items.length > 0) {
      const initialItems = items.slice(0, itemsPerPage);
      setDisplayedItems(initialItems);
      setCurrentPage(1);
      setHasMore(items.length > itemsPerPage);
    }
  }, [items, itemsPerPage]);

  // 加载更多项目
  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMore) return;
    
    loadingRef.current = true;
    setIsLoading(true);

    // 模拟加载延迟（可以根据实际情况调整）
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const startIndex = (nextPage - 1) * itemsPerPage;
      const endIndex = nextPage * itemsPerPage;
      const newItems = items.slice(startIndex, endIndex);

      if (newItems.length > 0) {
        setDisplayedItems(prev => [...prev, ...newItems]);
        setCurrentPage(nextPage);
        setHasMore(endIndex < items.length);
      } else {
        setHasMore(false);
      }

      setIsLoading(false);
      loadingRef.current = false;
    }, 300); // 300ms延迟，提供更好的用户体验
  }, [currentPage, items, itemsPerPage, hasMore]);

  // 重置到初始状态
  const reset = useCallback(() => {
    if (items.length > 0) {
      const initialItems = items.slice(0, itemsPerPage);
      setDisplayedItems(initialItems);
      setCurrentPage(1);
      setHasMore(items.length > itemsPerPage);
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [items, itemsPerPage]);

  // 设置Intersection Observer来检测滚动到底部
  const lastItemRef = useCallback((node) => {
    if (isLoading) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingRef.current) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px' // 提前100px开始加载
      }
    );

    if (node) observer.observe(node);
    
    return () => {
      if (node) observer.unobserve(node);
    };
  }, [isLoading, hasMore, loadMore]);

  return {
    displayedItems,
    isLoading,
    hasMore,
    loadMore,
    reset,
    lastItemRef,
    currentPage,
    totalItems: items.length
  };
};

export default useInfiniteScroll; 