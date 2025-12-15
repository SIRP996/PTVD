import React from 'react';
import { ScriptAnalysis } from '../types';
import { BookOpen, ChevronRight, Trash2, Tag } from 'lucide-react';

interface ScriptLibraryProps {
  savedScripts: ScriptAnalysis[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  activeId?: string;
}

export const ScriptLibrary: React.FC<ScriptLibraryProps> = ({ savedScripts, onSelect, onDelete, activeId }) => {
  if (savedScripts.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-blue-600" />
        <h3 className="font-semibold text-gray-700">Bộ sưu tập kịch bản</h3>
      </div>
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
        <ul className="divide-y divide-gray-100">
          {savedScripts.map((script) => (
            <li key={script.id}>
              <button 
                onClick={() => onSelect(script.id)}
                className={`w-full text-left p-4 hover:bg-blue-50 transition-colors flex items-start justify-between group ${activeId === script.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
              >
                <div className="overflow-hidden flex-1 pr-2">
                    <p className={`font-medium truncate ${activeId === script.id ? 'text-blue-700' : 'text-gray-700'}`}>
                        {script.title || script.videoName}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 mb-2">
                        {new Date(script.createdAt).toLocaleDateString()}
                    </p>
                    
                    {/* Hiển thị Tag sản phẩm */}
                    {script.tags && script.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {script.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 truncate max-w-[120px]">
                            {tag}
                          </span>
                        ))}
                        {script.tags.length > 3 && (
                           <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                            +{script.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                </div>
                
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity self-center">
                     <div 
                        onClick={(e) => { e.stopPropagation(); onDelete(script.id); }}
                        className="p-2 hover:bg-red-100 rounded text-gray-400 hover:text-red-500 transition-colors"
                        title="Xóa kịch bản"
                     >
                         <Trash2 className="w-4 h-4" />
                     </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};