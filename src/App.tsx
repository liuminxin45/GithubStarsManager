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
    searchFilters,
    setSelectedCategory,
    setCurrentView,
    setSearchFilters,
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
          const state = useAppStore.getState();
          await backend.syncSettings({
            activeAIConfig: state.activeAIConfig,
            activeWebDAVConfig: state.activeWebDAVConfig,
            github_token: state.githubToken,
          });
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');

    if (tab === 'repositories' || tab === 'releases') {
      setCurrentView(tab);
    }

    if (tab === 'repositories') {
      const query = params.get('q');
      const category = params.get('category');
      if (query) setSearchFilters({ query });
      if (category) setSelectedCategory(category);
    }
  }, [setCurrentView, setSearchFilters, setSelectedCategory]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', currentView);

    if (currentView === 'repositories') {
      if (searchFilters.query) params.set('q', searchFilters.query);
      else params.delete('q');

      if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory);
      else params.delete('category');

      ['spoken', 'lang', 'range'].forEach(key => params.delete(key));
    } else {
      ['spoken', 'lang', 'range', 'category', 'q'].forEach(key => params.delete(key));
    }

    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
    window.history.replaceState(null, '', nextUrl);
  }, [currentView, searchFilters.query, selectedCategory]);

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="h-screen flex flex-col bg-bg text-text-primary overflow-hidden">
      <UpdateNotificationBanner />
      <Header />
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 overflow-hidden">
        {currentView === 'settings' ? (
          <div className="h-full overflow-auto">
            <SettingsPanel />
          </div>
        ) : (
          <>
            <div className={currentView === 'repositories' ? 'flex flex-col lg:flex-row gap-3 lg:gap-4 h-full' : 'hidden'}>
              <CategorySidebar
                repositories={repositories}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
              />

              <div className="flex-1 min-w-0 flex flex-col">
                <RepositoryList
                  repositories={searchResults.length > 0 ? searchResults : repositories}
                  selectedCategory={selectedCategory}
                />
              </div>
            </div>
            <div className={currentView === 'releases' ? 'flex-1 min-w-0 flex flex-col h-full' : 'hidden'}>
              <ReleaseTimeline />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
