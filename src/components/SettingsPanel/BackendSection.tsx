import React, { useState, useEffect } from 'react';
import {
  Shield, CheckCircle, AlertCircle,
  RefreshCw, Upload, Download
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { backend } from '../../services/backendAdapter';
import { Card, Button, Input } from '../../design-system/components';
import { Spinner } from '../../design-system/components/Spinner/Spinner';
import { useToast } from '../../design-system/hooks/useToast';
import { cn } from '../../design-system/utils/cn';

export const BackendSection: React.FC = () => {
  const {
    language,
    repositories,
    releases,
    customCategories,
    aiConfigs,
    webdavConfigs,
    backendApiSecret,
    setBackendApiSecret,
    setRepositories,
    setReleases,
    setAIConfigs,
    setWebDAVConfigs,
  } = useAppStore();

  const { addToast } = useToast();
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'checking'>('disconnected');
  const [health, setHealth] = useState<{ version: string; timestamp: string } | null>(null);
  const [secretInput, setSecretInput] = useState(backendApiSecret || '');
  const [isSyncingTo, setIsSyncingTo] = useState(false);
  const [isSyncingFrom, setIsSyncingFrom] = useState(false);

  const t = (zh: string, en: string) => language === 'zh' ? zh : en;

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setStatus('checking');
    const result = await backend.checkHealth();
    if (result) {
      setStatus('connected');
      setHealth({ version: result.version, timestamp: result.timestamp });
    } else {
      setStatus('disconnected');
      setHealth(null);
    }
  };

  const handleConnect = () => {
    setBackendApiSecret(secretInput);
    checkHealth();
  };

  const handleSyncToBackend = async () => {
    setIsSyncingTo(true);
    try {
      const success = await backend.syncToBackend({
        repositories,
        releases,
        customCategories,
        aiConfigs,
        webdavConfigs,
      });

      if (success) {
        addToast({
          variant: 'success',
          title: t('同步成功', 'Sync successful'),
          description: t('数据已上传到后端', 'Data uploaded to backend'),
        });
      } else {
        throw new Error('Sync failed');
      }
    } catch {
      addToast({
        variant: 'error',
        title: t('同步失败', 'Sync failed'),
        description: t('请检查后端的连接', 'Please check backend connection'),
      });
    } finally {
      setIsSyncingTo(false);
    }
  };

  const handleSyncFromBackend = async () => {
    if (!confirm(t('确定要从后端恢复数据吗？当前数据将被覆盖。', 'Are you sure you want to restore from backend? Current data will be overwritten.'))) {
      return;
    }

    setIsSyncingFrom(true);
    try {
      const data = await backend.syncFromBackend();

      if (data) {
        if (data.repositories) setRepositories(data.repositories);
        if (data.releases) setReleases(data.releases);
        if (data.aiConfigs) setAIConfigs(data.aiConfigs);
        if (data.webdavConfigs) setWebDAVConfigs(data.webdavConfigs);

        addToast({
          variant: 'success',
          title: t('恢复成功', 'Restore successful'),
          description: t('数据已从后端恢复', 'Data restored from backend'),
        });
      } else {
        throw new Error('Restore failed');
      }
    } catch {
      addToast({
        variant: 'error',
        title: t('恢复失败', 'Restore failed'),
        description: t('请检查后端的连接', 'Please check backend connection'),
      });
    } finally {
      setIsSyncingFrom(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card
        padding="md"
        className={cn(
          status === 'connected' && 'border-success-500 bg-success-50/50',
          status === 'disconnected' && 'border-error-500 bg-error-50/50'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              status === 'connected' && 'bg-success-100',
              status === 'disconnected' && 'bg-error-100',
              status === 'checking' && 'bg-surface-sunken'
            )}>
              {status === 'connected' && <CheckCircle className="w-5 h-5 text-success-600" />}
              {status === 'disconnected' && <AlertCircle className="w-5 h-5 text-error-600" />}
              {status === 'checking' && <Spinner size="sm" variant="primary" />}
            </div>
            <div>
              <p className="font-medium text-text-primary">
                {status === 'connected' && t('后端已连接', 'Backend Connected')}
                {status === 'disconnected' && t('后端未连接', 'Backend Disconnected')}
                {status === 'checking' && t('检查中...', 'Checking...')}
              </p>
              {health && (
                <p className="text-sm text-text-secondary">
                  {t('版本:', 'Version:')} {health.version}
                </p>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={checkHealth}
            disabled={status === 'checking'}
            leftIcon={status === 'checking' ? <Spinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
          >
            {t('刷新', 'Refresh')}
          </Button>
        </div>
      </Card>

      {/* API Secret Configuration */}
      <Card padding="lg">
        <h4 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          {t('API 密钥配置', 'API Secret Configuration')}
        </h4>

        <div className="space-y-4">
          <Input
            label={t('API Secret', 'API Secret')}
            type="password"
            placeholder={t('输入后端 API 密钥', 'Enter backend API secret')}
            value={secretInput}
            onChange={setSecretInput}
            helperText={t('用于验证后端连接的密钥', 'Secret key for backend authentication')}
          />

          <Button
            variant="primary"
            onClick={handleConnect}
            disabled={!secretInput.trim()}
          >
            {t('保存并连接', 'Save & Connect')}
          </Button>
        </div>
      </Card>

      {/* Sync Actions */}
      {status === 'connected' && (
        <Card padding="lg">
          <h4 className="font-semibold text-text-primary mb-4">
            {t('数据同步', 'Data Synchronization')}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-surface-sunken rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Upload className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-text-primary">{t('上传到后端', 'Upload to Backend')}</span>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                {t('将本地数据上传到后端服务器', 'Upload local data to backend server')}
              </p>
              <Button
                variant="primary"
                onClick={handleSyncToBackend}
                disabled={isSyncingTo}
                className="w-full"
                leftIcon={isSyncingTo ? <Spinner size="sm" /> : <Upload className="w-4 h-4" />}
              >
                {isSyncingTo ? t('同步中...', 'Syncing...') : t('上传数据', 'Upload Data')}
              </Button>
            </div>

            <div className="p-4 bg-surface-sunken rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Download className="w-5 h-5 text-secondary-600" />
                <span className="font-medium text-text-primary">{t('从后端恢复', 'Restore from Backend')}</span>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                {t('从后端服务器恢复数据', 'Restore data from backend server')}
              </p>
              <Button
                variant="secondary"
                onClick={handleSyncFromBackend}
                disabled={isSyncingFrom}
                className="w-full"
                leftIcon={isSyncingFrom ? <Spinner size="sm" /> : <Download className="w-4 h-4" />}
              >
                {isSyncingFrom ? t('恢复中...', 'Restoring...') : t('恢复数据', 'Restore Data')}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
