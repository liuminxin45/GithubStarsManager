import React, { useState } from 'react';
import { Github, Key, ArrowRight, AlertCircle, Sparkles, Code2, Star } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { GitHubApiService } from '../services/githubApi';
import { Button } from '../design-system/components';

/**
 * LoginScreen - 精简的登录界面
 *
 * 设计原则：
 * - 去除过度视觉特效
 * - 保留品牌感但克制
 * - 清晰的视觉层级
 * - 专注核心功能
 */
export const LoginScreen: React.FC = () => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser, setGitHubToken, repositories, lastSync, language } = useAppStore();

  const handleConnect = async () => {
    if (!token.trim()) {
      setError(language === 'zh' ? '请输入有效的GitHub token' : 'Please enter a valid GitHub token');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const githubApi = new GitHubApiService(token);
      const user = await githubApi.getCurrentUser();

      setGitHubToken(token);
      setUser(user);

      console.log('Successfully authenticated user:', user);
    } catch (error) {
      console.error('Authentication failed:', error);
      setError(
        error instanceof Error
          ? error.message
          : (language === 'zh' ? '认证失败，请检查您的token。' : 'Failed to authenticate. Please check your token.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleConnect();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && !isLoading) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          setToken(text.trim());
          setError('');
        }
      } catch (error) {
        console.warn('Clipboard read failed:', error);
      }
    }
  };

  const t = (zh: string, en: string) => language === 'zh' ? zh : en;

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      {/* Subtle Background Pattern */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-md w-full">
        {/* Logo Section - 更简洁 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-xl bg-primary-600">
            <Star className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl font-semibold text-text-primary mb-2 tracking-tight">
            GitHub Stars Manager
          </h1>
          <p className="text-text-secondary text-sm">
            {t('AI驱动的智能仓库管理', 'AI-powered repository management')}
          </p>
        </div>

        {/* Feature Pills - 更克制 */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 rounded-full text-xs text-text-secondary">
            <Sparkles className="w-3.5 h-3.5 text-primary-600" />
            {t('AI 智能分析', 'AI Analysis')}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 rounded-full text-xs text-text-secondary">
            <Code2 className="w-3.5 h-3.5 text-primary-600" />
            {t('语义搜索', 'Semantic Search')}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 rounded-full text-xs text-text-secondary">
            <Star className="w-3.5 h-3.5 text-primary-600" />
            {t('Release 追踪', 'Release Tracking')}
          </div>
        </div>

        {/* Login Card - 简洁的边框卡片 */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-neutral-100 rounded-lg mb-3">
              <Github className="w-5 h-5 text-text-primary" />
            </div>
            <h2 className="text-base font-semibold text-text-primary mb-1">
              {t('连接 GitHub', 'Connect with GitHub')}
            </h2>
            <p className="text-text-tertiary text-xs">
              {t('输入您的 GitHub Token 开始使用', 'Enter your GitHub token to get started')}
            </p>
          </div>

          {/* Cached Status - 更简洁 */}
          {repositories.length > 0 && lastSync && (
            <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-700">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span className="text-sm font-medium">
                  {t(`已缓存 ${repositories.length} 个仓库`, `${repositories.length} repositories cached`)}
                </span>
              </div>
              <p className="text-xs text-emerald-600/70 mt-1">
                {t('上次同步:', 'Last sync:')} {new Date(lastSync).toLocaleString()}
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* Token Input - 更简洁 */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                GitHub Personal Access Token
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setError('');
                  }}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg
                    text-sm text-text-primary placeholder:text-text-tertiary font-mono
                    focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                    transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            {/* Error Message - 更简洁 */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Connect Button */}
            <Button
              variant="primary"
              size="lg"
              onClick={handleConnect}
              disabled={isLoading || !token.trim()}
              className="w-full"
              rightIcon={!isLoading && <ArrowRight className="w-4 h-4" />}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('连接中...', 'Connecting...')}</span>
                </>
              ) : (
                <span>{t('连接到 GitHub', 'Connect to GitHub')}</span>
              )}
            </Button>
          </div>

          {/* Instructions - 更简洁 */}
          <div className="mt-6 pt-5 border-t border-border-subtle">
            <h3 className="font-medium text-text-primary mb-3 text-xs uppercase tracking-wide">
              {t('如何创建 GitHub Token:', 'How to create a GitHub token:')}
            </h3>
            <ol className="text-xs text-text-secondary space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary-600 font-medium">1.</span>
                <span>{t('访问 GitHub Settings → Developer settings → Personal access tokens', 'Go to GitHub Settings → Developer settings → Personal access tokens')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600 font-medium">2.</span>
                <span>{t('点击 "Generate new token (classic)"', 'Click "Generate new token (classic)"')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600 font-medium">3.</span>
                <span>
                  {t('选择权限范围：', 'Select scopes:')}{' '}
                  <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-primary-600 font-mono text-[10px]">repo</code>
                  {' '}{t('和', 'and')}{' '}
                  <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-primary-600 font-mono text-[10px]">user</code>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600 font-medium">4.</span>
                <span>{t('复制生成的 token 并粘贴到上方', 'Copy the generated token and paste it above')}</span>
              </li>
            </ol>
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-primary-600 hover:text-primary-700 text-xs font-medium transition-colors"
            >
              {t('在 GitHub 上创建 Token →', 'Create token on GitHub →')}
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-text-tertiary text-xs mt-6">
          {t('您的 Token 仅存储在本地，不会发送到任何服务器', 'Your token is stored locally and never sent to any server')}
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
