import React from 'react';
import './HomePage.css';

const SimpleHomePage = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'inspiration', label: 'INSPIRATION' },
    { id: 'artist', label: 'ARTIST' },
    { id: 'team project', label: 'TEAM PROJECT' }
  ];

  return (
    <div className="homepage">
      {/* 左侧导航栏 */}
      <div className="sidebar">
        {/* Logo区域 */}
        <div className="logo-section">
          <h1 className="logo-title">设计友好报</h1>
          <span className="logo-icon">🔎</span>
        </div>

        {/* 导航菜单 */}
        <nav className="navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="nav-button"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 右上角标志 */}
      <div className="redesign-logo">
        REDesign
      </div>

      {/* 中央内容区域 - 暂时用简单的占位符 */}
      <div className="sphere-container">
        <div className="sphere-placeholder">
          <div className="spinner">
            <div className="bounce1"></div>
            <div className="bounce2"></div>
            <div className="bounce3"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleHomePage; 