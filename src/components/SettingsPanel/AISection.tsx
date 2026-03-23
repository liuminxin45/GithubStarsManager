import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Plus, Edit3, Trash2, CheckCircle, Plug, ToggleLeft, ToggleRight
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AIService } from '../../services/aiService';
import { Card, Button, Badge, Input, Select } from '../../design-system/components';
import { Spinner } from '../../design-system/components/Spinner/Spinner';
import { useToast } from '../../design-system/hooks/useToast';
import { cn } from '../../design-system/utils/cn';

const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', defaultUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-3.5-turbo' },
  { value: 'claude', label: 'Anthropic Claude', defaultUrl: 'https://api.anthropic.com/v1', defaultModel: 'claude-3-sonnet' },
  { value: 'gemini', label: 'Google Gemini', defaultUrl: 'https://generativelanguage.googleapis.com/v1', defaultModel: 'gemini-pro' },
  { value: 'openai-responses', label: 'OpenAI (Responses API)', defaultUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4' },
];

export const AISection: React.FC = () => {
  const {
    aiConfigs,
    activeAIConfig,
    language,
    addAIConfig,
    updateAIConfig,
    deleteAIConfig,
    setActiveAIConfig,
  } = useAppStore();

  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    apiType: 'openai' as const,
    baseUrl: '',
    apiKey: '',
    model: '',
    concurrency: 1,
    useCustomPrompt: false,
    customPrompt: '',
  });

  const t = (zh: string, en: string) => language === 'zh' ? zh : en;

  const resetForm = () => {
    setForm({
      name: '',
      apiType: 'openai',
      baseUrl: '',
      apiKey: '',
      model: '',
      concurrency: 1,
      useCustomPrompt: false,
      customPrompt: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.name || !form.baseUrl || !form.apiKey || !form.model) {
      addToast({
        variant: 'error',
        title: t('请填写所有必填字段', 'Please fill in all required fields'),
      });
      return;
    }

    if (form.useCustomPrompt && !form.customPrompt.trim()) {
      addToast({
        variant: 'error',
        title: t('请填写自定义 Prompt', 'Please fill in the custom prompt'),
        description: t('启用自定义 Prompt 后不能为空', 'Custom prompt cannot be empty when enabled'),
      });
      return;
    }

    const config = {
      id: editingId || Date.now().toString(),
      name: form.name,
      apiType: form.apiType,
      baseUrl: form.baseUrl.replace(/\/$/, ''),
      apiKey: form.apiKey,
      model: form.model,
      isActive: false,
      concurrency: form.concurrency,
      useCustomPrompt: form.useCustomPrompt,
      customPrompt: form.customPrompt.trim(),
    };

    if (editingId) {
      updateAIConfig(editingId, config);
      addToast({ variant: 'success', title: t('配置已更新', 'Configuration updated') });
    } else {
      addAIConfig(config);
      addToast({ variant: 'success', title: t('配置已添加', 'Configuration added') });
    }

    resetForm();
  };

  const handleEdit = (config: typeof aiConfigs[0]) => {
    setForm({
      name: config.name,
      apiType: config.apiType || 'openai',
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      concurrency: config.concurrency || 1,
      useCustomPrompt: !!config.useCustomPrompt,
      customPrompt: config.customPrompt || '',
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleTest = async (config: typeof aiConfigs[0]) => {
    setTestingId(config.id);
    try {
      const aiService = new AIService(config, language);
      const isConnected = await aiService.testConnection();

      if (isConnected) {
        addToast({
          variant: 'success',
          title: t('连接成功', 'Connection successful'),
          description: `${config.name} ${t('服务连接正常', 'service is working')}`,
        });
      } else {
        addToast({
          variant: 'error',
          title: t('连接失败', 'Connection failed'),
          description: t('请检查配置信息', 'Please check your configuration'),
        });
      }
    } catch {
      addToast({
        variant: 'error',
        title: t('测试失败', 'Test failed'),
        description: t('请检查网络连接', 'Please check your network connection'),
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleProviderChange = (provider: string) => {
    const selected = AI_PROVIDERS.find(p => p.value === provider);
    if (selected) {
      setForm(prev => ({
        ...prev,
        apiType: provider as typeof form.apiType,
        baseUrl: selected.defaultUrl,
        model: selected.defaultModel,
      }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Config List */}
      <div className="space-y-3">
        {aiConfigs.map((config) => (
          <Card
            key={config.id}
            padding="md"
            className={cn(
              'relative',
              activeAIConfig === config.id && 'border-border-strong ring-1 ring-border-strong'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  activeAIConfig === config.id ? 'bg-neutral-100' : 'bg-surface-sunken'
                )}>
                  {activeAIConfig === config.id ? (
                    <CheckCircle className="w-5 h-5 text-neutral-900" />
                  ) : (
                    <Bot className="w-5 h-5 text-text-tertiary" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{config.name}</span>
                    {activeAIConfig === config.id && (
                      <Badge variant="secondary" size="sm">{t('当前使用', 'Active')}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary">{config.model}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveAIConfig(activeAIConfig === config.id ? null : config.id)}
                  className={cn(
                    '!px-2',
                    activeAIConfig === config.id && 'text-text-primary'
                  )}
                  title={activeAIConfig === config.id ? t('已启用', 'Enabled') : t('启用服务', 'Enable service')}
                >
                  {activeAIConfig === config.id ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTest(config)}
                  disabled={testingId === config.id}
                  className="!px-2"
                >
                  {testingId === config.id ? (
                    <Spinner size="sm" />
                  ) : (
                    <Plug className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(config)}
                  className="!px-2"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteAIConfig(config.id)}
                  className="!px-2 text-error-600 hover:text-error-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {aiConfigs.length === 0 && (
          <Card padding="lg" className="bg-surface-sunken border-border-subtle">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100">
                <Bot className="w-6 h-6 text-text-tertiary" />
              </div>
              <h4 className="mt-4 text-sm font-medium text-text-primary">
                {t('还没有 AI 配置', 'No AI configurations yet')}
              </h4>
              <p className="mt-1 text-xs text-text-tertiary mb-4">
                {t('添加 AI 配置以启用智能分析功能', 'Add AI configuration to enable intelligent analysis')}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowForm(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {t('添加 AI 配置', 'Add AI Configuration')}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Add Button */}
      {!showForm && (
        <Button
          variant="secondary"
          onClick={() => setShowForm(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="w-full"
        >
          {t('添加 AI 配置', 'Add AI Configuration')}
        </Button>
      )}

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <Card padding="lg" className="border-border">
              <h4 className="font-semibold text-text-primary mb-4">
                {editingId ? t('编辑 AI 配置', 'Edit AI Configuration') : t('添加 AI 配置', 'Add AI Configuration')}
              </h4>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('配置名称', 'Configuration Name')}
                    placeholder={t('例如: OpenAI GPT-4', 'e.g., OpenAI GPT-4')}
                    value={form.name}
                    onChange={(v) => setForm({ ...form, name: v })}
                  />

                  <Select
                    label={t('服务提供商', 'Provider')}
                    value={form.apiType}
                    onChange={handleProviderChange}
                    options={AI_PROVIDERS.map((provider) => ({
                      value: provider.value,
                      label: provider.label,
                    }))}
                  />
                </div>

                <Input
                  label={t('API 地址', 'API URL')}
                  placeholder="https://api.openai.com/v1"
                  value={form.baseUrl}
                  onChange={(v) => setForm({ ...form, baseUrl: v })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('API Key', 'API Key')}
                    type="password"
                    placeholder="sk-..."
                    value={form.apiKey}
                    onChange={(v) => setForm({ ...form, apiKey: v })}
                  />

                  <Input
                    label={t('模型', 'Model')}
                    placeholder="gpt-3.5-turbo"
                    value={form.model}
                    onChange={(v) => setForm({ ...form, model: v })}
                  />
                </div>

                <Card padding="md" className="bg-surface-sunken border-border-subtle">
                  <Input
                    label={t('并发数', 'Concurrency')}
                    type="number"
                    value={String(form.concurrency)}
                    helperText={t('同时分析的仓库数量，范围 1-10', 'Number of repositories to analyze simultaneously, range 1-10')}
                    onChange={(value) => {
                      const parsed = Number(value);
                      setForm({
                        ...form,
                        concurrency: Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(10, parsed)),
                      });
                    }}
                    min="1"
                    max="10"
                  />
                </Card>

                <Card padding="md" className="bg-surface-sunken border-border-subtle">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {t('自定义 Prompt', 'Custom Prompt')}
                      </p>
                      <p className="mt-1 text-xs text-text-tertiary">
                        {t('开启后将完全替换内置仓库总结 Prompt', 'When enabled, this will fully replace the built-in repository summary prompt')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, useCustomPrompt: !form.useCustomPrompt })}
                      className={cn(
                        'flex-shrink-0 text-text-tertiary transition-colors hover:text-text-primary',
                        form.useCustomPrompt && 'text-text-primary'
                      )}
                      title={form.useCustomPrompt ? t('已启用自定义 Prompt', 'Custom prompt enabled') : t('启用自定义 Prompt', 'Enable custom prompt')}
                    >
                      {form.useCustomPrompt ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </div>

                  {form.useCustomPrompt && (
                    <div className="mt-4 space-y-3">
                      <textarea
                        value={form.customPrompt}
                        onChange={(e) => setForm({ ...form, customPrompt: e.target.value })}
                        placeholder={t(
                          '输入自定义 Prompt，可使用 {REPO_INFO}、{CATEGORIES_INFO}、{LANGUAGE} 占位符',
                          'Enter a custom prompt. You can use {REPO_INFO}, {CATEGORIES_INFO}, and {LANGUAGE} placeholders'
                        )}
                        rows={10}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-strong focus:outline-none"
                      />
                      <p className="text-xs text-text-tertiary">
                        {t(
                          '可用占位符：{REPO_INFO} 仓库信息，{CATEGORIES_INFO} 分类信息，{LANGUAGE} 当前语言。不写占位符时，系统也会自动补充基础仓库信息。',
                          'Available placeholders: {REPO_INFO} for repository info, {CATEGORIES_INFO} for category info, and {LANGUAGE} for current language. If you omit them, the app will still append basic repository context automatically.'
                        )}
                      </p>
                    </div>
                  )}
                </Card>

                <div className="flex items-center gap-3 pt-2">
                  <Button variant="secondary" onClick={handleSave}>
                    {editingId ? t('保存修改', 'Save Changes') : t('添加配置', 'Add Configuration')}
                  </Button>
                  <Button variant="ghost" onClick={resetForm}>
                    {t('取消', 'Cancel')}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
