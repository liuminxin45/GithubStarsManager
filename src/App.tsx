import React, { useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { RepositoryList } from './components/RepositoryList';
import { CategorySidebar } from './components/CategorySidebar';
import { ReleaseTimeline } from './components/ReleaseTimeline';
import { SettingsPanel } from './components/SettingsPanel';
import { useAppStore } from './store/useAppStore';
import { useAutoUpdateCheck } from './components/UpdateChecker';
import { UpdateNotificationBanner } from './components/UpdateNotificationBanner';
import { backend } from './services/backendAdapter';
import { syncFromBackend, startAutoSync, stopAutoSync } from './services/autoSync';

function App() {
  const {
    isAuthenticated,
    currentView,
    selectedCategory,
    theme,
    repositories,
    searchResults,
    setSelectedCategory,
  } = useAppStore();

  // Auto check updates
  useAutoUpdateCheck();

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Initialize backend adapter and auto-sync
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    const initBackend = async () => {
      try {
        await backend.init();
        if (backend.isAvailable && !cancelled) {
          await syncFromBackend();
          if (!cancelled) {
            unsubscribe = startAutoSync();
          }
        }
      } catch (err) {
        console.error('Failed to initialize backend:', err);
      }
    };

    initBackend();

    return () => {
      cancelled = true;
      if (unsubscribe) {
        stopAutoSync(unsubscribe);
      }
    };
  }, []);

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Main application interface
  const renderCurrentView = () => {
    switch (currentView) {
      case 'repositories':
        return (
          <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 h-full">
            {/* Sidebar - collapsible on mobile */}
            <CategorySidebar
              repositories={repositories}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
            />

            {/* Main Content */}
            <div className="flex-1 min-w-0 flex flex-col">
              <RepositoryList
                repositories={searchResults.length > 0 ? searchResults : repositories}
                selectedCategory={selectedCategory}
              />
            </div>
          </div>
        );
      case 'releases':
        return (
          <div className="flex-1 min-w-0 flex flex-col h-full">
            <ReleaseTimeline />
          </div>
        );
      case 'settings':
        return (
          <div className="h-full overflow-auto">
            <SettingsPanel />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-bg text-text-primary overflow-hidden">
      <UpdateNotificationBanner />
      <Header />
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 overflow-hidden">
        {renderCurrentView()}
      </main>
    </div>
  );
}

export default App;
