import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function OnlineStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showNotification) return null;

  return (
    <div className={`fixed top-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-xs z-50 animate-in slide-in-from-top-4 duration-300 ${
      isOnline ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
    } rounded-lg border p-4 flex items-center gap-3`}>
      {isOnline ? (
        <>
          <Wifi className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-900 text-sm">Conectado</p>
            <p className="text-gray-600 text-xs">Sua conexão foi restaurada</p>
          </div>
        </>
      ) : (
        <>
          <WifiOff className="w-5 h-5 text-red-600 flex-shrink-0 animate-pulse" />
          <div>
            <p className="font-medium text-gray-900 text-sm">Sem conexão</p>
            <p className="text-gray-600 text-xs">Você está offline - funcionando com dados em cache</p>
          </div>
        </>
      )}
    </div>
  );
}