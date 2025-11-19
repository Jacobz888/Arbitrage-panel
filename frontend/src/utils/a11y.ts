/**
 * Accessibility utility functions
 */

export const isKeyboardEvent = (event: React.KeyboardEvent): boolean => {
  return ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key);
};

export const isEnterKey = (event: React.KeyboardEvent): boolean => {
  return event.key === 'Enter' || event.code === 'Enter';
};

export const isEscapeKey = (event: React.KeyboardEvent): boolean => {
  return event.key === 'Escape' || event.code === 'Escape';
};

export const isArrowKey = (event: React.KeyboardEvent): boolean => {
  return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key);
};

export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

export const focusElement = (element: HTMLElement | null) => {
  if (element && 'focus' in element) {
    element.focus();
  }
};

export const getAriaLabel = (label: string, value: string): string => {
  return `${label}: ${value}`;
};
