import React, { useState } from 'react';
import {
  Bot, Cloud, Server, Globe, Moon, Sun,
  ChevronRight
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Card, Button } from '../../design-system/components';
import { useTheme } from '../../design-system/hooks/useTheme';
import { cn } from '../../design-system/utils/cn';
import { AISection } from './AISection';
import { WebDAVSection } from './WebDAVSection';
import { BackendSection } from './BackendSection';

export const SettingsPanel: React.FC = () => {
  const {
    language,
    setLanguage,
  } = useAppStore();

  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const t = (zh: string, en: string) => language === 'zh' ? zh : en;

  const sections = [
    {
      id: 'ai',
      icon: Bot,
      title: t('AI 服务配置', 'AI Services'),
      description: t('配置 OpenAI、Claude 等 AI 服务', 'Configure OpenAI, Claude, and other AI services'),
    },
    {
      id: 'webdav',
      icon: Cloud,
      title: t('WebDAV 备份', 'WebDAV Backup'),
      description: t('配置坚果云、Nextcloud 等备份服务', 'Configure Jianguoyun, Nextcloud backup services'),
    },
    {
      id: 'backend',
      icon: Server,
      title: t('后端服务器', 'Backend Server'),
      description: t('配置跨设备同步后端', 'Configure cross-device sync backend'),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            {t('设置', 'Settings')}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {t('管理您的应用配置和服务连接', 'Manage your app configuration and service connections')}
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={toggleTheme}
          leftIcon={theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        >
          {theme === 'dark' ? t('亮色', 'Light') : t('暗色', 'Dark')}
        </Button>
      </div>

      {/* Quick Settings */}
      <Card padding="md">
        <h3 className="text-sm font-medium text-text-primary mb-4">
          {t('快速设置', 'Quick Settings')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Language */}
          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
                <Globe className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-sm text-text-primary">{t('语言', 'Language')}</p>
                <p className="text-xs text-text-tertiary">
                  {language === 'zh' ? '简体中文' : 'English'}
                </p>
              </div>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'zh' | 'en')}
              className="px-2.5 py-1.5 bg-surface border border-border rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="zh">简体中文</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-neutral-600" /> : <Sun className="w-4 h-4 text-amber-500" />}
              </div>
              <div>
                <p className="font-medium text-sm text-text-primary">{t('主题', 'Theme')}</p>
                <p className="text-xs text-text-tertiary">
                  {theme === 'dark' ? t('暗色模式', 'Dark Mode') : t('亮色模式', 'Light Mode')}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleTheme}
            >
              {t('切换', 'Switch')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Settings Sections */}
      <div className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <div key={section.id}>
              <Card
                isInteractive
                onClick={() => setActiveSection(isActive ? null : section.id)}
                padding="md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-neutral-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-text-primary">{section.title}</h3>
                      <p className="text-xs text-text-secondary">{section.description}</p>
                    </div>
                  </div>

                  <ChevronRight className={cn(
                    'w-4 h-4 text-text-tertiary transition-transform duration-150',
                    isActive && 'rotate-90'
                  )} />
                </div>
              </Card>

              {isActive && (
                <div className="overflow-hidden">
                  <div className="pt-3 px-1">
                    {section.id === 'ai' && <AISection />}
                    {section.id === 'webdav' && <WebDAVSection />}
                    {section.id === 'backend' && <BackendSection />}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Re-export sections
export { AISection, WebDAVSection, BackendSection };
