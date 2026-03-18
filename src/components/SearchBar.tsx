import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, SlidersHorizontal, Bot, Loader2, Clock } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { AIService } from '../services/aiService';
import { useSearchShortcuts } from '../hooks/useSearchShortcuts';
import { Input, Button, Badge, Card } from '../design-system/components';
import { useReducedMotion } from '../design-system/hooks/useReducedMotion';
import { useToast } from '../design-system/hooks/useToast';
import { cn } from '../design-system/utils/cn';

export const SearchBar: React.FC = () => {
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
  const [searchQuery, setSearchQuery] = useState(searchFilters.query);
  const [isSearching, setIsSearching] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { addToast } = useToast();

  // Perform search function - defined before useEffect to avoid TDZ
  const performSearch = useCallback(() => {
    let filtered = repositories;

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(repo =>
        repo.name.toLowerCase().includes(query) ||
        repo.full_name.toLowerCase().includes(query) ||
        (repo.description && repo.description.toLowerCase().includes(query))
      );
    }

    // Language filter
    if (searchFilters.languages.length > 0) {
      filtered = filtered.filter(repo =>
        repo.language && searchFilters.languages.includes(repo.language)
      );
    }

    // Tag filter
    if (searchFilters.tags.length > 0) {
      filtered = filtered.filter(repo => {
        const repoTags = [...(repo.ai_tags || []), ...(repo.topics || [])];
        return searchFilters.tags.some(tag => repoTags.includes(tag));
      });
    }

    // Platform filter
    if (searchFilters.platforms.length > 0) {
      filtered = filtered.filter(repo => {
        const repoPlatforms = repo.ai_platforms || [];
        return searchFilters.platforms.some(platform => repoPlatforms.includes(platform));
      });
    }

    // Sort
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

  // Extract available filters from repositories
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
        setSearchHistory(Array.isArray(history) ? history.slice(0, 10) : []);
      } catch (error) {
        console.warn('Failed to load search history:', error);
      }
    }
  }, [repositories]);

  // Real-time search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [performSearch]);

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowHistory(false);

    // Add to history
    if (!searchHistory.includes(searchQuery.trim())) {
      const newHistory = [searchQuery.trim(), ...searchHistory.slice(0, 9)];
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
      sortBy: 'stars',
      sortOrder: 'desc',
    });
    setIsSemanticSearch(false);
    setSearchResults([]);
  };

  const activeFiltersCount =
    searchFilters.languages.length +
    searchFilters.tags.length +
    searchFilters.platforms.length;

  const t = (zh: string, en: string) => language === 'zh' ? zh : en;

  // Keyboard shortcuts
  useSearchShortcuts({
    onFocusSearch: () => {
      searchInputRef.current?.focus();
      if (!searchQuery && searchHistory.length > 0) {
        setShowHistory(true);
      }
    },
    onClearSearch: () => {
      handleClearSearch();
      searchInputRef.current?.focus();
    },
    onToggleFilters: () => setShowFilters(prev => !prev),
  });

  return (
    <Card padding="lg" className="mb-6">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Input
            ref={searchInputRef}
            placeholder={t(
              "搜索仓库名称、描述...",
              "Search repository names, descriptions..."
            )}
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
              setShowHistory(value === '' && searchHistory.length > 0);
            }}
            onFocus={() => !searchQuery && searchHistory.length > 0 && setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
            leftIcon={<Search className="w-4 h-4" />}
            className="pr-32"
          />

          {/* Right side actions */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 h-9">
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="!px-2 h-7"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAISearch}
              disabled={isSearching}
              className="h-7"
              leftIcon={isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            >
              {isSearching ? t('搜索中...', 'Searching...') : t('AI搜索', 'AI Search')}
            </Button>
          </div>
        </div>

        {/* Search History Dropdown */}
        <AnimatePresence>
          {showHistory && searchHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 bg-surface-elevated border border-border rounded-lg shadow-lg z-50 py-2"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
                <span className="text-sm font-medium text-text-secondary">
                  {t('搜索历史', 'Search History')}
                </span>
                <button
                  onClick={clearSearchHistory}
                  className="text-xs text-text-tertiary hover:text-error-600 transition-colors"
                >
                  {t('清除', 'Clear')}
                </button>
              </div>
              {searchHistory.map((historyQuery, index) => (
                <button
                  key={index}
                  onClick={() => handleHistoryItemClick(historyQuery)}
                  className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-surface-overlay transition-colors flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-text-tertiary" />
                  <span className="truncate">{historyQuery}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters || activeFiltersCount > 0 ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<SlidersHorizontal className="w-4 h-4" />}
          >
            {t('过滤器', 'Filters')}
            {activeFiltersCount > 0 && (
              <span className="ml-2 bg-primary-700 text-white rounded-full px-1.5 py-0.5 text-xs">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
            >
              {t('清除全部', 'Clear all')}
            </Button>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <select
            value={searchFilters.sortBy}
            onChange={(e) => setSearchFilters({
              sortBy: e.target.value as 'stars' | 'updated' | 'name' | 'starred'
            })}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="stars">{t('按星标', 'By Stars')}</option>
            <option value="updated">{t('按更新', 'By Updated')}</option>
            <option value="name">{t('按名称', 'By Name')}</option>
            <option value="starred">{t('按加星时间', 'By Starred')}</option>
          </select>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSearchFilters({
              sortOrder: searchFilters.sortOrder === 'desc' ? 'asc' : 'desc'
            })}
            className="!px-2"
          >
            {searchFilters.sortOrder === 'desc' ? '↓' : '↑'}
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-border-subtle space-y-4">
              {/* Languages */}
              {availableLanguages.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-text-primary mb-2">
                    {t('编程语言', 'Languages')}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {availableLanguages.slice(0, 12).map(lang => (
                      <button
                        key={lang}
                        onClick={() => toggleFilter('languages', lang)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-heading transition-all duration-fast',
                          searchFilters.languages.includes(lang)
                            ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                            : 'bg-surface-sunken text-text-secondary border border-transparent hover:border-border hover:text-text-primary'
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
                  <h4 className="text-sm font-medium text-text-primary mb-2">
                    {t('支持平台', 'Platforms')}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {availablePlatforms.map(platform => (
                      <button
                        key={platform}
                        onClick={() => toggleFilter('platforms', platform)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-heading transition-all duration-fast',
                          searchFilters.platforms.includes(platform)
                            ? 'bg-secondary-500/15 text-secondary-400 border border-secondary-500/30'
                            : 'bg-surface-sunken text-text-secondary border border-transparent hover:border-border hover:text-text-primary'
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
                  <h4 className="text-sm font-medium text-text-primary mb-2">
                    {t('标签', 'Tags')}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.slice(0, 15).map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleFilter('tags', tag)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-heading transition-all duration-fast',
                          searchFilters.tags.includes(tag)
                            ? 'bg-success-500/15 text-success-400 border border-success-500/30'
                            : 'bg-surface-sunken text-text-secondary border border-transparent hover:border-border hover:text-text-primary'
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border-subtle">
          {searchFilters.languages.map(lang => (
            <Badge
              key={lang}
              variant="primary"
              size="sm"
              className="cursor-pointer"
              onClick={() => toggleFilter('languages', lang)}
            >
              {lang} ×
            </Badge>
          ))}
          {searchFilters.platforms.map(platform => (
            <Badge
              key={platform}
              variant="secondary"
              size="sm"
              className="cursor-pointer"
              onClick={() => toggleFilter('platforms', platform)}
            >
              {platform} ×
            </Badge>
          ))}
          {searchFilters.tags.map(tag => (
            <Badge
              key={tag}
              variant="success"
              size="sm"
              className="cursor-pointer"
              onClick={() => toggleFilter('tags', tag)}
            >
              {tag} ×
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
};
