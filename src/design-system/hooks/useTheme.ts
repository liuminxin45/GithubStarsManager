import { useAppStore } from '../../store/useAppStore';

/**
 * 主题管理 Hook
 * 提供当前主题状态和切换功能
 */
export function useTheme() {
  const theme = useAppStore(state => state.theme);
  const setTheme = useAppStore(state => state.setTheme);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
  };
}
