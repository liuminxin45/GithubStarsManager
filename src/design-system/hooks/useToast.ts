import { useState, useCallback } from 'react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastOptions {
  variant: ToastVariant;
  title: string;
  description?: string;
}

// 全局 toast 状态
let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

const notifyListeners = () => {
  toastListeners.forEach(listener => listener([...toasts]));
};

const addToastInternal = (options: ToastOptions): string => {
  const id = Math.random().toString(36).substring(2, 9);
  const toast: Toast = {
    id,
    variant: options.variant,
    title: options.title,
    description: options.description,
  };
  toasts = [...toasts, toast];
  notifyListeners();

  // 自动移除
  setTimeout(() => {
    removeToastInternal(id);
  }, 5000);

  return id;
};

const removeToastInternal = (id: string) => {
  toasts = toasts.filter(t => t.id !== id);
  notifyListeners();
};

/**
 * Toast 通知 Hook
 * 用于显示临时通知消息
 */
export function useToast() {
  const [localToasts, setLocalToasts] = useState<Toast[]>([]);

  // 订阅全局状态
  const subscribe = useCallback((callback: (toasts: Toast[]) => void) => {
    toastListeners.push(callback);
    callback([...toasts]); // 立即同步当前状态
    return () => {
      toastListeners = toastListeners.filter(l => l !== callback);
    };
  }, []);

  const addToast = useCallback((options: ToastOptions) => {
    return addToastInternal(options);
  }, []);

  const removeToast = useCallback((id: string) => {
    removeToastInternal(id);
  }, []);

  return {
    toasts: localToasts,
    addToast,
    removeToast,
    subscribe,
  };
}

// 全局添加 toast 的方法（用于在组件外调用）
export const toast = {
  success: (title: string, description?: string) =>
    addToastInternal({ variant: 'success', title, description }),
  error: (title: string, description?: string) =>
    addToastInternal({ variant: 'error', title, description }),
  warning: (title: string, description?: string) =>
    addToastInternal({ variant: 'warning', title, description }),
  info: (title: string, description?: string) =>
    addToastInternal({ variant: 'info', title, description }),
};
