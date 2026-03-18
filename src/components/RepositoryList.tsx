import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { RepositoryCard } from './RepositoryCard';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { ControlBar } from './ControlBar';
import { RepositoryCardSkeleton } from '../design-system/components/Skeleton/RepositoryCardSkeleton';

import { Repository } from '../types';
import { useAppStore, getAllCategories } from '../store/useAppStore';
import { GitHubApiService } from '../services/githubApi';
import { AIService } from '../services/aiService';

// 防抖钩子
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}


interface RepositoryListProps {
  repositories: Repository[];
  selectedCategory: string;
}

export const RepositoryList: React.FC<RepositoryListProps> = ({
  repositories,
  selectedCategory
}) => {
  const {
    githubToken,
    aiConfigs,
    activeAIConfig,
    isLoading,
    setLoading,
    updateRepository,
    language,
    customCategories,
    analysisProgress,
    setAnalysisProgress,
    searchFilters,
    isSemanticSearch
  } = useAppStore();

  const [showAISummary] = useState(true);

  // 防抖搜索词
  const debouncedSearchQuery = useDebounce(searchFilters.query, 150);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const shouldStopRef = useRef(false);
  const isAnalyzingRef = useRef(false);

  // Virtual list container ref
  const parentRef = useRef<HTMLDivElement>(null);

  // Responsive column count
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    const updateColumnCount = () => {
      const width = window.innerWidth;
      if (width >= 1536) setColumnCount(4);      // 2xl:grid-cols-4
      else if (width >= 1280) setColumnCount(3); // xl:grid-cols-3
      else if (width >= 768) setColumnCount(2);  // md:grid-cols-2
      else setColumnCount(1);                    // grid-cols-1
    };

    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);

  const allCategories = getAllCategories(customCategories, language);

  // 分步骤筛选 - 减少重复计算
  // Step 1: 分类筛选
  const categoryFiltered = useMemo(() => {
    if (selectedCategory === 'all') return repositories;

    const selectedCategoryObj = allCategories.find(cat => cat.id === selectedCategory);
    if (!selectedCategoryObj) return [];

    return repositories.filter(repo => {
      if (repo.custom_category === selectedCategoryObj.name) return true;

      if (repo.ai_tags?.length) {
        return repo.ai_tags.some(tag =>
          selectedCategoryObj.keywords.some(keyword =>
            tag.toLowerCase().includes(keyword.toLowerCase()) ||
            keyword.toLowerCase().includes(tag.toLowerCase())
          )
        );
      }

      const repoText = [
        repo.name,
        repo.description || '',
        repo.language || '',
        ...(repo.topics || []),
        repo.ai_summary || ''
      ].join(' ').toLowerCase();

      return selectedCategoryObj.keywords.some(keyword =>
        repoText.includes(keyword.toLowerCase())
      );
    });
  }, [repositories, selectedCategory, allCategories]);

  // Step 2: 搜索词筛选（使用防抖后的值）
  // 如果是AI语义搜索结果，跳过字符串匹配过滤
  const searchFiltered = useMemo(() => {
    if (isSemanticSearch) return categoryFiltered;
    if (!debouncedSearchQuery) return categoryFiltered;

    const query = debouncedSearchQuery.toLowerCase();
    return categoryFiltered.filter(repo =>
      repo.name.toLowerCase().includes(query) ||
      repo.full_name.toLowerCase().includes(query) ||
      (repo.description?.toLowerCase().includes(query) ?? false)
    );
  }, [categoryFiltered, debouncedSearchQuery, isSemanticSearch]);

  // Step 3: 语言筛选
  const languageFiltered = useMemo(() => {
    if (searchFilters.languages.length === 0) return searchFiltered;

    return searchFiltered.filter(repo =>
      searchFilters.languages.includes(repo.language || '')
    );
  }, [searchFiltered, searchFilters.languages]);

  // Step 4: 排序
  const filteredRepositories = useMemo(() => {
    const sorted = [...languageFiltered];
    const order = searchFilters.sortOrder === 'asc' ? 1 : -1;

    switch (searchFilters.sortBy) {
      case 'stars':
        sorted.sort((a, b) => (a.stargazers_count - b.stargazers_count) * order);
        break;
      case 'updated':
        sorted.sort((a, b) =>
          (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * order
        );
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name) * order);
        break;
      case 'starred':
        sorted.sort((a, b) =>
          (new Date(a.starred_at || 0).getTime() - new Date(b.starred_at || 0).getTime()) * order
        );
        break;
    }
    return sorted;
  }, [languageFiltered, searchFilters.sortBy, searchFilters.sortOrder]);

  // Virtual grid setup - 优化配置
  const rowCount = Math.ceil(filteredRepositories.length / columnCount);
  const CARD_HEIGHT = 232; // Fixed card height (increased to prevent overlap)
  const GAP_SIZE = 16;     // gap-4 = 16px (increased vertical spacing)

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => CARD_HEIGHT + GAP_SIZE, []),
    overscan: 5, // 优化为 5 行，平衡滚动流畅度和 DOM 节点数
    getItemKey: useCallback((index: number) => `row-${index}-${columnCount}`, [columnCount]),
    measureElement: useCallback((el: HTMLElement) => el.getBoundingClientRect().height, []),
    scrollPaddingEnd: 0,
  });

  const virtualItems = virtualizer.getVirtualItems();

  const unanalyzedCount = filteredRepositories.filter(r => !r.analyzed_at).length;
  const analyzedCount = filteredRepositories.filter(r => r.analyzed_at && !r.analysis_failed).length;
  const failedCount = filteredRepositories.filter(r => r.analysis_failed).length;

  const handleAIAnalyze = async (type: 'all' | 'unanalyzed' | 'failed') => {
    if (!githubToken) {
      setError(language === 'zh' ? 'GitHub token 未找到' : 'GitHub token not found');
      return;
    }

    const activeConfig = aiConfigs.find(config => config.id === activeAIConfig);
    if (!activeConfig) {
      setError(language === 'zh' ? '请先在设置中配置AI服务' : 'Please configure AI service in settings');
      return;
    }

    const targetRepos = type === 'failed'
      ? filteredRepositories.filter(repo => repo.analysis_failed)
      : type === 'unanalyzed'
        ? filteredRepositories.filter(repo => !repo.analyzed_at)
        : filteredRepositories;

    if (targetRepos.length === 0) {
      return;
    }

    shouldStopRef.current = false;
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);
    setLoading(true);
    setAnalysisProgress({ current: 0, total: targetRepos.length });
    setIsPaused(false);
    setError(null);

    try {
      const githubApi = new GitHubApiService(githubToken);
      const aiService = new AIService(activeConfig, language);
      const customCategoryNames = customCategories.map(cat => cat.name);

      let analyzed = 0;
      const concurrency = activeConfig.concurrency || 1;

      const analyzeRepository = async (repo: Repository) => {
        if (shouldStopRef.current) return false;

        while (isPaused && !shouldStopRef.current) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (shouldStopRef.current) return false;

        try {
          const [owner, name] = repo.full_name.split('/');
          const readmeContent = await githubApi.getRepositoryReadme(owner, name);
          const analysis = await aiService.analyzeRepository(repo, readmeContent, customCategoryNames);

          updateRepository({
            ...repo,
            ai_summary: analysis.summary,
            ai_tags: analysis.tags,
            ai_platforms: analysis.platforms,
            analyzed_at: new Date().toISOString(),
            analysis_failed: false
          });

          analyzed++;
          setAnalysisProgress({ current: analyzed, total: targetRepos.length });
          return true;
        } catch (error) {
          console.warn(`Failed to analyze ${repo.full_name}:`, error);
          updateRepository({
            ...repo,
            analyzed_at: new Date().toISOString(),
            analysis_failed: true
          });
          analyzed++;
          setAnalysisProgress({ current: analyzed, total: targetRepos.length });
          return false;
        }
      };

      for (let i = 0; i < targetRepos.length; i += concurrency) {
        if (shouldStopRef.current) break;

        const batch = targetRepos.slice(i, i + concurrency);
        await Promise.all(batch.map(repo => analyzeRepository(repo)));

        if (i + concurrency < targetRepos.length && !shouldStopRef.current) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      setError(language === 'zh' ? 'AI分析失败' : 'AI analysis failed');
    } finally {
      isAnalyzingRef.current = false;
      shouldStopRef.current = false;
      setIsAnalyzing(false);
      setLoading(false);
      setAnalysisProgress({ current: 0, total: 0 });
      setIsPaused(false);
    }
  };

  const handlePauseResume = () => {
    if (!isAnalyzingRef.current) return;
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    if (!isAnalyzingRef.current) return;
    shouldStopRef.current = true;
    setIsPaused(false);
  };

  if (filteredRepositories.length === 0) {
    const selectedCategoryObj = allCategories.find(cat => cat.id === selectedCategory);

    if (searchFilters.query) {
      return (
        <div className="space-y-4">
          <ControlBar
            filteredCount={0}
            totalCount={repositories.length}
            unanalyzedCount={0}
            analyzedCount={0}
            failedCount={0}
            isAnalyzing={false}
            analysisProgress={{ current: 0, total: 0 }}
            isPaused={false}
            onAIAnalyze={() => {}}
            onPauseResume={() => {}}
            onStop={() => {}}
          />
          <EmptyState type="search" query={searchFilters.query} />
        </div>
      );
    }

    if (selectedCategory !== 'all') {
      return (
        <div className="space-y-4">
          <ControlBar
            filteredCount={0}
            totalCount={repositories.length}
            unanalyzedCount={0}
            analyzedCount={0}
            failedCount={0}
            isAnalyzing={false}
            analysisProgress={{ current: 0, total: 0 }}
            isPaused={false}
            onAIAnalyze={() => {}}
            onPauseResume={() => {}}
            onStop={() => {}}
          />
          <EmptyState type="category" categoryName={selectedCategoryObj?.name} />
        </div>
      );
    }

    return <EmptyState type="default" />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => setError(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Control Bar */}
      <ControlBar
        filteredCount={filteredRepositories.length}
        totalCount={repositories.length}
        unanalyzedCount={unanalyzedCount}
        analyzedCount={analyzedCount}
        failedCount={failedCount}
        isAnalyzing={isAnalyzing}
        analysisProgress={analysisProgress}
        isPaused={isPaused}
        onAIAnalyze={handleAIAnalyze}
        onPauseResume={handlePauseResume}
        onStop={handleStop}
      />

      {/* Repository Grid - Virtualized */}
      {isLoading && filteredRepositories.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <RepositoryCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div
          ref={parentRef}
          className="flex-1 overflow-auto min-h-0 pr-3"
          style={{ willChange: 'scroll-position' }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualRow) => {
              const rowIndex = virtualRow.index;
              const startIndex = rowIndex * columnCount;
              const rowRepos = filteredRepositories.slice(startIndex, startIndex + columnCount);

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    contain: 'layout style paint',
                    contentVisibility: 'auto',
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"
                >
                  {rowRepos.map((repo) => (
                    <div key={repo.id} style={{ height: CARD_HEIGHT }}>
                      <RepositoryCard
                        repository={repo}
                        showAISummary={showAISummary}
                        searchQuery={debouncedSearchQuery}
                      />
                    </div>
                  ))}
                  {/* Fill empty slots in the last row to maintain grid alignment */}
                  {rowRepos.length < columnCount &&
                    Array.from({ length: columnCount - rowRepos.length }).map((_, i) => (
                      <div key={`empty-${i}`} style={{ height: CARD_HEIGHT }} />
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RepositoryList;
