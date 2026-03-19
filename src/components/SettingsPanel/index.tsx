import React, { useState } from 'react';
import {
  Bot,
  ChevronRight,
  Cloud,
  Globe,
  Moon,
  Server,
  Sun,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Button, Card } from '../../design-system/components';
import { useTheme } from '../../design-system/hooks/useTheme';
import { cn } from '../../design-system/utils/cn';
import { AISection } from './AISection';
import { WebDAVSection } from './WebDAVSection';
import { BackendSection } from './BackendSection';

type SectionId = 'ai' | 'webdav' | 'backend';

export const SettingsPanel: React.FC = () => {
  const {
    aiConfigs,
    webdavConfigs,
    backendApiSecret,
    language,
    repositories,
    setLanguage,
  } = useAppStore();

  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<SectionId>('ai');

  const t = (zh: string, en: string) => language === 'zh' ? zh : en;

  const sections = [
    {
      id: 'ai' as const,
      icon: Bot,
      title: t('AI 服务', 'AI Services'),
      count: aiConfigs.length,
    },
    {
      id: 'webdav' as const,
      icon: Cloud,
      title: t('WebDAV 备份', 'WebDAV Backup'),
      count: webdavConfigs.length,
    },
    {
      id: 'backend' as const,
      icon: Server,
      title: t('后端同步', 'Backend Sync'),
      count: backendApiSecret ? 1 : 0,
    },
  ];

  const activeSectionData = sections.find(section => section.id === activeSection) ?? sections[0];

  const overviewCards = [
    {
      label: t('AI 配置', 'AI Configs'),
      value: aiConfigs.length,
    },
    {
      label: t('备份配置', 'Backup Profiles'),
      value: webdavConfigs.length,
    },
    {
      label: t('已收藏仓库', 'Starred Repos'),
      value: repositories.length,
    },
  ];

  const renderSection = () => {
    if (activeSection === 'ai') return <AISection />;
    if (activeSection === 'webdav') return <WebDAVSection />;
    return <BackendSection />;
  };

  return (
    <div className="h-full">
      <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 min-h-full">
        <aside className="w-full lg:w-64 lg:flex-shrink-0 lg:h-[calc(100vh-6rem)] lg:sticky lg:top-20 lg:overflow-y-auto">
          <Card padding="md" className="mb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-text-primary">
                  {t('设置', 'Settings')}
                </h1>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="flex-shrink-0"
                title={t('切换主题', 'Toggle theme')}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLanguage('zh')}
                className={cn(
                  'rounded-md border px-2.5 py-2 text-left text-xs transition-colors',
                  language === 'zh'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-border bg-surface text-text-secondary hover:text-text-primary'
                )}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" />
                  <span className="font-medium">简体中文</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={cn(
                  'rounded-md border px-2.5 py-2 text-left text-xs transition-colors',
                  language === 'en'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-border bg-surface text-text-secondary hover:text-text-primary'
                )}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" />
                  <span className="font-medium">English</span>
                </div>
              </button>
            </div>
          </Card>

          <div className="mb-2 px-1">
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-text-tertiary" />
              <h3 className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                {t('配置分区', 'Sections')}
              </h3>
            </div>
          </div>

          <div className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeSection;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full rounded-lg border p-3 text-left transition-colors',
                    isActive
                      ? 'border-border-strong bg-surface'
                      : 'border-border bg-surface hover:border-border-strong'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-text-primary">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary">{section.title}</span>
                          <span className="text-xs text-text-tertiary">{section.count}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className={cn(
                        'w-4 h-4 flex-shrink-0 text-text-tertiary transition-transform',
                        isActive && 'translate-x-0.5 text-text-primary'
                      )}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col gap-3 lg:gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {overviewCards.map((card) => (
              <Card key={card.label} padding="sm" className="min-h-[92px]">
                <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  {card.label}
                </p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-xl font-semibold text-text-primary">
                    {card.value}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          <Card padding="md" className="overflow-hidden">
            <div className="border-b border-border-subtle pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-text-primary">
                      <activeSectionData.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-text-primary">
                        {activeSectionData.title}
                      </h2>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              {renderSection()}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export { AISection, WebDAVSection, BackendSection };
