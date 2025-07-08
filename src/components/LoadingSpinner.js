import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  fullScreen = false,
  className = ''
}) => {
  const containerClasses = fullScreen 
    ? 'fixed inset-0 flex items-center justify-center bg-dark-bg bg-opacity-90 z-50'
    : 'flex items-center justify-center';

  return (
    <div className={`${containerClasses} ${className}`}>
      {/* Three Dots Bouncing Animation */}
      <div className="spinner">
        <div className="bounce1"></div>
        <div className="bounce2"></div>
        <div className="bounce3"></div>
      </div>
    </div>
  );
};

export default LoadingSpinner; 