import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 className 工具函数
 * 使用 clsx 处理条件类名，使用 tailwind-merge 解决冲突
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
