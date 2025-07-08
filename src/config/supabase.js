// Supabase Storage configuration
export const SUPABASE_CONFIG = {
  // Your Supabase project details
  url: 'https://hfgwwcsmqthcypxifmso.supabase.co',
  storageUrl: 'https://hfgwwcsmqthcypxifmso.storage.supabase.co/v1/object/public/assets',
  bucketName: 'assets'
};

// Helper function to convert relative paths to Supabase URLs
export const getImageUrl = (relativePath) => {
  console.log('🔗 getImageUrl 输入路径:', relativePath);
  
  // If it's already a full URL, return as is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    console.log('🔗 已是完整URL，直接返回:', relativePath);
    return relativePath;
  }
  
  // Special handling for homepage videos - keep local paths
  if (relativePath.startsWith('./homepage-videos/') || relativePath.startsWith('/homepage-videos/')) {
    // 开发环境和生产环境的路径处理
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      const result = relativePath.startsWith('./') ? relativePath.substring(2) : relativePath;
      console.log('🔗 开发环境homepage视频路径:', result);
      return result;
    } else {
      const publicUrl = process.env.PUBLIC_URL || '';
      const cleanPath = relativePath.startsWith('./') ? relativePath.substring(2) : relativePath.substring(1);
      const result = `${publicUrl}/${cleanPath}`;
      console.log('🔗 生产环境homepage视频路径:', result);
      return result;
    }
  }
  
  // 处理不同类型的资产路径
  let cleanPath = relativePath;
  
  // 移除开头的斜杠
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1);
  }
  
  // 尝试使用Supabase URL，如果失败则提供备用方案
  try {
    const supabaseUrl = `${SUPABASE_CONFIG.storageUrl}/${cleanPath}`;
    
    // 简单的URL验证
    if (cleanPath && cleanPath.length > 0) {
      console.log('🖼️ 构建Supabase URL:', supabaseUrl);
      console.log('🖼️ 清理后的路径:', cleanPath);
      return supabaseUrl;
    }
  } catch (error) {
    console.warn('Supabase URL构建失败:', error);
  }
  
  // 备用方案：尝试本地路径（如果资源也存储在本地）
  console.warn(`⚠️ 使用备用路径: ${relativePath}`);
  return relativePath;
};

// 增强的图片预加载和错误处理
export const preloadImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      console.log(`✅ 图片预加载成功: ${url}`);
      resolve(url);
    };
    img.onerror = (error) => {
      console.error(`❌ 图片预加载失败: ${url}`, error);
      reject(error);
    };
    img.src = url;
  });
};

// 批量预加载图片
export const preloadImages = async (urls) => {
  const results = await Promise.allSettled(
    urls.map(url => preloadImage(getImageUrl(url)))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`📊 图片预加载完成: ${successful}个成功, ${failed}个失败`);
  return results;
};

// For debugging - you can remove this later
export const testUrls = () => {
  console.log('Testing Supabase URLs:');
  console.log('Base storage URL:', SUPABASE_CONFIG.storageUrl);
  console.log('Test image URL:', getImageUrl('/inspiration_assets/ComPotte Branding_assets/cover.mp4'));
}; 