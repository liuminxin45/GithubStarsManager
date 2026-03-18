import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Button, Card } from '../design-system/components';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { language } = useAppStore();
  const t = (zh: string, en: string) => language === 'zh' ? zh : en;

  const defaultMessage = t(
    '加载仓库列表时出错，请稍后重试。',
    'Error loading repositories. Please try again later.'
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-center py-16"
    >
      <Card padding="lg" className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-error-50 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-error-500" />
        </div>

        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {t('加载失败', 'Loading Failed')}
        </h3>

        <p className="text-text-secondary mb-6">
          {message || defaultMessage}
        </p>

        {onRetry && (
          <Button
            variant="primary"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            {t('重试', 'Retry')}
          </Button>
        )}
      </Card>
    </motion.div>
  );
}
