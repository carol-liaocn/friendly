import React from 'react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'inspiration', label: 'inspiration' },
    { id: 'artist', label: 'artist' },
    { id: 'team project', label: 'team project' }
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-80 bg-dark-bg z-10">
      {/* Logo - 点击可返回首页 */}
      <div className="px-8 py-8">
        <div 
          className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setActiveTab('home')}
        >
          <h1 className="text-light-gray text-2xl font-bold whitespace-nowrap">
            设计友好报
          </h1>
          <span className="ml-4 text-2xl">🔎</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-8 space-y-1.5">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`block text-left text-2xl font-medium uppercase tracking-wide transition-colors duration-200 whitespace-nowrap ${
              activeTab === item.id 
                ? 'text-light-gray' 
                : 'text-light-gray opacity-60 hover:opacity-80'
            }`}
            style={activeTab === item.id ? { filter: 'blur(10px)' } : {}}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar; 