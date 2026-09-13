import { useEffect, useState } from 'react';

const PROTECTED_CLASS = 'screen-protected';

export function ScreenProtection() {
  const [isProtected, setIsProtected] = useState(false);

  useEffect(() => {
    let protectionTimer: number | undefined;

    const protect = () => {
      window.clearTimeout(protectionTimer);
      document.documentElement.classList.add(PROTECTED_CLASS);
      setIsProtected(true);
    };

    const reveal = () => {
      window.clearTimeout(protectionTimer);
      document.documentElement.classList.remove(PROTECTED_CLASS);
      setIsProtected(false);
    };

    const protectBriefly = () => {
      protect();
      protectionTimer = window.setTimeout(reveal, 1200);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) protect();
      else reveal();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const printShortcut = (event.ctrlKey || event.metaKey) && key === 'p';
      const macScreenshotShortcut =
        event.metaKey && event.shiftKey && ['3', '4', '5'].includes(key);

      if (event.key === 'PrintScreen' || macScreenshotShortcut) {
        event.preventDefault();
        protectBriefly();
      } else if (printShortcut) {
        event.preventDefault();
        protectBriefly();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', protect);
    window.addEventListener('focus', reveal);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('beforeprint', protect);
    window.addEventListener('afterprint', reveal);

    return () => {
      window.clearTimeout(protectionTimer);
      document.documentElement.classList.remove(PROTECTED_CLASS);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', protect);
      window.removeEventListener('focus', reveal);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('beforeprint', protect);
      window.removeEventListener('afterprint', reveal);
    };
  }, []);

  return (
    <div
      aria-hidden={!isProtected}
      className="privacy-screen"
      role={isProtected ? 'status' : undefined}
    >
      <div className="privacy-screen__message">
        <span aria-hidden="true">🔒</span>
        <strong>Screen protected</strong>
        <span>Return to Ayo to view this page.</span>
      </div>
    </div>
  );
}
