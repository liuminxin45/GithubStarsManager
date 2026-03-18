import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ExternalLink, GitBranch, Package, BellOff, Search, X, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, EyeOff, Download,
  ChevronDown, Clock, Filter
} from 'lucide-react';
import { Release } from '../types';
import { useAppStore } from '../store/useAppStore';
import { GitHubApiService } from '../services/githubApi';
import { forceSyncToBackend } from '../services/autoSync';
import { formatDistanceToNow } from 'date-fns';
import { AssetFilterManager } from './AssetFilterManager';
import { Card, Button, Badge } from '../design-system/components';
import { Spinner, ProgressBar } from '../design-system/components/Spinner/Spinner';
import { cn } from '../design-system/utils/cn';

export const ReleaseTimeline: React.FC = () => {
  const {
    releases,
    repositories,
    releaseSubscriptions,
    readReleases,
    githubToken,
    language,
    assetFilters,
    addReleases,
    markReleaseAsRead,
    toggleReleaseSubscription,
    updateRepository,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact');
  const [openDropdowns, setOpenDropdowns] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const t = (zh: string, en: string) => language === 'zh' ? zh : en;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.download-dropdown')) {
        setOpenDropdowns(new Set());
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const toggleDropdown = (releaseId: number) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(releaseId)) {
        newSet.delete(releaseId);
      } else {
        newSet.add(releaseId);
      }
      return newSet;
    });
  };

  const getDownloadLinks = useCallback((release: Release) => {
    const links: Array<{ name: string; url: string; size: number; downloadCount: number }> = [];

    if (release.assets && release.assets.length > 0) {
      release.assets.forEach(asset => {
        links.push({
          name: asset.name,
          url: asset.browser_download_url,
          size: asset.size,
          downloadCount: asset.download_count
        });
      });
    }

    const downloadRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    let match;
    while ((match = downloadRegex.exec(release.body)) !== null) {
      const [, name, url] = match;
      if (url.includes('/download/') || url.includes('/releases/') ||
          name.toLowerCase().includes('download') ||
          /\.(exe|dmg|deb|rpm|apk|ipa|zip|tar\.gz|msi|pkg|appimage)$/i.test(url)) {
        if (!links.some(link => link.url === url || link.name === name)) {
          links.push({ name, url, size: 0, downloadCount: 0 });
        }
      }
    }

    return links;
  }, []);

  const subscribedReleases = releases.filter(release =>
    releaseSubscriptions.has(release.repository.id)
  );

  const filteredReleases = useMemo(() => {
    let filtered = subscribedReleases;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(release =>
        release.repository.name.toLowerCase().includes(query) ||
        release.repository.full_name.toLowerCase().includes(query) ||
        release.tag_name.toLowerCase().includes(query) ||
        release.name.toLowerCase().includes(query)
      );
    }

    if (selectedFilters.length > 0) {
      const activeFilters = assetFilters.filter(filter => selectedFilters.includes(filter.id));
      filtered = filtered.filter(release => {
        const downloadLinks = getDownloadLinks(release);
        return downloadLinks.some(link =>
          activeFilters.some(filter =>
            filter.keywords.some(keyword =>
              link.name.toLowerCase().includes(keyword.toLowerCase())
            )
          )
        );
      });
    }

    return filtered.sort((a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );
  }, [subscribedReleases, searchQuery, selectedFilters, assetFilters, getDownloadLinks]);

  const totalPages = Math.ceil(filteredReleases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReleases = filteredReleases.slice(startIndex, startIndex + itemsPerPage);

  const activeFiltersCount = selectedFilters.length + (searchQuery ? 1 : 0);

  const handleFilterToggle = (filterId: string) => {
    setSelectedFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedFilters([]);
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleRefresh = async () => {
    if (!githubToken) {
      alert(t('GitHub token 未找到', 'GitHub token not found'));
      return;
    }

    setIsRefreshing(true);
    setRefreshProgress(0);

    try {
      const githubApi = new GitHubApiService(githubToken);
      const subscribedRepos = repositories.filter(repo => releaseSubscriptions.has(repo.id));

      if (subscribedRepos.length === 0) {
        alert(t('没有订阅的仓库', 'No subscribed repositories'));
        return;
      }

      const allNewReleases: Release[] = [];
      const latestReleaseTime = releases.length > 0
        ? Math.max(...releases.map(r => new Date(r.published_at).getTime()))
        : 0;
      const sinceTimestamp = latestReleaseTime > 0 ? new Date(latestReleaseTime).toISOString() : undefined;

      for (let i = 0; i < subscribedRepos.length; i++) {
        const repo = subscribedRepos[i];
        const [owner, name] = repo.full_name.split('/');
        const hasExistingReleases = releases.some(r => r.repository.id === repo.id);

        let repoReleases: Release[];
        if (!hasExistingReleases) {
          repoReleases = await githubApi.getRepositoryReleases(owner, name, 1, 10);
        } else {
          repoReleases = await githubApi.getIncrementalRepositoryReleases(owner, name, sinceTimestamp, 10);
        }

        repoReleases.forEach(release => {
          release.repository.id = repo.id;
        });

        allNewReleases.push(...repoReleases);
        setRefreshProgress(Math.round(((i + 1) / subscribedRepos.length) * 100));
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (allNewReleases.length > 0) {
        addReleases(allNewReleases);
      }

      setLastRefreshTime(new Date().toISOString());
      alert(t(`发现 ${allNewReleases.length} 个新Release`, `Found ${allNewReleases.length} new releases`));
    } catch (error) {
      console.error('Refresh failed:', error);
      alert(t('刷新失败', 'Refresh failed'));
    } finally {
      setIsRefreshing(false);
      setRefreshProgress(0);
    }
  };

  const handleReleaseClick = (releaseId: number) => {
    markReleaseAsRead(releaseId);
  };

  const handleUnsubscribeRelease = async (repoId: number) => {
    const repo = repositories.find(item => item.id === repoId);
    if (!repo) return;

    if (!confirm(t(`取消订阅 "${repo.full_name}"?`, `Unsubscribe from "${repo.full_name}"?`))) {
      return;
    }

    const updatedRepo = { ...repo, subscribed_to_releases: false };
    updateRepository(updatedRepo);
    toggleReleaseSubscription(repo.id);

    try {
      await forceSyncToBackend();
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      updateRepository({ ...repo, subscribed_to_releases: true });
      toggleReleaseSubscription(repo.id);
      alert(t('取消订阅失败', 'Failed to unsubscribe'));
    }
  };

  const isReleaseUnread = (releaseId: number) => !readReleases.has(releaseId);

  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  // Empty state
  if (subscribedReleases.length === 0) {
    const subscribedRepoCount = releaseSubscriptions.size;

    return (
      <div className="flex items-center justify-center py-16">
        <Card padding="lg" className="max-w-md text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-surface-sunken flex items-center justify-center">
            <Package className="w-7 h-7 text-text-tertiary" />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-1">
            {subscribedRepoCount === 0 ? t('没有Release订阅', 'No Release Subscriptions') : t('没有最近的Release', 'No Recent Releases')}
          </h3>
          <p className="text-sm text-text-secondary mb-5">
            {subscribedRepoCount === 0
              ? t('从仓库页面订阅仓库Release以在此查看更新', 'Subscribe to repository releases from the Repositories tab')
              : t(`已订阅 ${subscribedRepoCount} 个仓库，但没有找到最近的Release`, `Subscribed to ${subscribedRepoCount} repositories but no recent releases found`)
            }
          </p>
          {subscribedRepoCount > 0 && (
            <Button
              variant="primary"
              onClick={handleRefresh}
              disabled={isRefreshing}
              leftIcon={isRefreshing ? <Spinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
            >
              {isRefreshing ? t('刷新中...', 'Refreshing...') : t('刷新Release', 'Refresh Releases')}
            </Button>
          )}
        </Card>
      </div>
    );
  }

  // Empty search results
  if (filteredReleases.length === 0 && (searchQuery || selectedFilters.length > 0)) {
    return (
      <div className="space-y-4">
        {/* Control Bar */}
        <Card padding="md">
          <div className="space-y-3">
            {/* Search Row */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 min-w-0">
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-9 flex items-center justify-center pointer-events-none">
                    <Search className="w-4 h-4 text-text-tertiary" />
                  </div>
                  <input
                    type="text"
                    placeholder={t('搜索Release...', 'Search releases...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      'w-full h-9 pl-9 pr-9 bg-surface border border-border rounded-lg',
                      'text-sm text-text-primary placeholder:text-text-tertiary',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
                      'transition-colors'
                    )}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-surface-sunken text-text-tertiary transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    showFilters || selectedFilters.length > 0
                      ? 'bg-primary-50 text-primary-600 border border-primary-200'
                      : 'bg-surface border border-border text-text-secondary hover:bg-surface-hover'
                  )}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('筛选', 'Filter')}</span>
                  {selectedFilters.length > 0 && (
                    <span className="bg-primary-600 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-[10px] px-1">
                      {selectedFilters.length}
                    </span>
                  )}
                </button>

                <Button
                  variant="secondary"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  leftIcon={isRefreshing ? <Spinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
                >
                  {isRefreshing ? t('刷新中...', 'Refreshing...') : t('刷新', 'Refresh')}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Empty State */}
        <div className="flex items-center justify-center py-12">
          <Card padding="lg" className="max-w-md text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-surface-sunken flex items-center justify-center">
              <Search className="w-7 h-7 text-text-tertiary" />
            </div>
            <h3 className="text-base font-semibold text-text-primary mb-1">
              {t('未找到相关Release', 'No releases found')}
            </h3>
            <p className="text-sm text-text-secondary mb-5">
              {searchQuery
                ? t(`未找到与 "${searchQuery}" 相关的Release。`, `No releases found for "${searchQuery}".`)
                : t('尝试使用不同的关键词搜索。', 'Try different search keywords.')}
            </p>
            <Button variant="secondary" onClick={handleClearFilters}>
              {t('清除筛选', 'Clear filters')}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Control Bar - 与仓库页一致 */}
      <Card padding="md">
        <div className="space-y-3">
          {/* Primary Control Row */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-9 flex items-center justify-center pointer-events-none">
                  <Search className="w-4 h-4 text-text-tertiary" />
                </div>
                <input
                  type="text"
                  placeholder={t('搜索Release...', 'Search releases...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    'w-full h-9 pl-9 pr-9 bg-surface border border-border rounded-lg',
                    'text-sm text-text-primary placeholder:text-text-tertiary',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
                    'transition-colors'
                  )}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-surface-sunken text-text-tertiary transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  showFilters || selectedFilters.length > 0
                    ? 'bg-primary-50 text-primary-600 border border-primary-200'
                    : 'bg-surface border border-border text-text-secondary hover:bg-surface-hover'
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('筛选', 'Filter')}</span>
                {selectedFilters.length > 0 && (
                  <span className="bg-primary-600 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-[10px] px-1">
                    {selectedFilters.length}
                  </span>
                )}
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-surface-sunken rounded-lg p-1">
                <button
                  onClick={() => setViewMode('compact')}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    viewMode === 'compact'
                      ? 'bg-surface text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                  title={t('精简视图', 'Compact View')}
                >
                  <EyeOff className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('detailed')}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    viewMode === 'detailed'
                      ? 'bg-surface text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                  title={t('详细视图', 'Detailed View')}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              {/* Refresh Button */}
              <Button
                variant="secondary"
                onClick={handleRefresh}
                disabled={isRefreshing}
                leftIcon={isRefreshing ? <Spinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
              >
                {isRefreshing ? t('刷新中...', 'Refreshing...') : t('刷新', 'Refresh')}
              </Button>
            </div>
          </div>

          {/* Refresh Progress */}
          {isRefreshing && (
            <div className="flex items-center gap-4 pt-2 border-t border-border-subtle">
              <Spinner size="sm" />
              <span className="text-sm text-text-secondary">{t('正在获取最新Release...', 'Fetching latest releases...')}</span>
              <div className="flex-1 max-w-xs">
                <ProgressBar progress={refreshProgress} size="sm" />
              </div>
              <span className="text-sm text-text-secondary">{refreshProgress}%</span>
            </div>
          )}

          {/* Active Filter Pills */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border-subtle">
              {searchQuery && (
                <Badge variant="neutral" size="sm" className="cursor-pointer hover:bg-surface-sunken" onClick={() => setSearchQuery('')}>
                  {t('搜索:', 'Search:')} {searchQuery} ×
                </Badge>
              )}
              {selectedFilters.map(filterId => {
                const filter = assetFilters.find(f => f.id === filterId);
                return filter ? (
                  <Badge key={filterId} variant="primary" size="sm" className="cursor-pointer" onClick={() => handleFilterToggle(filterId)}>
                    {filter.name} ×
                  </Badge>
                ) : null;
              })}
              <button
                onClick={handleClearFilters}
                className="text-xs text-text-tertiary hover:text-error transition-colors ml-1"
              >
                {t('清除全部', 'Clear all')}
              </button>
            </div>
          )}

          {/* Filter Panel */}
          {showFilters && (
            <div className="pt-3 border-t border-border">
              <AssetFilterManager
                selectedFilters={selectedFilters}
                onFilterToggle={handleFilterToggle}
                onClearFilters={() => setSelectedFilters([])}
              />
            </div>
          )}

          {/* Results Summary Bar */}
          <div className="flex items-center justify-between text-xs text-text-tertiary pt-2 border-t border-border-subtle">
            <div className="flex items-center gap-3">
              <span>
                <span className="font-medium text-text-primary">{filteredReleases.length}</span>
                {' / '}
                {subscribedReleases.length} {t('个Release', 'releases')}
              </span>
              {lastRefreshTime && (
                <span className="hidden sm:inline">
                  {t('上次刷新:', 'Last refresh:')} {formatDistanceToNow(new Date(lastRefreshTime), { addSuffix: true })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">{t('每页:', 'Per page:')}</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Releases List - 使用统一的滚动容器 */}
      <div className="flex-1 overflow-auto min-h-0 pr-3 space-y-3">
        {paginatedReleases.map((release) => {
          const downloadLinks = getDownloadLinks(release);
          const isUnread = isReleaseUnread(release.id);
          const isDropdownOpen = openDropdowns.has(release.id);

          return (
            <Card
              key={release.id}
              isInteractive
              onClick={() => handleReleaseClick(release.id)}
              className={cn(
                'relative',
                isUnread && 'border-l-4 border-l-primary-500'
              )}
              padding={viewMode === 'detailed' ? 'lg' : 'md'}
            >
              {/* Unread Indicator Dot */}
              {isUnread && (
                <div className="absolute top-4 right-4">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
                  </span>
                </div>
              )}

              {viewMode === 'detailed' ? (
                // Detailed View
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center">
                        <GitBranch className="w-5 h-5 text-success-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-text-primary">
                          {release.repository.name} <span className="text-primary-600">{release.tag_name}</span>
                        </h4>
                        <p className="text-sm text-text-secondary">{release.repository.full_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-tertiary flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDistanceToNow(new Date(release.published_at), { addSuffix: true })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!px-2"
                        onClick={(e) => {
                          e?.stopPropagation();
                          handleUnsubscribeRelease(release.repository.id);
                        }}
                        title={t('取消订阅', 'Unsubscribe')}
                      >
                        <BellOff className="w-4 h-4" />
                      </Button>
                      <a
                        href={release.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReleaseClick(release.id);
                        }}
                        className="p-2 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-surface-sunken transition-colors"
                        title={t('在GitHub上查看', 'View on GitHub')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {release.name && release.name !== release.tag_name && (
                    <h5 className="font-medium text-text-primary">{release.name}</h5>
                  )}

                  {/* Download Links */}
                  {downloadLinks.length > 0 && (
                    <div className="download-dropdown relative">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-secondary">
                          {t('下载:', 'Downloads:')} {downloadLinks.length} {t('个文件', 'files')}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e?.stopPropagation();
                            toggleDropdown(release.id);
                          }}
                          rightIcon={<ChevronDown className={cn('w-4 h-4 transition-transform', isDropdownOpen && 'rotate-180')} />}
                        >
                          {t('查看下载', 'View Downloads')}
                        </Button>
                      </div>

                      {isDropdownOpen && (
                        <div className="absolute z-20 left-0 right-0 mt-2 bg-surface-elevated border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                          {downloadLinks.map((link, idx) => (
                            <a
                              key={idx}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors border-b border-border-subtle last:border-b-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReleaseClick(release.id);
                              }}
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-text-primary truncate">{link.name}</div>
                                <div className="flex items-center gap-3 text-xs text-text-tertiary mt-1">
                                  {link.size > 0 && <span>{formatFileSize(link.size)}</span>}
                                  {link.downloadCount > 0 && <span>{link.downloadCount.toLocaleString()} {t('次下载', 'downloads')}</span>}
                                </div>
                              </div>
                              <Download className="w-4 h-4 text-text-tertiary" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {release.body && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-text-secondary whitespace-pre-wrap line-clamp-3">
                        {release.body}
                      </p>
                      {release.body.length > 200 && (
                        <a
                          href={release.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block"
                        >
                          {t('阅读完整Release说明 →', 'Read full release notes →')}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Compact View
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-success-100 flex items-center justify-center flex-shrink-0">
                      <GitBranch className="w-4 h-4 text-success-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary text-sm truncate">
                        {release.repository.name} <span className="text-primary-600">{release.tag_name}</span>
                      </p>
                      <p className="text-xs text-text-secondary truncate">{release.name || release.tag_name}</p>
                    </div>
                  </div>

                  {/* Downloads */}
                  <div className="hidden sm:block download-dropdown relative">
                    {downloadLinks.length > 0 ? (
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e?.stopPropagation();
                            toggleDropdown(release.id);
                          }}
                          leftIcon={<Download className="w-4 h-4" />}
                          rightIcon={<ChevronDown className={cn('w-4 h-4 transition-transform', isDropdownOpen && 'rotate-180')} />}
                        >
                          {downloadLinks.length}
                        </Button>

                        {isDropdownOpen && (
                          <div className="absolute right-0 mt-2 w-64 bg-surface-elevated border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
                            {downloadLinks.slice(0, 5).map((link, idx) => (
                              <a
                                key={idx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between px-3 py-2 hover:bg-surface-hover transition-colors border-b border-border-subtle last:border-b-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReleaseClick(release.id);
                                }}
                              >
                                <span className="text-xs text-text-primary truncate">{link.name}</span>
                                <Download className="w-3 h-3 text-text-tertiary" />
                              </a>
                            ))}
                            {downloadLinks.length > 5 && (
                              <div className="px-3 py-2 text-xs text-text-tertiary text-center">
                                +{downloadLinks.length - 5} {t('更多', 'more')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-text-tertiary">{t('无下载', 'No downloads')}</span>
                    )}
                  </div>

                  {/* Time and Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-text-tertiary hidden sm:block">
                      {formatDistanceToNow(new Date(release.published_at), { addSuffix: true })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!px-2"
                      onClick={(e) => {
                        e?.stopPropagation();
                        handleUnsubscribeRelease(release.repository.id);
                      }}
                      title={t('取消订阅', 'Unsubscribe')}
                    >
                      <BellOff className="w-4 h-4" />
                    </Button>
                    <a
                      href={release.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReleaseClick(release.id);
                      }}
                      className="p-2 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-surface-sunken transition-colors"
                      title={t('在GitHub上查看', 'View on GitHub')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="!px-2"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(p => p - 1)}
            disabled={currentPage === 1}
            className="!px-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {getPageNumbers().map((page, index) => (
            <Button
              key={index}
              variant={page === currentPage ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => typeof page === 'number' && setCurrentPage(page)}
              disabled={typeof page !== 'number'}
              className="min-w-[40px]"
            >
              {page}
            </Button>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={currentPage === totalPages}
            className="!px-2"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="!px-2"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReleaseTimeline;
