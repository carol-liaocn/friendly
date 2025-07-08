import React from 'react';
import LazyMedia from './LazyMedia';

const ProjectModal = ({ project, onClose }) => {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 判断文件是否为视频
  const isVideo = (imagePath) => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi'];
    return videoExtensions.some(ext => imagePath.toLowerCase().endsWith(ext));
  };

  // 获取预览图片（为视频文件生成静态预览）
  const getPreviewForAsset = (assetUrl) => {
    if (!isVideo(assetUrl)) return null;
    
    // 尝试根据assets中的其他文件找到对应的静态图片
    if (project.assets) {
      const assetsArray = project.assets.split(';').map(asset => asset.trim()).filter(asset => asset);
      const isStaticImage = (url) => {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        return imageExtensions.some(ext => url.toLowerCase().endsWith(ext));
      };
      
      // 寻找同目录下的静态图片
      const assetDir = assetUrl.substring(0, assetUrl.lastIndexOf('/'));
      const potentialPreview = assetsArray.find(asset => 
        isStaticImage(asset) && asset.startsWith(assetDir)
      );
      
      if (potentialPreview) {
        console.log(`为 ${assetUrl} 找到预览图片:`, potentialPreview);
        return potentialPreview;
      }
    }
    
    return null;
  };

  // 处理assets字符串，将分号分隔的字符串转换为数组
  const processAssets = (assetsString) => {
    if (!assetsString) return [];
    // 分割字符串并去除空格
    const assetsArray = assetsString.split(';').map(asset => asset.trim()).filter(asset => asset);
    return assetsArray.map((asset, index) => ({
      src: asset,
      id: `asset-${index}`,
      aspectRatio: '1/1' // 统一使用1:1正方形比例
    }));
  };

  const assetItems = project.assets ? processAssets(project.assets) : [];

  return (
    <div 
      className="fixed inset-0 bg-dark-bg bg-opacity-80 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      {/* Close button positioned outside the modal */}
      <button 
        onClick={onClose}
        className="fixed top-8 left-4 w-10 h-10 bg-design-yellow flex items-center justify-center z-60"
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#131313" strokeWidth="1">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <div className="bg-design-yellow max-h-[80vh] w-full mx-16 overflow-hidden flex" style={{ maxWidth: '86.4rem' }}>
        {/* Left side - Image Gallery */}
        <div className="w-[70%] bg-design-yellow min-h-0" style={{ paddingLeft: '1.2%' }}>
          {/* Scrollable image grid */}
          <div className="h-full overflow-y-auto min-h-0 scrollbar-hide" style={{ paddingTop: '0', paddingRight: '1rem', paddingBottom: '1rem', paddingLeft: '0' }}>
            <div className="grid grid-cols-2 gap-4">
              {/* Main asset - 主图，跨两列 */}
              {project.main_asset && (
                <div className="col-span-2 aspect-[3/2] bg-design-gray">
                  <LazyMedia
                    src={project.main_asset}
                    alt={`${project.title} main asset`}
                    className="w-full h-full object-cover"
                    previewSrc={getPreviewForAsset(project.main_asset)}
                    showVideoControls={true}
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
              )}
              
              {/* Additional assets in two-column layout */}
              {assetItems.map((item) => (
                <div 
                  key={item.id}
                  className="bg-design-gray aspect-square"
                >
                  <LazyMedia
                    src={item.src}
                    alt={`${project.title} asset`}
                    className="w-full h-full object-cover"
                    previewSrc={getPreviewForAsset(item.src)}
                    showVideoControls={true}
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
              
              {/* 如果没有assets，显示一些占位图 */}
              {(!project.assets || project.assets.length === 0) && (
                <>
                  <div className="aspect-square bg-design-gray"></div>
                  <div className="aspect-square bg-design-gray"></div>
                  <div className="aspect-square bg-design-gray"></div>
                  <div className="aspect-square bg-design-gray"></div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Content */}
        <div className="w-[30%] bg-design-yellow text-dark-bg flex flex-col min-h-0" style={{ paddingTop: '2rem', paddingBottom: '2rem', paddingRight: '1.2%', paddingLeft: '0' }}>

          <div style={{ marginBottom: '1.5rem' }}>
            <h2 className="font-bold uppercase" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', lineHeight: '1.2' }}>{project.title}</h2>
            <p className="font-medium" style={{ fontSize: '1.125rem', lineHeight: '1.3' }}>by {project.author}</p>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0" style={{ marginBottom: '1.5rem' }}>
            <p className="whitespace-pre-line font-medium text-justify" style={{ fontSize: '1.125rem', lineHeight: '1.625' }}>
              {project.description}
            </p>
          </div>

          <div className="text-left">
            
{Array.isArray(project.link) ? (
  project.link.map((url, index) => (
    <div key={index}>
      <a 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-dark-bg font-medium underline hover:no-underline block"
        style={{ fontSize: '0.875rem' }}
      >
        {url}
      </a>
    </div>
  ))
) : (
  <a 
    href={project.link}
    target="_blank"
    rel="noopener noreferrer"
    className="text-dark-bg font-medium underline hover:no-underline"
    style={{ fontSize: '0.875rem' }}
  >
    {project.link}
  </a>
)}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectModal; 