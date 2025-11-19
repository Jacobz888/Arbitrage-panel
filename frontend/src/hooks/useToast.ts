import { useCallback } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const useToast = (onToastAdd: (toast: Toast) => void) => {
  const success = useCallback((message: string) => {
    onToastAdd({
      id: Date.now().toString(),
      message,
      type: 'success',
    });
  }, [onToastAdd]);

  const error = useCallback((message: string) => {
    onToastAdd({
      id: Date.now().toString(),
      message,
      type: 'error',
    });
  }, [onToastAdd]);

  const info = useCallback((message: string) => {
    onToastAdd({
      id: Date.now().toString(),
      message,
      type: 'info',
    });
  }, [onToastAdd]);

  return { success, error, info };
};
