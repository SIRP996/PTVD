import React from 'react';
import { Scene, ScriptAnalysis } from '../types';
import { Camera, Clock, Mic, Trash2, Edit3 } from 'lucide-react';

interface ScriptViewerProps {
  analysis: ScriptAnalysis;
  onUpdateTags: (tags: string[]) => void;
}

export const ScriptViewer: React.FC<ScriptViewerProps> = ({ analysis, onUpdateTags }) => {
  const [newTag, setNewTag] = React.useState('');

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim() && !analysis.tags.includes(newTag.trim())) {
      onUpdateTags([...analysis.tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onUpdateTags(analysis.tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header Info */}
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{analysis.title || "Kịch bản chưa đặt tên"}</h2>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
            <span className="flex items-center gap-1"><FileVideo className="w-4 h-4" /> {analysis.videoName}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date(analysis.createdAt).toLocaleDateString()}</span>
        </div>

        {/* Tags Section */}
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700 mr-2">Gắn tag sản phẩm:</span>
            {analysis.tags.map(tag => (
                <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="ml-1.5 text-blue-600 hover:text-blue-800">×</button>
                </span>
            ))}
            <form onSubmit={handleAddTag} className="relative">
                <input 
                    type="text" 
                    placeholder="+ Thêm tag" 
                    className="w-24 px-2 py-0.5 text-xs border border-gray-300 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                />
            </form>
        </div>
      </div>

      {/* Script Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider w-1/5">
                Phân cảnh
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider w-2/5">
                Mô tả hình ảnh
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider w-2/5">
                Kịch bản phát ngôn
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {analysis.scenes.map((scene, idx) => (
              <tr key={scene.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50 hover:bg-slate-100 transition-colors'}>
                {/* Scene Column */}
                <td className="px-6 py-4 align-top">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 font-bold text-gray-900">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            {scene.type}
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 w-fit mt-1 border border-blue-100">
                           {scene.startTime} - {scene.endTime}
                        </span>
                    </div>
                </td>

                {/* Visual Column */}
                <td className="px-6 py-4 align-top text-sm text-gray-600 leading-relaxed">
                    <div className="flex gap-2">
                        <Camera className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>{scene.visualDescription}</div>
                    </div>
                </td>

                {/* Audio Column */}
                <td className="px-6 py-4 align-top text-sm text-gray-800 leading-relaxed bg-blue-50/30">
                     <div className="flex gap-2">
                        <Mic className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>{scene.audioScript}</div>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import { FileVideo } from 'lucide-react';
