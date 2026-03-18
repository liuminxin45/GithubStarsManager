import { Search, Star, FolderOpen } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../design-system/components';

interface EmptyStateProps {
  type?: 'search' | 'category' | 'default';
  query?: string;
  categoryName?: string;
}

/**
 * EmptyState - 精简的空状态组件
 */
export function EmptyState({ type = 'default', query, categoryName }: EmptyStateProps) {
  const { language } = useAppStore();
  const t = (zh: string, en: string) => language === 'zh' ? zh : en;

  const configs = {
    search: {
      icon: Search,
      title: t('未找到相关仓库', 'No repositories found'),
      description: query
        ? t(`未找到与 "${query}" 相关的仓库。`, `No repositories found for "${query}".`)
        : t('尝试使用不同的关键词搜索。', 'Try different search keywords.'),
      suggestions: [
        t('尝试使用不同的关键词', 'Try different keywords'),
        t('使用AI搜索进行语义匹配', 'Use AI search for semantic matching'),
        t('检查拼写或尝试英文/中文关键词', 'Check spelling or try English/Chinese keywords'),
      ],
    },
    category: {
      icon: FolderOpen,
      title: t('该分类暂无仓库', 'No repositories in this category'),
      description: categoryName
        ? t(`在 "${categoryName}" 分类中未找到仓库。`, `No repositories found in "${categoryName}" category.`)
        : t('该分类暂无仓库。', 'No repositories in this category.'),
      suggestions: [
        t('尝试选择其他分类', 'Try a different category'),
        t('为仓库添加自定义分类', 'Add custom category to repositories'),
        t('使用AI分析自动分类', 'Use AI analysis for automatic categorization'),
      ],
    },
    default: {
      icon: Star,
      title: t('暂无仓库', 'No repositories yet'),
      description: t('您的星标仓库列表为空。', 'Your starred repository list is empty.'),
      suggestions: [
        t('点击同步按钮加载您的 GitHub 星标仓库', 'Click sync to load your GitHub starred repositories'),
        t('确保您已登录并授权访问', 'Make sure you are logged in and authorized'),
      ],
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-center py-12">
      <Card padding="lg" className="max-w-md text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-neutral-100 flex items-center justify-center">
          <Icon className="w-7 h-7 text-neutral-400" />
        </div>

        <h3 className="text-base font-semibold text-text-primary mb-1">
          {config.title}
        </h3>

        <p className="text-sm text-text-secondary mb-5">
          {config.description}
        </p>

        <div className="text-left bg-neutral-50 rounded-lg p-4">
          <p className="text-xs font-medium text-text-tertiary mb-2 uppercase tracking-wide">
            {t('建议：', 'Suggestions:')}
          </p>
          <ul className="space-y-1.5">
            {config.suggestions.map((suggestion, index) => (
              <li key={index} className="text-sm text-text-secondary flex items-start gap-2">
                <span className="text-primary-600 mt-1">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
