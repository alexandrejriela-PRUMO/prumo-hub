import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const severityIcons = {
  info: <Info className="w-5 h-5 text-blue-600" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
  error: <AlertCircle className="w-5 h-5 text-red-600" />,
  success: <CheckCircle className="w-5 h-5 text-green-600" />
};

const severityColors = {
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  error: 'bg-red-50 border-red-200 text-red-900',
  success: 'bg-green-50 border-green-200 text-green-900'
};

export default function NotificationToast({ notification, onClose, onMarkAsRead, autoClose = 5000 }) {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`${severityColors[notification.severity || 'info']} border rounded-lg p-4 mb-3 flex items-start gap-3 cursor-pointer hover:shadow-md transition-shadow`}
      onClick={handleClick}
    >
      {severityIcons[notification.severity || 'info']}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{notification.title}</p>
        <p className="text-sm mt-1 opacity-90">{notification.message}</p>
        {notification.link && (
          <a
            href={notification.link}
            className="text-xs mt-2 inline-block underline opacity-75 hover:opacity-100"
          >
            Ver detalhes →
          </a>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export function NotificationContainer({ notifications, onMarkAsRead, onDelete }) {
  return (
    <div className="fixed top-24 right-4 z-50 max-w-md w-full max-h-96 overflow-y-auto">
      <AnimatePresence>
        {notifications.slice(0, 5).map(notification => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={() => onDelete(notification.id)}
            onMarkAsRead={onMarkAsRead}
            autoClose={notification.severity === 'error' ? 8000 : 5000}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}