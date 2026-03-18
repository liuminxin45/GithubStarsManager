import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Star, ExternalLink, Calendar, Tag, Bell, BellOff, Bot,
  MoreHorizontal, Trash2, Edit3, BookOpen, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Repository } from '../types';
import { useAppStore } from '../store/useAppStore';
import { GitHubApiService } from '../services/githubApi';
import { AIService } from '../services/aiService';
import { forceSyncToBackend } from '../services/autoSync';
import { formatDistanceToNow } from 'date-fns';
import { RepositoryEditModal } from './RepositoryEditModal';
import { cn } from '../design-system/utils/cn';

interface RepositoryCardProps {
  repository: Repository;
  showAISummary?: boolean;
  searchQuery?: string;
}

// 全局事件委托 - 点击外部关闭菜单
const menuListeners = new Map<string, () => void>();

// 语言颜色映射 - 静态数据移到组件外
const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#239120',
  Go: '#00ADD8',
  Rust: '#dea584',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Swift: '#fa7343',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#1572B6',
  Vue: '#4FC08D',
  React: '#61DAFB',
};

const getLanguageColor = (language: string | null): string =>
  LANGUAGE_COLORS[language || ''] || '#737373';

document.addEventListener('mousedown', (event) => {
  const target = event.target as HTMLElement;
  const isMenuButton = target.closest('[data-menu-button]');
  const isMenu = target.closest('[data-menu]');

  if (!isMenuButton && !isMenu) {
    menuListeners.forEach((close) => close());
  }
});

// 使用 ResizeObserver 优化尺寸检测
const useResizeObserver = (
  ref: React.RefObject<HTMLParagraphElement | null>,
  callback: () => void,
  deps: unknown[]
) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    callback();

    const observer = new ResizeObserver(() => {
      callback();
    });
    observer.observe(element);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

/**
 * RepositoryCard - 精简版仓库卡片
 *
 * 设计原则：
 * - 降低信息密度，突出关键信息
 * - 清晰的视觉层级
 * - 克制的交互反馈
 * - 简洁的图标使用
 */
