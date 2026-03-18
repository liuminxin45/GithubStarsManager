import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Plus, Edit3, Trash2, CheckCircle,
  Sparkles
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AIService } from '../../services/aiService';
import { Card, Button, Badge, Input } from '../../design-system/components';
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

    const config = {
      id: editingId || Date.now().toString(),
      name: form.name,
      apiType: form.apiType,
      baseUrl: form.baseUrl.replace(/\/$/, ''),
      apiKey: form.apiKey,
      model: form.model,
      isActive: false,
      concurrency: form.concurrency,
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
              activeAIConfig === config.id && 'border-primary-500 ring-1 ring-primary-500'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  activeAIConfig === config.id ? 'bg-primary-100' : 'bg-surface-sunken'
                )}>
                  {activeAIConfig === config.id ? (
                    <CheckCircle className="w-5 h-5 text-primary-600" />
                  ) : (
                    <Bot className="w-5 h-5 text-text-tertiary" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{config.name}</span>
                    {activeAIConfig === config.id && (
                      <Badge variant="primary" size="sm">{t('当前使用', 'Active')}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary">{config.model}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={activeAIConfig === config.id ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setActiveAIConfig(activeAIConfig === config.id ? null : config.id)}
                >
                  {activeAIConfig === config.id ? t('使用中', 'Active') : t('启用', 'Activate')}
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
                    <Sparkles className="w-4 h-4" />
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
            <Card padding="lg" className="border-primary-200">
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

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      {t('服务提供商', 'Provider')}
                    </label>
                    <select
                      value={form.apiType}
                      onChange={(e) => handleProviderChange(e.target.value)}
                      className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {AI_PROVIDERS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
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

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    {t('并发数', 'Concurrency')}: {form.concurrency}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={form.concurrency}
                    onChange={(e) => setForm({ ...form, concurrency: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <p className="text-xs text-text-tertiary mt-1">
                    {t('同时分析的仓库数量', 'Number of repositories to analyze simultaneously')}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button variant="primary" onClick={handleSave}>
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
