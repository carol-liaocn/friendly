import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import HomePage from './components/home/HomePage';
import InspirationPage from './components/InspirationPage';
import ArtistPage from './components/ArtistPage';
import TeamProjectPage from './components/TeamProjectPage';

function App() {
  const [activeTab, setActiveTab] = useState('home');

  // Handle GitHub Pages SPA redirect
  useEffect(() => {
    // Check if this is a redirect from 404.html
    const query = window.location.search;
    if (query.includes('/?/')) {
      const path = query.replace('/?/', '').split('&')[0];
      
      // Map paths to activeTab states
      const pathToTab = {
        'inspiration': 'inspiration',
        'artist': 'artist',
        'team-project': 'team project',
        'team_project': 'team project'
      };
      
      if (pathToTab[path]) {
        setActiveTab(pathToTab[path]);
      }
      
      // Clean up the URL
      window.history.replaceState(null, null, window.location.pathname);
    }
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage activeTab={activeTab} setActiveTab={setActiveTab} />;
      case 'inspiration':
        return <InspirationPage />;
      case 'artist':
        return <ArtistPage />;
      case 'team project':
        return <TeamProjectPage />;
      default:
        return <HomePage activeTab={activeTab} setActiveTab={setActiveTab} />;
    }
  };

  // 如果在首页，不显示传统的侧边栏，因为首页有自己的导航
  if (activeTab === 'home') {
    return (
      <div className="h-screen bg-dark-bg text-light-gray">
        {renderContent()}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-dark-bg text-light-gray">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;