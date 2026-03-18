import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Search, X, Bot, Loader2, Clock,
  ChevronDown, Filter, ArrowUpDown, Pause, Play
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { AIService } from '../services/aiService';
import { Badge } from '../design-system/components';
import { useToast } from '../design-system/hooks/useToast';
import { cn } from '../design-system/utils/cn';

interface ControlBarProps {
  filteredCount: number;
  totalCount: number;
  unanalyzedCount: number;
  analyzedCount: number;
  failedCount: number;
  isAnalyzing: boolean;
  analysisProgress: { current: number; total: number };
  isPaused: boolean;
  onAIAnalyze: (type: 'all' | 'unanalyzed' | 'failed') => void;
  onPauseResume: () => void;
  onStop: () => void;
}

/**
 * ControlBar - 精简的控制栏
 *
 * 设计原则：
 * - 紧凑布局，信息清晰
 * - 简化的筛选交互
 * - 克制的视觉风格
 */
export const ControlBar: React.FC<ControlBarProps> = ({
  filteredCount,
  totalCount,
  unanalyzedCount,
  analyzedCount,
  failedCount,
  isAnalyzing,
  analysisProgress,
  isPaused,
  onAIAnalyze,
  onPauseResume,
  onStop,
}) => {
  const {
    searchFilters,
    repositories,
    aiConfigs,
    activeAIConfig,
    language,
    setSearchFilters,
    setSearchResults,
    setIsSemanticSearch,
  } = useAppStore();

  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showAIDropdown, setShowAIDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchFilters.query);
  const [isSearching, setIsSearching] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const aiDropdownRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  // Extract available filters
  useEffect(() => {
    const languages = [...new Set(repositories.map(r => r.language).filter(Boolean))];
    const tags = [...new Set([
      ...repositories.flatMap(r => r.ai_tags || []),
      ...repositories.flatMap(r => r.topics || [])
    ])];
    const platforms = [...new Set(repositories.flatMap(r => r.ai_platforms || []))];

    setAvailableLanguages(languages);
    setAvailableTags(tags);
    setAvailablePlatforms(platforms);

    const savedHistory = localStorage.getItem('github-stars-search-history');
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        setSearchHistory(Array.isArray(history) ? history.slice(0, 8) : []);
      } catch (error) {
        console.warn('Failed to load search history:', error);
      }
    }
  }, [repositories]);

  // Perform search
  const performSearch = useCallback(() => {
    let filtered = repositories;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(repo =>
        repo.name.toLowerCase().includes(query) ||
        repo.full_name.toLowerCase().includes(query) ||
        (repo.description && repo.description.toLowerCase().includes(query))
      );
    }

    if (searchFilters.languages.length > 0) {
      filtered = filtered.filter(repo =>
        repo.language && searchFilters.languages.includes(repo.language)
      );
    }

    if (searchFilters.tags.length > 0) {
      filtered = filtered.filter(repo => {
        const repoTags = [...(repo.ai_tags || []), ...(repo.topics || [])];
        return searchFilters.tags.some(tag => repoTags.includes(tag));
      });
    }

    if (searchFilters.platforms.length > 0) {
      filtered = filtered.filter(repo => {
        const repoPlatforms = repo.ai_platforms || [];
        return searchFilters.platforms.some(platform => repoPlatforms.includes(platform));
      });
    }

    filtered.sort((a, b) => {
      const order = searchFilters.sortOrder === 'desc' ? 1 : -1;
      switch (searchFilters.sortBy) {
        case 'stars':
          return (b.stargazers_count - a.stargazers_count) * order;
        case 'updated':
          return (new Date(b.pushed_at || b.updated_at).getTime() - new Date(a.pushed_at || a.updated_at).getTime()) * order;
        case 'name':
          return a.name.localeCompare(b.name) * order;
        case 'starred':
          return ((new Date(b.starred_at || 0).getTime() - new Date(a.starred_at || 0).getTime()) * order);
        default:
          return 0;
      }
    });

    setSearchResults(filtered);
  }, [searchQuery, searchFilters, repositories, setSearchResults]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 200);
    return () => clearTimeout(timeoutId);
  }, [performSearch]);

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowHistory(false);

    if (!searchHistory.includes(searchQuery.trim())) {
      const newHistory = [searchQuery.trim(), ...searchHistory.slice(0, 7)];
      setSearchHistory(newHistory);
      localStorage.setItem('github-stars-search-history', JSON.stringify(newHistory));
    }

    // Show searching toast
    addToast({
      variant: 'info',
      title: language === 'zh' ? '正在搜索...' : 'Searching...',
      description: language === 'zh' ? `AI 正在分析: "${searchQuery}"` : `AI analyzing: "${searchQuery}"`,
      duration: 3000,
    });

    const activeConfig = aiConfigs.find(config => config.id === activeAIConfig);
    if (activeConfig) {
      try {
        const aiService = new AIService(activeConfig, language);
        const results = await aiService.searchRepositoriesWithReranking(repositories, searchQuery);
        setSearchResults(results);
        setIsSemanticSearch(true); // Mark as semantic search - skip string filtering

        // Show success toast
        addToast({
          variant: 'success',
          title: language === 'zh' ? '搜索完成' : 'Search completed',
          description: language === 'zh'
            ? `找到 ${results.length} 个相关仓库`
            : `Found ${results.length} repositories`,
          duration: 3000,
        });
      } catch (error) {
        console.warn('AI search failed:', error);
        setIsSemanticSearch(false);
        performSearch();
        addToast({
          variant: 'warning',
          title: language === 'zh' ? 'AI 搜索失败' : 'AI search failed',
          description: language === 'zh' ? '已切换到普通搜索模式' : 'Switched to basic search mode',
          duration: 3000,
        });
      }
    } else {
      setIsSemanticSearch(false);
      performSearch();
      setSearchFilters({ query: searchQuery });
      addToast({
        variant: 'info',
        title: language === 'zh' ? '搜索完成' : 'Search completed',
        description: language === 'zh'
          ? `找到 ${repositories.length} 个相关仓库`
          : `Found ${repositories.length} repositories`,
        duration: 3000,
      });
    }

    setIsSearching(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchFilters({ query: '' });
    setIsSemanticSearch(false);
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const handleHistoryItemClick = (historyQuery: string) => {
    setSearchQuery(historyQuery);
    setShowHistory(false);
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('github-stars-search-history');
  };

  const toggleFilter = (type: 'languages' | 'tags' | 'platforms', value: string) => {
    const current = searchFilters[type];
    const updated = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    setSearchFilters({ [type]: updated });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSearchFilters({
      query: '',
      tags: [],
      languages: [],
      platforms: [],
    });
  };

  const activeFiltersCount =
    searchFilters.languages.length +
    searchFilters.tags.length +
    searchFilters.platforms.length;

  const t = (zh: string, en: string) => language === 'zh' ? zh : en;

  const sortOptions = [
    { value: 'stars', label: t('星标数', 'Stars') },
    { value: 'updated', label: t('更新时间', 'Updated') },
    { value: 'name', label: t('名称', 'Name') },
    { value: 'starred', label: t('加星时间', 'Starred') },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (aiDropdownRef.current && !aiDropdownRef.current.contains(event.target as Node)) {
        setShowAIDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setShowFilters(false);
        setShowSort(false);
        setShowAIDropdown(false);
        setShowHistory(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hasActiveAIConfig = aiConfigs.find(config => config.id === activeAIConfig);

  return (
    <div className="space-y-3">
      {/* Primary Control Row */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search Input - 更简洁的样式 */}
        <div className="relative flex-1 min-w-0">
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-9 flex items-center justify-center pointer-events-none">
              <Search className="w-4 h-4 text-text-tertiary" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder={t('搜索仓库...', 'Search repositories...')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowHistory(e.target.value === '' && searchHistory.length > 0);
              }}
              onFocus={() => !searchQuery && searchHistory.length > 0 && setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 150)}
              className={cn(
                'w-full h-9 pl-9 pr-24 bg-surface border border-border rounded-lg',
                'text-sm text-text-primary placeholder:text-text-tertiary',
                'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
                'transition-colors'
              )}
            />
            <div className="absolute right-1.5 top-0 bottom-0 flex items-center gap-0.5">
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="p-1.5 rounded-md hover:bg-neutral-100 text-text-tertiary transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleAISearch}
                disabled={isSearching || !searchQuery.trim() || !hasActiveAIConfig}
                className={cn(
                  'flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium transition-colors',
                  hasActiveAIConfig
                    ? 'bg-primary-50 text-primary-600 hover:bg-primary-100 disabled:opacity-50'
                    : 'bg-neutral-100 text-text-tertiary cursor-not-allowed'
                )}
                title={!hasActiveAIConfig ? t('需先配置 AI', 'Configure AI first') : 'AI Search'}
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">AI</span>
              </button>
            </div>
          </div>

          {/* Search History */}
          <AnimatePresence>
            {showHistory && searchHistory.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 py-1">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-subtle">
                  <span className="text-xs font-medium text-text-secondary">
                    {t('历史', 'History')}
                  </span>
                  <button
                    onClick={clearSearchHistory}
                    className="text-[10px] text-text-tertiary hover:text-red-600 transition-colors"
                  >
                    {t('清除', 'Clear')}
                  </button>
                </div>
                {searchHistory.map((historyQuery, index) => (
                  <button
                    key={index}
                    onClick={() => handleHistoryItemClick(historyQuery)}
                    className="w-full px-3 py-1.5 text-left text-sm text-text-primary hover:bg-neutral-50 transition-colors flex items-center gap-2"
                  >
                    <Clock className="w-3 h-3 text-text-tertiary" />
                    <span className="truncate">{historyQuery}</span>
                  </button>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Control Buttons - 更紧凑 */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              showFilters || activeFiltersCount > 0
                ? 'bg-primary-50 text-primary-600 border border-primary-200'
                : 'bg-surface border border-border text-text-secondary hover:bg-neutral-50'
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('筛选', 'Filter')}</span>
            {activeFiltersCount > 0 && (
              <span className="bg-primary-600 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-[10px] px-1">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSort(!showSort)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                showSort
                  ? 'bg-neutral-100 border border-border text-text-primary'
                  : 'bg-surface border border-border text-text-secondary hover:bg-neutral-50'
              )}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {sortOptions.find(o => o.value === searchFilters.sortBy)?.label}
              </span>
              <ChevronDown className={cn('w-3 h-3 transition-transform', showSort && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {showSort && (
                <div className="absolute top-full right-0 mt-1 w-40 bg-surface border border-border rounded-lg shadow-lg z-50 py-1">
                  {sortOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSearchFilters({ sortBy: option.value as 'stars' | 'updated' | 'name' | 'starred' });
                        setShowSort(false);
                      }}
                      className={cn(
                        'w-full px-3 py-1.5 text-left text-sm transition-colors',
                        searchFilters.sortBy === option.value
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-text-secondary hover:bg-neutral-50'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                  <div className="border-t border-border-subtle my-1" />
                  <button
                    onClick={() => {
                      setSearchFilters({ sortOrder: searchFilters.sortOrder === 'desc' ? 'asc' : 'desc' });
                      setShowSort(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-neutral-50"
                  >
                    {searchFilters.sortOrder === 'desc' ? '↓ ' : '↑ '}
                    {searchFilters.sortOrder === 'desc' ? t('降序', 'Descending') : t('升序', 'Ascending')}
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* AI Analysis Dropdown */}
          <div className="relative" ref={aiDropdownRef}>
            <button
              onClick={() => !isAnalyzing && setShowAIDropdown(!showAIDropdown)}
              disabled={isAnalyzing && analysisProgress.total === 0}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isAnalyzing
                  ? 'bg-primary-50 text-primary-600'
                  : 'bg-surface border border-border text-text-secondary hover:bg-neutral-50'
              )}
            >
              {isAnalyzing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Bot className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isAnalyzing
                  ? `${analysisProgress.current}/${analysisProgress.total}`
                  : t('AI分析', 'AI Analysis')
                }
              </span>
              {!isAnalyzing && <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Progress Bar when analyzing */}
            {isAnalyzing && analysisProgress.total > 0 && (
              <div className="absolute -bottom-1 left-1 right-1 h-0.5 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 transition-all duration-300"
                  style={{ width: `${(analysisProgress.current / analysisProgress.total) * 100}%` }}
                />
              </div>
            )}

            <AnimatePresence>
              {showAIDropdown && !isAnalyzing && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-surface border border-border rounded-lg shadow-lg z-50 py-1">
                  <button
                    onClick={() => {
                      onAIAnalyze('all');
                      setShowAIDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-50 transition-colors border-b border-border-subtle"
                  >
                    <div className="font-medium text-text-primary text-sm">{t('分析全部', 'Analyze All')}</div>
                    <div className="text-xs text-text-tertiary">{filteredCount} {t('个仓库', 'repositories')}</div>
                  </button>
                  <button
                    onClick={() => {
                      onAIAnalyze('unanalyzed');
                      setShowAIDropdown(false);
                    }}
                    disabled={unanalyzedCount === 0}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-50 transition-colors disabled:opacity-50 border-b border-border-subtle"
                  >
                    <div className="font-medium text-text-primary text-sm">{t('分析未分析', 'Analyze Unanalyzed')}</div>
                    <div className="text-xs text-text-tertiary">{unanalyzedCount} {t('个未分析', 'unanalyzed')}</div>
                  </button>
                  <button
                    onClick={() => {
                      onAIAnalyze('failed');
                      setShowAIDropdown(false);
                    }}
                    disabled={failedCount === 0}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-50 transition-colors disabled:opacity-50"
                  >
                    <div className="font-medium text-text-primary text-sm">{t('重试失败', 'Retry Failed')}</div>
                    <div className="text-xs text-text-tertiary">{failedCount} {t('个失败', 'failed')}</div>
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Pause/Stop Controls during analysis */}
          {isAnalyzing && (
            <>
              <button
                onClick={onPauseResume}
                className="p-2 rounded-lg bg-surface border border-border text-text-secondary hover:bg-neutral-50 transition-colors"
                title={isPaused ? t('继续', 'Resume') : t('暂停', 'Pause')}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={onStop}
                className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors"
                title={t('停止', 'Stop')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Filter Pills - 更简洁 */}
      {(activeFiltersCount > 0 || searchQuery) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {searchQuery && (
            <Badge variant="neutral" size="sm" className="cursor-pointer hover:bg-neutral-200" onClick={() => setSearchQuery('')}>
              {t('搜索:', 'Search:')} {searchQuery} ×
            </Badge>
          )}
          {searchFilters.languages.map(lang => (
            <Badge key={lang} variant="primary" size="sm" className="cursor-pointer" onClick={() => toggleFilter('languages', lang)}>
              {lang} ×
            </Badge>
          ))}
          {searchFilters.platforms.map(platform => (
            <Badge key={platform} variant="secondary" size="sm" className="cursor-pointer" onClick={() => toggleFilter('platforms', platform)}>
              {platform} ×
            </Badge>
          ))}
          {searchFilters.tags.map(tag => (
            <Badge key={tag} variant="success" size="sm" className="cursor-pointer" onClick={() => toggleFilter('tags', tag)}>
              {tag} ×
            </Badge>
          ))}
          {(activeFiltersCount > 0 || searchQuery) && (
            <button
              onClick={clearFilters}
              className="text-xs text-text-tertiary hover:text-red-600 ml-1 transition-colors"
            >
              {t('清除全部', 'Clear all')}
            </button>
          )}
        </div>
      )}

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <div className="overflow-hidden">
            <div className="pt-3 border-t border-border space-y-3">
              {/* Languages */}
              {availableLanguages.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-text-tertiary mb-1.5 uppercase tracking-wide">
                    {t('语言', 'Languages')}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {availableLanguages.slice(0, 10).map(lang => (
                      <button
                        key={lang}
                        onClick={() => toggleFilter('languages', lang)}
                        className={cn(
                          'px-2 py-1 rounded text-xs transition-colors',
                          searchFilters.languages.includes(lang)
                            ? 'bg-primary-50 text-primary-600 border border-primary-200'
                            : 'bg-neutral-100 text-text-secondary hover:bg-neutral-200'
                        )}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Platforms */}
              {availablePlatforms.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-text-tertiary mb-1.5 uppercase tracking-wide">
                    {t('平台', 'Platforms')}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {availablePlatforms.map(platform => (
                      <button
                        key={platform}
                        onClick={() => toggleFilter('platforms', platform)}
                        className={cn(
                          'px-2 py-1 rounded text-xs transition-colors',
                          searchFilters.platforms.includes(platform)
                            ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                            : 'bg-neutral-100 text-text-secondary hover:bg-neutral-200'
                        )}
                      >
                        {platform}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {availableTags.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-text-tertiary mb-1.5 uppercase tracking-wide">
                    {t('标签', 'Tags')}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {availableTags.slice(0, 12).map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleFilter('tags', tag)}
                        className={cn(
                          'px-2 py-1 rounded text-xs transition-colors',
                          searchFilters.tags.includes(tag)
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'bg-neutral-100 text-text-secondary hover:bg-neutral-200'
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Results Summary Bar - 更简洁 */}
      <div className="flex items-center justify-between text-xs text-text-tertiary pt-2 border-t border-border-subtle">
        <div className="flex items-center gap-3">
          <span>
            <span className="font-medium text-text-primary">{filteredCount}</span>
            {' / '}
            {totalCount} {t('个仓库', 'repos')}
          </span>
          {analyzedCount > 0 && (
            <span className="text-emerald-600">
              {analyzedCount} {t('已分析', 'analyzed')}
            </span>
          )}
          {failedCount > 0 && (
            <span className="text-red-600">
              {failedCount} {t('失败', 'failed')}
            </span>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-[10px] text-text-tertiary opacity-60">⌘K {t('聚焦搜索', 'Focus search')}</span>
        </div>
      </div>
    </div>
  );
};

export default ControlBar;
