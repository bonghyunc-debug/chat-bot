import React, { useMemo, useState } from 'react';
import { X, Download, Image as ImageIcon, Calendar, MessageSquare, ZoomIn } from 'lucide-react';
import { ChatSession } from '../types';

interface ImageGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
}

interface GalleryImage {
  data: string;
  mimeType: string;
  sessionId: string;
  sessionTitle: string;
  timestamp: Date;
  messageId: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ isOpen, onClose, sessions }) => {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  const images = useMemo(() => {
    const collected: GalleryImage[] = [];

    sessions.forEach(session => {
      session.messages.forEach(msg => {
        if (msg.modelAttachment) {
          collected.push({
            data: msg.modelAttachment.data,
            mimeType: msg.modelAttachment.mimeType,
            sessionId: session.id,
            sessionTitle: session.title,
            timestamp: new Date(msg.timestamp),
            messageId: msg.id
          });
        }
      });
    });

    // 최신순 정렬
    return collected.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [sessions]);

  if (!isOpen) return null;

  const handleDownload = (img: GalleryImage) => {
    const link = document.createElement('a');
    link.href = `data:${img.mimeType};base64,${img.data}`;
    link.download = `gemini-image-${img.timestamp.toISOString().slice(0,10)}-${img.messageId.slice(-6)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-200">
            <div className="p-1.5 bg-purple-500/20 rounded-md text-purple-400">
              <ImageIcon size={18} />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wide">이미지 갤러리</h2>
            <span className="text-xs text-slate-500 ml-2">{images.length}개 이미지</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {images.length === 0 ? (
            <div className="text-center text-slate-500 py-16">
              <ImageIcon size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">생성된 이미지가 없습니다</p>
              <p className="text-xs mt-1">이미지 생성 모델을 사용해 이미지를 만들어보세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((img, index) => (
                <div 
                  key={`${img.sessionId}-${img.messageId}`}
                  className="group relative bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <img 
                    src={`data:${img.mimeType};base64,${img.data}`}
                    alt={`Generated image ${index + 1}`}
                    className="w-full aspect-square object-cover cursor-pointer"
                    onClick={() => setSelectedImage(img)}
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setSelectedImage(img)}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded text-white transition-colors"
                        title="크게 보기"
                      >
                        <ZoomIn size={14} />
                      </button>
                      <button
                        onClick={() => handleDownload(img)}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded text-white transition-colors"
                        title="다운로드"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                    
                    <div className="text-xs text-white/80">
                      <div className="flex items-center gap-1 mb-1">
                        <MessageSquare size={10} />
                        <span className="truncate">{img.sessionTitle}</span>
                      </div>
                      <div className="flex items-center gap-1 text-white/60">
                        <Calendar size={10} />
                        <span>{img.timestamp.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-8"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X size={24} />
          </button>
          
          <img 
            src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`}
            alt="Selected image"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-sm text-white/80">{selectedImage.sessionTitle}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(selectedImage);
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-white text-sm transition-colors"
            >
              <Download size={14} />
              다운로드
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
