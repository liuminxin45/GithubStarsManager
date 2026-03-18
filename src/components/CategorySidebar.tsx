import React, { useState, useRef, useEffect } from 'react';
import {
  Folder, Plus, Edit3, Hash
} from 'lucide-react';
import { Repository, Category } from '../types';
import { useAppStore, getAllCategories } from '../store/useAppStore';
import { CategoryEditModal } from './CategoryEditModal';
import { Button } from '../design-system/components';
import { cn } from '../design-system/utils/cn';

interface CategorySidebarProps {
  repositories: Repository[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

/**
 * CategorySidebar - 精简的分类侧边栏
 *
 * 设计原则：
 * - 简洁的分类列表
 * - 清晰的选中状态
 * - 克制的交互反馈
 */
export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  repositories,
  selectedCategory,
  onCategorySelect
}) => {
  const {
    customCategories,
    language
  } = useAppStore();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const allCategories = getAllCategories(customCategories, language);

  const getCategoryCount = (category: Category) => {
    if (category.id === 'all') return repositories.length;

    return repositories.filter(repo => {
      if (repo.custom_category === category.name) {
        return true;
      }

      if (repo.ai_tags && repo.ai_tags.length > 0) {
        return repo.ai_tags.some(tag =>
          category.keywords.some(keyword =>
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

      return category.keywords.some(keyword =>
        repoText.includes(keyword.toLowerCase())
      );
    }).length;
  };

  const handleAddCategory = () => {
    setIsCreatingCategory(true);
    setEditingCategory(null);
    setEditModalOpen(true);
  };

  const handleEditCategory = (category: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCreatingCategory(false);
    setEditingCategory(category);
    setEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditModalOpen(false);
    setEditingCategory(null);
    setIsCreatingCategory(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < allCategories.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(allCategories.length - 1);
        break;
      case 'Enter':
        if (focusedIndex >= 0) {
          onCategorySelect(allCategories[focusedIndex].id);
        }
        break;
    }
  };

  useEffect(() => {
    if (focusedIndex >= 0 && containerRef.current) {
      const buttons = containerRef.current.querySelectorAll('button[data-category-item]');
      buttons[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  const t = (zh: string, en: string) => language === 'zh' ? zh : en;

  return (
    <>
      <aside className="w-full lg:w-48 lg:flex-shrink-0 lg:h-[calc(100vh-6rem)] lg:sticky lg:top-20 lg:overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-text-tertiary" />
            <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
              {t('分类', 'Categories')}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddCategory}
            className="!px-1 !py-0.5 h-auto text-text-tertiary hover:text-text-primary"
            title={t('添加分类', 'Add Category')}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Category List */}
        <div
          ref={containerRef}
          className="flex gap-1 overflow-x-auto pb-2 lg:block lg:space-y-0.5 lg:overflow-visible lg:pb-0"
          role="listbox"
          aria-label={t('分类列表', 'Category list')}
          onKeyDown={handleKeyDown}
        >
          {allCategories.map((category, index) => {
            const count = getCategoryCount(category);
            const isSelected = selectedCategory === category.id;

            return (
              <div
                key={category.id}
                className="shrink-0 lg:shrink"
              >
                <button
                  data-category-item
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={focusedIndex === index ? 0 : -1}
                  onClick={() => {
                    onCategorySelect(category.id);
                    setFocusedIndex(index);
                  }}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={cn(
                    'group flex min-w-[100px] items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors duration-fast lg:w-full',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20',
                    isSelected
                      ? 'bg-neutral-100 text-text-primary'
                      : 'text-text-secondary hover:bg-neutral-50 hover:text-text-primary'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm flex-shrink-0">{category.icon}</span>
                    <span className="text-sm truncate">{category.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      'text-xs tabular-nums transition-colors',
                      isSelected ? 'text-text-primary' : 'text-text-tertiary'
                    )}>
                      {count}
                    </span>

                    {category.id !== 'all' && category.isCustom && (
                      <button
                        onClick={(e) => handleEditCategory(category, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-neutral-200"
                        title={t('编辑', 'Edit')}
                      >
                        <Edit3 className="w-3 h-3 text-text-tertiary" />
                      </button>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Custom Categories Summary */}
        {customCategories.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border-subtle px-1">
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
              <Hash className="w-3 h-3" />
              <span>
                {customCategories.length} {t('自定义', 'custom')}
              </span>
            </div>
          </div>
        )}
      </aside>

      <CategoryEditModal
        isOpen={editModalOpen}
        onClose={handleCloseModal}
        category={editingCategory}
        isCreating={isCreatingCategory}
      />
    </>
  );
};

export default CategorySidebar;
