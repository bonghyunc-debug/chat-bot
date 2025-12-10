// components/NetworkStatusBanner.tsx
import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';

interface NetworkStatusBannerProps {
  isOnline: boolean;
  wasOffline: boolean;
  onDismiss: () => void;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({
  isOnline,
  wasOffline,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setIsVisible(true);
    } else if (wasOffline) {
      setIsVisible(true);
      // 복구 후 3초 뒤 자동 숨김
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium transition-all
        ${isOnline
          ? 'bg-emerald-600 text-white'
          : 'bg-red-600 text-white'
        }
      `}
    >
      {isOnline ? (
        <>
          <Wifi size={16} />
          <span>네트워크가 복구되었습니다</span>
        </>
      ) : (
        <>
          <WifiOff size={16} />
          <span>네트워크 연결이 끊어졌습니다. 일부 기능이 제한될 수 있습니다.</span>
        </>
      )}
      <button
        onClick={() => {
          setIsVisible(false);
          onDismiss();
        }}
        className="ml-4 p-1 hover:bg-white/20 rounded transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};