const RepositoryCardInner: React.FC<RepositoryCardProps> = ({
  repository,
  showAISummary = true,
  searchQuery = ''
}) => {
  const {
    releaseSubscriptions,
    toggleReleaseSubscription,
    githubToken,
    aiConfigs,
    activeAIConfig,
    isLoading,
    setLoading,
    language,
    customCategories,
    updateRepository,
    deleteRepository
  } = useAppStore();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const [unstarring, setUnstarring] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const isSubscribed = releaseSubscriptions.has(repository.id);

  // 使用 ResizeObserver 检测文本截断
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const checkTruncation = useCallback(() => {
    setIsTextTruncated(descriptionRef.current?.scrollHeight > descriptionRef.current?.clientHeight);
  }, []);

  useResizeObserver(descriptionRef, checkTruncation, [repository, showAISummary]);

  // 注册到全局事件委托
  useEffect(() => {
    if (showActions) {
      menuListeners.set(repository.id, () => setShowActions(false));
      return () => {
        menuListeners.delete(repository.id);
      };
    }
  }, [showActions, repository.id]);

  // 缓存高亮搜索词结果
  const highlightSearchTerm = useMemo(() => {
    const cache = new Map<string, React.ReactNode>();

    return (text: string, searchTerm: string): React.ReactNode => {
      if (!searchTerm.trim() || !text) return text;

      const cacheKey = `${text}::${searchTerm}`;
      if (cache.has(cacheKey)) return cache.get(cacheKey)!;

      const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);

      const result = parts.map((part, index) => {
        if (regex.test(part)) {
          return (
            <mark
              key={index}
              className="bg-primary-100 text-primary-800 px-0.5 rounded"
            >
              {part}
            </mark>
          );
        }
        return part;
      });

      cache.set(cacheKey, result);
      return result;
    };
  }, []);

  // 缓存数字格式化
  const formatNumber = useMemo(() => {
    const cache = new Map<number, string>();
    return (num: number): string => {
      if (cache.has(num)) return cache.get(num)!;
      let result: string;
      if (num >= 1000000) result = `${(num / 1000000).toFixed(1)}M`;
      else if (num >= 1000) result = `${(num / 1000).toFixed(1)}K`;
      else result = num.toString();
      cache.set(num, result);
      return result;
    };
  }, []);

  const handleAIAnalyze = async () => {
    if (!githubToken) {
      alert('GitHub token not found. Please login again.');
      return;
    }

    const activeConfig = aiConfigs.find(config => config.id === activeAIConfig);
    if (!activeConfig) {
      alert(language === 'zh' ? '请先在设置中配置AI服务。' : 'Please configure AI service in settings first.');
      return;
    }

    if (repository.analyzed_at) {
      const confirmMessage = language === 'zh'
        ? `此仓库已于 ${new Date(repository.analyzed_at).toLocaleString()} 进行过AI分析。\n\n是否要重新分析？`
        : `This repository was analyzed on ${new Date(repository.analyzed_at).toLocaleString()}.\n\nDo you want to re-analyze?`;

      if (!confirm(confirmMessage)) return;
    }

    setLoading(true);
    try {
      const githubApi = new GitHubApiService(githubToken);
      const aiService = new AIService(activeConfig, language);

      const [owner, name] = repository.full_name.split('/');
      const readmeContent = await githubApi.getRepositoryReadme(owner, name);
      const customCategoryNames = customCategories.map(cat => cat.name);

      const analysis = await aiService.analyzeRepository(repository, readmeContent, customCategoryNames);

      const updatedRepo = {
        ...repository,
        ai_summary: analysis.summary,
        ai_tags: analysis.tags,
        ai_platforms: analysis.platforms,
        analyzed_at: new Date().toISOString(),
        analysis_failed: false
      };

      updateRepository(updatedRepo);
      alert(language === 'zh' ? 'AI分析完成！' : 'AI analysis completed!');
    } catch (error) {
      console.error('AI analysis failed:', error);
      updateRepository({
        ...repository,
        analyzed_at: new Date().toISOString(),
        analysis_failed: true
      });
      alert(language === 'zh' ? 'AI分析失败，请检查配置。' : 'AI analysis failed. Please check configuration.');
    } finally {
      setLoading(false);
    }
  };

  const getDeepWikiUrl = (githubUrl: string) => githubUrl.replace('github.com', 'deepwiki.com');
  const getZreadUrl = (fullName: string) => `https://zread.ai/${fullName}`;

  // 缓存计算属性
  const displayContent = useMemo(() => {
    if (repository.custom_description) {
      return { content: repository.custom_description, isCustom: true };
    } else if (showAISummary && repository.analysis_failed) {
      return {
        content: repository.description || (language === 'zh' ? '暂无描述' : 'No description'),
        isAI: false, isFailed: true
      };
    } else if (showAISummary && repository.ai_summary) {
      return { content: repository.ai_summary, isAI: true };
    } else if (repository.description) {
      return { content: repository.description, isAI: false };
    }
    return { content: language === 'zh' ? '暂无描述' : 'No description', isAI: false };
  }, [repository.custom_description, repository.analysis_failed, repository.ai_summary, repository.description, showAISummary, language]);

  const displayTags = useMemo(() => {
    if (repository.custom_tags?.length) return { tags: repository.custom_tags, isCustom: true };
    if (repository.ai_tags?.length) return { tags: repository.ai_tags, isCustom: false };
    return { tags: repository.topics || [], isCustom: false };
  }, [repository.custom_tags, repository.ai_tags, repository.topics]);

  const t = (zh: string, en: string) => language === 'zh' ? zh : en;

  const handleUnstar = async () => {
    if (!githubToken) {
      alert(t('未找到 GitHub Token，请重新登录。', 'GitHub token not found.'));
      return;
    }

    const confirmMessage = language === 'zh'
      ? `确定要取消 Star "${repository.full_name}" 吗？`
      : `Unstar "${repository.full_name}"?`;

    if (!confirm(confirmMessage)) return;

    setUnstarring(true);
    try {
      const githubApi = new GitHubApiService(githubToken);
      const [owner, repo] = repository.full_name.split('/');
      await githubApi.unstarRepository(owner, repo);
      deleteRepository(repository.id);
      await forceSyncToBackend();
      alert(t('已成功取消 Star', 'Unstarred successfully'));
    } catch (error) {
      console.error('Failed to unstar:', error);
      alert(t('取消 Star 失败', 'Failed to unstar'));
    } finally {
      setUnstarring(false);
    }
  };

  return (
    <>
      <div ref={cardRef} className="group bg-surface border border-border rounded-lg p-4 hover:border-border-strong transition-colors duration-fast relative">
        {/* Header: Avatar + Name + Actions */}
        <div className="flex items-start gap-3">
          <img
            src={repository.owner.avatar_url}
            alt={repository.owner.login}
            loading="lazy"
            decoding="async"
            className="w-8 h-8 rounded-md flex-shrink-0 bg-neutral-100"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm text-text-primary truncate">
              {highlightSearchTerm(repository.name, searchQuery)}
            </h3>
            <p className="text-xs text-text-tertiary truncate">
              {repository.owner.login}
            </p>
          </div>

          {/* Quick Actions - 精简且只在hover时显示 */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => toggleReleaseSubscription(repository.id)}
              className={cn(
                'p-1.5 rounded transition-colors',
                isSubscribed
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100'
              )}
              title={isSubscribed ? t('取消订阅', 'Unsubscribe') : t('订阅Release', 'Subscribe')}
            >
              {isSubscribed ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setEditModalOpen(true)}
              className="p-1.5 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
              title={t('编辑', 'Edit')}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <div className="relative">
              <button
                data-menu-button
                onClick={() => setShowActions(!showActions)}
                className="p-1.5 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {showActions && (
                <div data-menu className="absolute right-0 top-full mt-1 w-32 bg-surface border border-border rounded-lg shadow-lg z-20 py-1">
                  <a
                    href={language === 'zh' ? getZreadUrl(repository.full_name) : getDeepWikiUrl(repository.html_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {language === 'zh' ? 'Zread' : 'DeepWiki'}
                  </a>
                  <a
                    href={repository.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    GitHub
                  </a>
                  <button
                    onClick={handleUnstar}
                    disabled={unstarring}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t('取消 Star', 'Unstar')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description - Fixed 2 lines height */}
        <div className="mt-2">
          <div
            className="relative cursor-help"
            onMouseEnter={() => isTextTruncated && setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <p
              ref={descriptionRef}
              className="text-sm text-text-secondary leading-relaxed line-clamp-2 h-[3rem]"
              style={{ lineHeight: '1.5rem' }}
            >
              {highlightSearchTerm(displayContent.content, searchQuery)}
            </p>
          </div>
        </div>

        {/* Tags - Fixed 1 line height */}
        <div className="mt-2 h-[22px] overflow-hidden w-full">
          {displayTags.tags.length > 0 ? (
            <div className="flex gap-1 flex-nowrap max-h-[22px] overflow-hidden">
              {/* Tags - show max 2 tags, +n for overflow */}
              {displayTags.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-100 text-neutral-600 text-2xs rounded flex-shrink-0"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {highlightSearchTerm(tag, searchQuery)}
                </span>
              ))}
              {displayTags.tags.length > 2 && (
                <span className="inline-flex items-center px-1.5 py-0.5 text-neutral-400 text-2xs flex-shrink-0">
                  +{displayTags.tags.length - 2}
                </span>
              )}
            </div>
          ) : (
            <div className="h-full" />
          )}
        </div>

        {/* Footer: Stats + Meta - 精简分隔线和间距 */}
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Language */}
              {repository.language && (
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getLanguageColor(repository.language) }}
                  />
                  <span className="text-2xs">{repository.language}</span>
                </div>
              )}
              {/* Stars */}
              <div className="flex items-center gap-1 text-neutral-500">
                <Star className="w-3 h-3" />
                <span className="text-2xs tabular-nums">{formatNumber(repository.stargazers_count)}</span>
              </div>
            </div>

            {/* AI Status - 更简洁 */}
            <div className="flex items-center">
              {repository.analysis_failed ? (
                <button
                  onClick={handleAIAnalyze}
                  disabled={isLoading}
                  className="p-1 rounded text-red-500 hover:bg-red-50 transition-colors"
                  title={t('分析失败，点击重试', 'Analysis failed, click to retry')}
                >
                  <AlertCircle className="w-4 h-4" />
                </button>
              ) : repository.analyzed_at ? (
                <button
                  onClick={handleAIAnalyze}
                  disabled={isLoading}
                  className="p-1 rounded text-emerald-500 hover:bg-emerald-50 transition-colors"
                  title={t('已分析，点击重新分析', 'Analyzed, click to re-analyze')}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleAIAnalyze}
                  disabled={isLoading}
                  className="p-1 rounded text-neutral-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  title={t('AI分析', 'AI Analyze')}
                >
                  <Bot className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Update Time - 更小的字号 */}
          <div className="flex items-center gap-1 mt-2 text-2xs text-text-tertiary">
            <Calendar className="w-3 h-3" />
            <span>
              {formatDistanceToNow(new Date(repository.pushed_at || repository.updated_at), { addSuffix: true })}
            </span>
            {repository.last_edited && (
              <span className="ml-1 text-amber-600">
                • {t('已编辑', 'edited')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <RepositoryEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        repository={repository}
      />

      {/* Tooltip - Portal to body，避免被虚拟列表裁剪 */}
      {isTextTruncated && showTooltip && (
        <TooltipPortal
          cardRef={cardRef}
          onClose={() => setShowTooltip(false)}
        >
          <div className="whitespace-pre-wrap break-words">
            {highlightSearchTerm(displayContent.content, searchQuery)}
          </div>
        </TooltipPortal>
      )}
    </>
  );
};

// Tooltip Portal 组件 - 渲染到 body，避免被父容器裁剪
interface TooltipPortalProps {
  cardRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  onClose: () => void;
}

const TooltipPortal: React.FC<TooltipPortalProps> = ({ cardRef, children, onClose }) => {
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const tooltipWidth = Math.min(rect.width, 400); // 最大宽度 400px
        const left = rect.left + (rect.width - tooltipWidth) / 2; // 水平居中
        setPosition({
          top: rect.top - 8, // 卡片上方 8px
          left,
          width: tooltipWidth,
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [cardRef]);

  if (!position) return null;

  return createPortal(
    <div
      className="fixed z-[9999] p-4 bg-surface-elevated text-text-primary text-sm rounded-xl shadow-2xl border border-border max-h-48 overflow-y-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        transform: 'translateY(-100%)',
      }}
      onMouseEnter={() => {}} // 保持显示
      onMouseLeave={onClose}
    >
      {children}
    </div>,
    document.body
  );
};

// React.memo 优化 - 自定义比较函数
const areEqual = (prevProps: RepositoryCardProps, nextProps: RepositoryCardProps): boolean => {
  const prev = prevProps.repository;
  const next = nextProps.repository;

  return (
    prev.id === next.id &&
    prev.analyzed_at === next.analyzed_at &&
    prev.analysis_failed === next.analysis_failed &&
    prev.ai_summary === next.ai_summary &&
    prev.ai_tags?.join(',') === next.ai_tags?.join(',') &&
    prev.custom_description === next.custom_description &&
    prev.custom_tags?.join(',') === next.custom_tags?.join(',') &&
    prev.last_edited === next.last_edited &&
    prev.stargazers_count === next.stargazers_count &&
    prev.pushed_at === next.pushed_at &&
    prevProps.showAISummary === nextProps.showAISummary &&
    prevProps.searchQuery === nextProps.searchQuery
  );
};

export const RepositoryCard = React.memo(RepositoryCardInner, areEqual);
export default RepositoryCard;
