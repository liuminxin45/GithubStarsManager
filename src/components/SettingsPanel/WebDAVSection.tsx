import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud, Plus, Edit3, Trash2, CheckCircle,
  Upload, Download, HardDrive, Plug, ToggleLeft, ToggleRight
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { WebDAVService } from '../../services/webdavService';
import { Card, Button, Badge, Input } from '../../design-system/components';
import { Spinner } from '../../design-system/components/Spinner/Spinner';
import { useToast } from '../../design-system/hooks/useToast';
import { cn } from '../../design-system/utils/cn';
import { indexedDBStorage } from '../../services/indexedDbStorage';

export const WebDAVSection: React.FC = () => {
  const {
    webdavConfigs,
    activeWebDAVConfig,
    language,
    lastBackup,
    addWebDAVConfig,
    updateWebDAVConfig,
    deleteWebDAVConfig,
    setActiveWebDAVConfig,
    setLastBackup,
  } = useAppStore();

  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const [form, setForm] = useState({
    name: '',
    url: '',
    username: '',
    password: '',
    path: '/github-stars-manager',
  });

  const t = (zh: string, en: string) => language === 'zh' ? zh : en;
  const storeKey = 'github-stars-manager';

  const persistSnapshot = async (data: string) => {
    await indexedDBStorage.setItem(storeKey, data);
    await useAppStore.persist.rehydrate();
  };

  const readBackupSource = async () => {
    const persisted = await indexedDBStorage.getItem(storeKey);
    if (persisted) {
      return persisted;
    }

    const legacy = localStorage.getItem(storeKey);
    if (legacy) {
      return legacy;
    }

    throw new Error('No data to backup');
  };

  const resetForm = () => {
    setForm({
      name: '',
      url: '',
      username: '',
      password: '',
      path: '/github-stars-manager',
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = () => {
    const errors = WebDAVService.validateConfig(form);
    if (errors.length > 0) {
      addToast({
        variant: 'error',
        title: t('验证失败', 'Validation failed'),
        description: errors.join('\n'),
      });
      return;
    }

    const config = {
      id: editingId || Date.now().toString(),
      name: form.name,
      url: form.url.replace(/\/$/, ''),
      username: form.username,
      password: form.password,
      path: form.path,
      isActive: false,
    };

    if (editingId) {
      updateWebDAVConfig(editingId, config);
      addToast({ variant: 'success', title: t('配置已更新', 'Configuration updated') });
    } else {
      addWebDAVConfig(config);
      addToast({ variant: 'success', title: t('配置已添加', 'Configuration added') });
    }

    resetForm();
  };

  const handleEdit = (config: typeof webdavConfigs[0]) => {
    setForm({
      name: config.name,
      url: config.url,
      username: config.username,
      password: config.password,
      path: config.path,
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleTest = async (config: typeof webdavConfigs[0]) => {
    setTestingId(config.id);
    try {
      const success = await WebDAVService.testConnection(config);
      if (success) {
        addToast({
          variant: 'success',
          title: t('连接成功', 'Connection successful'),
          description: `${config.name} ${t('连接正常', 'is working')}`,
        });
      } else {
        throw new Error('Connection failed');
      }
    } catch {
      addToast({
        variant: 'error',
        title: t('连接失败', 'Connection failed'),
        description: t('请检查 WebDAV 配置', 'Please check WebDAV configuration'),
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleBackup = async () => {
    if (!activeWebDAVConfig) return;

    setIsBackingUp(true);
    try {
      const config = webdavConfigs.find(c => c.id === activeWebDAVConfig);
      if (!config) throw new Error('Config not found');

      const data = await readBackupSource();

      const success = await WebDAVService.uploadFile(
        config,
        'backup.json',
        data
      );

      if (success) {
        setLastBackup(new Date().toISOString());
        addToast({
          variant: 'success',
          title: t('备份成功', 'Backup successful'),
          description: t('数据已上传到 WebDAV', 'Data uploaded to WebDAV'),
        });
      } else {
        throw new Error('Backup failed');
      }
    } catch {
      addToast({
        variant: 'error',
        title: t('备份失败', 'Backup failed'),
        description: t('请检查 WebDAV 连接', 'Please check WebDAV connection'),
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!activeWebDAVConfig) return;
    if (!confirm(t('确定要恢复数据吗？当前数据将被覆盖。', 'Are you sure you want to restore? Current data will be overwritten.'))) {
      return;
    }

    setIsRestoring(true);
    try {
      const config = webdavConfigs.find(c => c.id === activeWebDAVConfig);
      if (!config) throw new Error('Config not found');

      const data = await WebDAVService.downloadFile(config, 'backup.json');
      if (!data) throw new Error('No backup found');

      await persistSnapshot(data);
      addToast({
        variant: 'success',
        title: t('恢复成功', 'Restore successful'),
        description: t('数据已从 WebDAV 恢复，请刷新页面', 'Data restored from WebDAV, please refresh'),
      });
    } catch {
      addToast({
        variant: 'error',
        title: t('恢复失败', 'Restore failed'),
        description: t('请检查 WebDAV 连接和备份文件', 'Please check WebDAV connection and backup file'),
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Config List */}
      <div className="space-y-3">
        {webdavConfigs.map((config) => (
          <Card
            key={config.id}
            padding="md"
            className={cn(
              'relative',
              activeWebDAVConfig === config.id && 'border-border-strong ring-1 ring-border-strong'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  activeWebDAVConfig === config.id ? 'bg-secondary-100' : 'bg-surface-sunken'
                )}>
                  {activeWebDAVConfig === config.id ? (
                    <CheckCircle className="w-5 h-5 text-secondary-600" />
                  ) : (
                    <Cloud className="w-5 h-5 text-text-tertiary" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{config.name}</span>
                    {activeWebDAVConfig === config.id && (
                      <Badge variant="secondary" size="sm">{t('当前使用', 'Active')}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary">{config.url}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveWebDAVConfig(activeWebDAVConfig === config.id ? null : config.id)}
                  className={cn(
                    '!px-2',
                    activeWebDAVConfig === config.id && 'text-text-primary'
                  )}
                  title={activeWebDAVConfig === config.id ? t('已启用', 'Enabled') : t('启用服务', 'Enable service')}
                >
                  {activeWebDAVConfig === config.id ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
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
                  onClick={() => deleteWebDAVConfig(config.id)}
                  className="!px-2 text-error-600 hover:text-error-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {webdavConfigs.length === 0 && (
          <Card padding="lg" className="bg-surface-sunken border-border-subtle">
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-100">
                <Cloud className="w-5 h-5 text-text-tertiary" />
              </div>
              <h4 className="mt-4 text-sm font-medium text-text-primary">
                {t('还没有 WebDAV 配置', 'No WebDAV configurations yet')}
              </h4>
            </div>
          </Card>
        )}
      </div>

      {/* Backup/Restore Actions */}
      {activeWebDAVConfig && (
        <Card padding="lg" className="border-secondary-200">
          <h4 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            {t('备份与恢复', 'Backup & Restore')}
          </h4>

          {lastBackup && (
            <p className="text-sm text-text-secondary mb-4">
              {t('上次备份:', 'Last backup:')} {new Date(lastBackup).toLocaleString()}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-surface-sunken p-4">
              <div className="flex items-center gap-3 mb-3">
                <Upload className="w-4 h-4 text-secondary-600" />
                <span className="text-sm font-medium text-text-primary">
                  {t('备份到云端', 'Backup to cloud')}
                </span>
              </div>
              <Button
                variant="secondary"
                onClick={handleBackup}
                disabled={isBackingUp}
                leftIcon={isBackingUp ? <Spinner size="sm" /> : <Upload className="w-4 h-4" />}
                className="w-full"
              >
                {isBackingUp ? t('备份中...', 'Backing up...') : t('备份数据', 'Backup')}
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-surface-sunken p-4">
              <div className="flex items-center gap-3 mb-3">
                <Download className="w-4 h-4 text-secondary-600" />
                <span className="text-sm font-medium text-text-primary">
                  {t('从云端恢复', 'Restore from cloud')}
                </span>
              </div>
              <Button
                variant="secondary"
                onClick={handleRestore}
                disabled={isRestoring}
                leftIcon={isRestoring ? <Spinner size="sm" /> : <Download className="w-4 h-4" />}
                className="w-full"
              >
                {isRestoring ? t('恢复中...', 'Restoring...') : t('恢复数据', 'Restore')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Add Button */}
      {!showForm && (
        <Button
          variant="secondary"
          onClick={() => setShowForm(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="w-full"
        >
          {t('添加 WebDAV 配置', 'Add WebDAV Configuration')}
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
            <Card padding="lg" className="border-secondary-200">
              <h4 className="font-semibold text-text-primary mb-4">
                {editingId ? t('编辑 WebDAV 配置', 'Edit WebDAV Configuration') : t('添加 WebDAV 配置', 'Add WebDAV Configuration')}
              </h4>

              <div className="space-y-4">
                <Input
                  label={t('配置名称', 'Configuration Name')}
                  placeholder={t('例如: 坚果云', 'e.g., Jianguoyun')}
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                />

                <Input
                  label={t('WebDAV 地址', 'WebDAV URL')}
                  placeholder="https://dav.jianguoyun.com/dav/"
                  value={form.url}
                  onChange={(v) => setForm({ ...form, url: v })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('用户名', 'Username')}
                    placeholder="username"
                    value={form.username}
                    onChange={(v) => setForm({ ...form, username: v })}
                  />
                  <Input
                    label={t('密码', 'Password')}
                    type="password"
                    placeholder="password"
                    value={form.password}
                    onChange={(v) => setForm({ ...form, password: v })}
                  />
                </div>

                <Input
                  label={t('备份路径', 'Backup Path')}
                  placeholder="/github-stars-manager"
                  value={form.path}
                  onChange={(v) => setForm({ ...form, path: v })}
                />

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
