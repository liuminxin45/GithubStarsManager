import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Save, FolderOpen, Tag, Code2, Monitor, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { Modal, Button, Input, Badge, Card } from '../design-system/components';
import { useReducedMotion } from '../design-system/hooks/useReducedMotion';
import { useToast } from '../design-system/hooks/useToast';
import { cn } from '../design-system/utils/cn';
import { useAppStore } from '../store/useAppStore';
import { AssetFilter, FilterPreset, SearchFilters } from '../types';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filter?: AssetFilter;
  onSave: (filter: AssetFilter) => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  filter,
  onSave
}) => {
  const { language, searchFilters, repositories, setSearchFilters } = useAppStore();
  const { addToast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState<FilterPreset[]>([]);
  const [activeTab, setActiveTab] = useState<'filters' | 'presets'>('filters');
  const [expandedSections, setExpandedSections] = useState<string[]>(['category', 'language']);

  // Load saved presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('github-stars-filter-presets');
    if (saved) {
      try {
        const presets = JSON.parse(saved);
        setSavedPresets(Array.isArray(presets) ? presets : []);
      } catch (error) {
        console.warn('Failed to load filter presets:', error);
      }
    }
  }, []);

  // Sync with current filter when modal opens
  useEffect(() => {
    if (filter) {
      setName(filter.name);
      setKeywords([...filter.keywords]);
    } else {
      setName('');
      setKeywords([]);
    }
    setNewKeyword('');
    setShowSavePreset(false);
    setPresetName('');
  }, [filter, isOpen]);

  // Extract available options from repositories
  const availableLanguages = [...new Set(repositories.map(r => r.language).filter(Boolean))];
  const availablePlatforms = [...new Set(repositories.flatMap(r => r.ai_platforms || []))];
  const availableTags = [...new Set([
    ...repositories.flatMap(r => r.ai_tags || []),
    ...repositories.flatMap(r => r.topics || [])
  ])];
  const availableCategories = [...new Set(repositories.map(r => r.custom_category || '未分类'))];

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim() || keywords.length === 0) {
      addToast({
        variant: 'error',
        title: language === 'zh' ? '请填写完整信息' : 'Please fill in all required fields',
        description: language === 'zh' ? '过滤器名称和关键词不能为空' : 'Filter name and keywords are required',
      });
      return;
    }

    const savedFilter: AssetFilter = {
      id: filter?.id || Date.now().toString(),
      name: name.trim(),
      keywords: keywords.filter(k => k.trim())
    };

    onSave(savedFilter);
    onClose();
    addToast({
      variant: 'success',
      title: language === 'zh' ? '过滤器已保存' : 'Filter saved',
      description: name.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleToggleFilter = (type: keyof SearchFilters, value: string) => {
    const current = (searchFilters[type] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    setSearchFilters({ [type]: updated });
  };

  const handleSaveAsPreset = () => {
    if (!presetName.trim()) {
      addToast({
        variant: 'error',
        title: language === 'zh' ? '请输入预设名称' : 'Please enter preset name',
      });
      return;
    }

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filters: {
        languages: searchFilters.languages || [],
        platforms: searchFilters.platforms || [],
        tags: searchFilters.tags || [],
        categories: searchFilters.categories || [],
        minStars: searchFilters.minStars,
        maxStars: searchFilters.maxStars,
      },
      createdAt: Date.now(),
    };

    const updated = [...savedPresets, newPreset];
    setSavedPresets(updated);
    localStorage.setItem('github-stars-filter-presets', JSON.stringify(updated));
    setPresetName('');
    setShowSavePreset(false);
    addToast({
      variant: 'success',
      title: language === 'zh' ? '预设已保存' : 'Preset saved',
      description: presetName.trim(),
    });
  };

  const handleLoadPreset = (preset: FilterPreset) => {
    setSearchFilters({
      languages: preset.filters.languages || [],
      platforms: preset.filters.platforms || [],
      tags: preset.filters.tags || [],
      categories: preset.filters.categories || [],
      minStars: preset.filters.minStars,
      maxStars: preset.filters.maxStars,
    });
    addToast({
      variant: 'success',
      title: language === 'zh' ? '预设已应用' : 'Preset applied',
      description: preset.name,
    });
  };

  const handleDeletePreset = (id: string) => {
    const updated = savedPresets.filter(p => p.id !== id);
    setSavedPresets(updated);
    localStorage.setItem('github-stars-filter-presets', JSON.stringify(updated));
    addToast({
      variant: 'info',
      title: language === 'zh' ? '预设已删除' : 'Preset deleted',
    });
  };

  const t = (zh: string, en: string) => language === 'zh' ? zh : en;

  const activeFiltersCount =
    (searchFilters.languages?.length || 0) +
    (searchFilters.platforms?.length || 0) +
    (searchFilters.tags?.length || 0) +
    (searchFilters.categories?.length || 0);

  const SectionHeader = ({ id, icon: Icon, title, count }: { id: string; icon: React.ComponentType<{ className?: string }>; title: string; count: number }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-3 bg-surface-sunken hover:bg-surface-overlay rounded-lg transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-text-secondary" />
        <span className="text-sm font-medium text-text-primary">{title}</span>
        {count > 0 && (
          <Badge variant="primary" size="sm">{count}</Badge>
        )}
      </div>
      {expandedSections.includes(id) ? (
        <ChevronDown className="w-4 h-4 text-text-tertiary" />
      ) : (
        <ChevronRight className="w-4 h-4 text-text-tertiary" />
      )}
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={filter ? t('编辑过滤器', 'Edit Filter') : t('新建过滤器', 'New Filter')}
      size="lg"
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-border-subtle pb-3">
          <button
            onClick={() => setActiveTab('filters')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              activeTab === 'filters'
                ? 'bg-primary-100 text-primary-700'
                : 'text-text-secondary hover:bg-surface-sunken'
            )}
          >
            {t('筛选条件', 'Filters')}
            {activeFiltersCount > 0 && (
              <span className="ml-2 bg-primary-500 text-white rounded-full px-1.5 py-0.5 text-xs">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              activeTab === 'presets'
                ? 'bg-primary-100 text-primary-700'
                : 'text-text-secondary hover:bg-surface-sunken'
            )}
          >
            {t('预设', 'Presets')}
            {savedPresets.length > 0 && (
              <span className="ml-2 text-text-tertiary">({savedPresets.length})</span>
            )}
          </button>
        </div>

        {/* Filters Tab */}
        {activeTab === 'filters' && (
          <div className="space-y-4">
            {/* Filter Name (for Asset Filter) */}
            {!filter && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  {t('过滤器名称', 'Filter Name')}
                </label>
                <Input
                  value={name}
                  onChange={setName}
                  placeholder={t('例如: macOS', 'e.g., macOS')}
                />
              </div>
            )}

            {/* Category Filter */}
            {availableCategories.length > 0 && (
              <div>
                <SectionHeader
                  id="category"
                  icon={FolderOpen}
                  title={t('分类', 'Category')}
                  count={searchFilters.categories?.length || 0}
                />
                <AnimatePresence>
                  {expandedSections.includes('category') && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-2 p-3 pt-2">
                        {availableCategories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => handleToggleFilter('categories', cat)}
                            className={cn(
                              'px-3 py-1.5 rounded-full text-sm transition-colors',
                              searchFilters.categories?.includes(cat)
                                ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500'
                                : 'bg-surface-sunken text-text-secondary hover:bg-surface-overlay'
                            )}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Language Filter */}
            {availableLanguages.length > 0 && (
              <div>
                <SectionHeader
                  id="language"
                  icon={Code2}
                  title={t('编程语言', 'Languages')}
                  count={searchFilters.languages?.length || 0}
                />
                <AnimatePresence>
                  {expandedSections.includes('language') && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-2 p-3 pt-2">
                        {availableLanguages.slice(0, 12).map(lang => (
                          <button
                            key={lang}
                            onClick={() => handleToggleFilter('languages', lang)}
                            className={cn(
                              'px-3 py-1.5 rounded-full text-sm transition-colors',
                              searchFilters.languages?.includes(lang)
                                ? 'bg-secondary-100 text-secondary-700 ring-2 ring-secondary-500'
                                : 'bg-surface-sunken text-text-secondary hover:bg-surface-overlay'
                            )}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Platform Filter */}
            {availablePlatforms.length > 0 && (
              <div>
                <SectionHeader
                  id="platform"
                  icon={Monitor}
                  title={t('支持平台', 'Platforms')}
                  count={searchFilters.platforms?.length || 0}
                />
                <AnimatePresence>
                  {expandedSections.includes('platform') && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-2 p-3 pt-2">
                        {availablePlatforms.map(platform => (
                          <button
                            key={platform}
                            onClick={() => handleToggleFilter('platforms', platform)}
                            className={cn(
                              'px-3 py-1.5 rounded-full text-sm transition-colors',
                              searchFilters.platforms?.includes(platform)
                                ? 'bg-success-100 text-success-700 ring-2 ring-success-500'
                                : 'bg-surface-sunken text-text-secondary hover:bg-surface-overlay'
                            )}
                          >
                            {platform}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <div>
                <SectionHeader
                  id="tags"
                  icon={Tag}
                  title={t('标签', 'Tags')}
                  count={searchFilters.tags?.length || 0}
                />
                <AnimatePresence>
                  {expandedSections.includes('tags') && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-2 p-3 pt-2">
                        {availableTags.slice(0, 15).map(tag => (
                          <button
                            key={tag}
                            onClick={() => handleToggleFilter('tags', tag)}
                            className={cn(
                              'px-3 py-1.5 rounded-full text-sm transition-colors',
                              searchFilters.tags?.includes(tag)
                                ? 'bg-warning-100 text-warning-700 ring-2 ring-warning-500'
                                : 'bg-surface-sunken text-text-secondary hover:bg-surface-overlay'
                            )}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Star Count Filter */}
            <div>
              <SectionHeader
                id="stars"
                icon={Star}
                title={t('星标数量', 'Star Count')}
                count={(searchFilters.minStars || searchFilters.maxStars) ? 1 : 0}
              />
              <AnimatePresence>
                {expandedSections.includes('stars') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 pt-2 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-text-secondary mb-1 block">
                            {t('最小星标', 'Min Stars')}
                          </label>
                          <Input
                            type="number"
                            value={searchFilters.minStars?.toString() || ''}
                            onChange={(v) => setSearchFilters({ minStars: v ? parseInt(v) : undefined })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-text-secondary mb-1 block">
                            {t('最大星标', 'Max Stars')}
                          </label>
                          <Input
                            type="number"
                            value={searchFilters.maxStars?.toString() || ''}
                            onChange={(v) => setSearchFilters({ maxStars: v ? parseInt(v) : undefined })}
                            placeholder="∞"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Keywords for Asset Filter */}
            {!filter && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  {t('匹配关键词', 'Matching Keywords')}
                </label>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={newKeyword}
                    onChange={setNewKeyword}
                    onKeyDown={handleKeyPress}
                    placeholder={t('输入关键词，如: mac, dmg', 'Enter keywords, e.g., mac, dmg')}
                    leftIcon={<Tag className="w-4 h-4" />}
                  />
                  <Button
                    variant="secondary"
                    onClick={handleAddKeyword}
                    disabled={!newKeyword.trim()}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    {t('添加', 'Add')}
                  </Button>
                </div>

                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, index) => (
                      <Badge
                        key={index}
                        variant="neutral"
                        size="md"
                        className="cursor-pointer"
                        onClick={() => handleRemoveKeyword(index)}
                      >
                        {keyword} <X className="w-3 h-3 ml-1 inline" />
                      </Badge>
                    ))}
                  </div>
                )}

                {keywords.length === 0 && (
                  <p className="text-sm text-text-tertiary">
                    {t('请添加至少一个关键词用于匹配文件名', 'Please add at least one keyword to match file names')}
                  </p>
                )}
              </div>
            )}

            {/* Save as Preset */}
            {!showSavePreset ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSavePreset(true)}
                leftIcon={<Save className="w-4 h-4" />}
              >
                {t('保存为预设', 'Save as Preset')}
              </Button>
            ) : (
              <Card padding="md" variant="outlined">
                <div className="flex gap-2">
                  <Input
                    value={presetName}
                    onChange={setPresetName}
                    placeholder={t('预设名称', 'Preset name')}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveAsPreset}
                    disabled={!presetName.trim()}
                  >
                    {t('保存', 'Save')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowSavePreset(false);
                      setPresetName('');
                    }}
                  >
                    {t('取消', 'Cancel')}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Presets Tab */}
        {activeTab === 'presets' && (
          <div className="space-y-3">
            {savedPresets.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary">
                <Save className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('暂无保存的预设', 'No saved presets')}</p>
                <p className="text-sm mt-1">
                  {t('在"筛选条件"标签页中创建并保存预设', 'Create and save presets in the "Filters" tab')}
                </p>
              </div>
            ) : (
              savedPresets.map(preset => (
                <Card
                  key={preset.id}
                  padding="md"
                  isInteractive
                  className="group"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleLoadPreset(preset)}
                    >
                      <h4 className="font-medium text-text-primary">{preset.name}</h4>
                      <p className="text-sm text-text-tertiary">
                        {[
                          preset.filters.languages?.length && `${preset.filters.languages.length} ${t('语言', 'languages')}`,
                          preset.filters.tags?.length && `${preset.filters.tags.length} ${t('标签', 'tags')}`,
                          preset.filters.platforms?.length && `${preset.filters.platforms.length} ${t('平台', 'platforms')}`,
                        ].filter(Boolean).join(' · ') || t('无筛选条件', 'No filters')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLoadPreset(preset)}
                        leftIcon={<FolderOpen className="w-4 h-4" />}
                      >
                        {t('应用', 'Apply')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePreset(preset.id)}
                        leftIcon={<Trash2 className="w-4 h-4" />}
                      >
                        {t('删除', 'Delete')}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
          <Button variant="secondary" onClick={onClose}>
            {t('取消', 'Cancel')}
          </Button>
          {!filter && activeTab === 'filters' && (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!name.trim() || keywords.length === 0}
            >
              {filter ? t('保存', 'Save') : t('创建', 'Create')}
            </Button>
          )}
          {activeTab === 'filters' && activeFiltersCount > 0 && (
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                addToast({
                  variant: 'success',
                  title: t('过滤器已应用', 'Filters applied'),
                  description: `${activeFiltersCount} ${t('个筛选条件', 'filters')}`,
                });
              }}
            >
              {t('应用筛选', 'Apply Filters')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
