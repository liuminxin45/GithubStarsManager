import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Star, Settings, Calendar, Search, Moon, Sun, LogOut, RefreshCw,
  Menu, X, ChevronDown
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { GitHubApiService } from '../services/githubApi';
import { Button, Spinner } from '../design-system/components';
import { useTheme } from '../design-system/hooks/useTheme';
import { useToast } from '../design-system/hooks/useToast';
import { cn } from '../design-system/utils/cn';

interface HeaderProps {
  className?: string;
}

/**
 * Header - 精简的顶部导航
 *
 * 设计原则：
 * - 减少视觉噪音
 * - 清晰的导航层级
 * - 克制的交互反馈
 */
export const Header: React.FC<HeaderProps> = ({ className }) => {
  const {
    user,
    currentView,
    isLoading,
    lastSync,
    githubToken,
    repositories,
    releases,
    setRepositories,
    setReleases,
    setLoading,
    setLastSync,
    logout,
    language,
    readReleases,
    releaseSubscriptions,
  } = useAppStore();

  const subscribedReleases = releases.filter(release =>
    releaseSubscriptions.has(release.repository.id)
  );
  const unreleasedCount = subscribedReleases.filter(r => !readReleases.has(r.id)).length;

  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleSync = async () => {
    if (!githubToken) {
      addToast({
        variant: 'error',
        title: language === 'zh' ? 'GitHub Token 未找到' : 'GitHub Token not found',
        description: language === 'zh' ? '请重新登录' : 'Please login again',
      });
      return;
    }

    setLoading(true);
    try {
      const githubApi = new GitHubApiService(githubToken);
      const newRepositories = await githubApi.getAllStarredRepositories();

      const existingRepoMap = new Map(repositories.map(repo => [repo.id, repo]));
      const mergedRepositories = newRepositories.map(newRepo => {
        const existing = existingRepoMap.get(newRepo.id);
        if (existing) {
          return {
            ...newRepo,
            ai_summary: existing.ai_summary,
            ai_tags: existing.ai_tags,
            ai_platforms: existing.ai_platforms,
            analyzed_at: existing.analyzed_at,
            analysis_failed: existing.analysis_failed,
            custom_description: existing.custom_description,
            custom_tags: existing.custom_tags,
            custom_category: existing.custom_category,
            category_locked: existing.category_locked,
            last_edited: existing.last_edited,
          };
        }
        return newRepo;
      });

      setRepositories(mergedRepositories);

      const newReleases = await githubApi.getMultipleRepositoryReleases(mergedRepositories.slice(0, 20));
      setReleases(newReleases);

      setLastSync(new Date().toISOString());

      const newRepoCount = newRepositories.length - repositories.length;
      addToast({
        variant: 'success',
        title: language === 'zh' ? '同步完成' : 'Sync completed',
        description: newRepoCount > 0
          ? `${language === 'zh' ? '发现' : 'Found'} ${newRepoCount} ${language === 'zh' ? '个新仓库' : 'new repositories'}`
          : (language === 'zh' ? '所有仓库都是最新的' : 'All repositories are up to date'),
      });
    } catch (error) {
      console.error('Sync failed:', error);
      if (error instanceof Error && error.message.includes('token')) {
        addToast({
          variant: 'error',
          title: language === 'zh' ? 'Token 已过期' : 'Token expired',
          description: language === 'zh' ? '请重新登录' : 'Please login again',
        });
        logout();
      } else {
        addToast({
          variant: 'error',
          title: language === 'zh' ? '同步失败' : 'Sync failed',
          description: language === 'zh' ? '请检查网络连接' : 'Please check network connection',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return language === 'zh' ? '从未' : 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return language === 'zh' ? '刚刚' : 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}${language === 'zh' ? '分钟前' : 'm ago'}`;
    if (diffHours < 24) return `${diffHours}${language === 'zh' ? '小时前' : 'h ago'}`;
    return date.toLocaleDateString();
  };

  const t = (zh: string, en: string) => language === 'zh' ? zh : en;

  const navItems = [
    {
      id: 'repositories' as const,
      label: t('仓库', 'Repos'),
      icon: Search,
      count: repositories.length,
      badge: null,
    },
    {
      id: 'releases' as const,
      label: t('发布', 'Releases'),
      icon: Calendar,
      count: subscribedReleases.length,
      badge: unreleasedCount > 0 ? unreleasedCount : null,
    },
  ];

  const setCurrentView = useAppStore(state => state.setCurrentView);

  return (
    <>
      <header className={cn(
        'sticky top-0 z-50 w-full',
        'bg-surface border-b border-border',
        'hd-drag',
        className
      )}>
        <div className="max-w-[1600px] mx-auto px-4">
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Logo - 更简洁 */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary-600">
                <Star className="w-4 h-4 text-white" />
              </div>
              <span className="hidden sm:block font-semibold text-text-primary text-sm">
                GitHub Stars
              </span>
            </div>

            {/* Desktop Navigation - 更简洁的样式 */}
            <nav className="hidden md:flex items-center gap-1 hd-btns">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-neutral-100 text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-neutral-50'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white px-1">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    ) : (
                      <span className="text-xs text-text-tertiary">{item.count}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Actions - 精简布局 */}
            <div className="flex items-center gap-1 hd-btns">
              {/* Sync */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSync}
                disabled={isLoading}
                loading={isLoading}
                leftIcon={!isLoading ? <RefreshCw className="w-4 h-4" /> : undefined}
                className="text-text-secondary hidden sm:flex"
                title={`${t('上次同步:', 'Last sync:')} ${formatLastSync(lastSync)}`}
              >
                <span className="hidden lg:inline">{formatLastSync(lastSync)}</span>
              </Button>

              <div className="h-4 w-px bg-border hidden sm:block" />

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="text-text-secondary"
                title={t('切换主题', 'Toggle theme')}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>

              {/* User Menu */}
              {user && (
                <div className="hidden md:block relative ml-1">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors',
                      isUserMenuOpen ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                    )}
                  >
                    <img
                      src={user.avatar_url || 'https://github.com/ghost.png'}
                      alt={user.name || user.login || 'User'}
                      className="w-6 h-6 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://github.com/ghost.png';
                      }}
                    />
                    <ChevronDown className={cn(
                      'w-3.5 h-3.5 text-text-tertiary transition-transform',
                      isUserMenuOpen && 'rotate-180'
                    )} />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsUserMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                          <div className="p-3 border-b border-border-subtle">
                            <p className="font-medium text-text-primary text-sm truncate">
                              {user.name || user.login}
                            </p>
                            <p className="text-xs text-text-tertiary truncate">
                              @{user.login}
                            </p>
                          </div>
                          <div className="p-1">
                            <button
                              onClick={() => {
                                setCurrentView('settings');
                                setIsUserMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-text-secondary hover:bg-neutral-50 transition-colors"
                            >
                              <Settings className="w-4 h-4" />
                              {t('设置', 'Settings')}
                            </button>
                            <button
                              onClick={logout}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <LogOut className="w-4 h-4" />
                              {t('退出', 'Logout')}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden"
              >
                {isMobileMenuOpen ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Menu className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer - 简化版 */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/30 z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="fixed right-0 top-0 bottom-0 w-64 bg-surface border-l border-border z-50 md:hidden">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <span className="font-semibold text-text-primary text-sm">
                    {t('菜单', 'Menu')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {user && (
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar_url}
                        alt={user.name || user.login}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary text-sm truncate">
                          {user.name || user.login}
                        </p>
                        <p className="text-xs text-text-tertiary truncate">
                          @{user.login}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentView(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors',
                          isActive
                            ? 'bg-neutral-100 text-text-primary'
                            : 'text-text-secondary hover:bg-neutral-50'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="flex-1 font-medium text-sm">{item.label}</span>
                        {item.badge ? (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white px-1">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        ) : (
                          <span className="text-xs text-text-tertiary">{item.count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 border-t border-border space-y-1">
                  <button
                    onClick={() => {
                      handleSync();
                      setIsMobileMenuOpen(false);
                    }}
                    disabled={isLoading}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-text-secondary hover:bg-neutral-50 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Spinner size="sm" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span className="flex-1 font-medium">{t('同步', 'Sync')}</span>
                    <span className="text-xs text-text-tertiary">
                      {formatLastSync(lastSync)}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      toggleTheme();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-text-secondary hover:bg-neutral-50 transition-colors"
                  >
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4" />
                    ) : (
                      <Moon className="w-4 h-4" />
                    )}
                    <span className="flex-1 font-medium">
                      {theme === 'dark'
                        ? t('亮色模式', 'Light')
                        : t('暗色模式', 'Dark')}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView('settings');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-text-secondary hover:bg-neutral-50 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="flex-1 font-medium">{t('设置', 'Settings')}</span>
                  </button>

                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="flex-1 font-medium">{t('退出', 'Logout')}</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
