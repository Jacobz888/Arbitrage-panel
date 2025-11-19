import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const typeClasses: Record<string, string> = {
    success: 'bg-success-900 border-success-800 text-success-200',
    error: 'bg-error-900 border-error-800 text-error-200',
    info: 'bg-primary-900 border-primary-800 text-primary-200',
  };

  return (
    <div
      className={`fixed bottom-4 right-4 px-6 py-4 rounded-lg border ${typeClasses[type]} shadow-lg animate-pulse`}
      role="alert"
    >
      <p className="font-medium">{message}</p>
    </div>
  );
};

export const ToastContainer: React.FC<{
  toasts: Array<{ id: string; message: string; type?: 'success' | 'error' | 'info' }>;
  onRemove: (id: string) => void;
}> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
};
