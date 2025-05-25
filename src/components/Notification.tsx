import { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

interface NotificationProps {
  message: string;
  type: 'error' | 'success';
  onClose: () => void;
}

export default function Notification({ message, type, onClose }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'error' ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900';
  const textColor = type === 'error' ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200';

  return (
    <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg ${bgColor} ${textColor} flex items-center gap-2 z-50`}>
      <span>{message}</span>
      <button
        onClick={onClose}
        className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full"
      >
        <FaTimes />
      </button>
    </div>
  );
} 