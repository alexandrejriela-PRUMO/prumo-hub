import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { FileText, Bot, Mountain, ClipboardList, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import SupabaseFileUpload from '@/components/storage/SupabaseFileUpload';
import SupabaseFileLink from '@/components/storage/SupabaseFileLink';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const DJI_CATEGORIES = [
  {
    key: 'ai',
    label: '🤖 Mapa de IA',
    icon: Bot,
    color: 'purple',
    files: [
      { name: 'segment.tif', description: 'Imagem com segmentação por IA', priority: '⭐⭐' },
      { name: 'segment.tfw', description: 'Georreferenciamento do segment.tif', priority: '' },
      { name: 'segmentAPI.json', description: 'Dados brutos da IA (formato técnico)', priority: '' },
    ],
  },
  {
    key: 'elevation',
    label: '🏔️ Camada de Elevação',
    icon: Mountain,
    color: 'blue',
    files: [
      { name: 'dsm.tif', description: 'Modelo Digital de Superfície (DSM)', priority: '⭐⭐⭐' },
      { name: 'gsddsm.tif', description: 'DSM com resolução ajustada', priority: '' },
      { name: 'gsddsm.tfw', description: 'Georreferenciamento do gsddsm.tif', priority: '' },
    ],
  },
  {
    key: 'report',
    label: '📋 Relatório de Mapeamento',
    icon: ClipboardList,
    color: 'emerald',
    files: [
      { name: 'dom_screennail.png', description: 'Preview do ortomosaico', priority: '' },
      { name: 'dsm_screennail.png', description: 'Preview do mapa de elevação', priority: '' },
      { name: 'map_report.json', description: 'Dados técnicos do voo', priority: '' },
      { name: 'report.md', description: 'Relatório do processamento', priority: '' },
      { name: 'overlap_render.png', description: 'Mapa de sobreposição das fotos', priority: '' },
    ],
  },
];

const colorMap = {
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', title: 'text-purple-900', badge: 'bg-purple-100 text-purple-800', header: 'bg-purple-50 border-b border-purple-200' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   title: 'text-blue-900',   badge: 'bg-blue-100 text-blue-800',   header: 'bg-blue-50 border-b border-blue-200' },
  emerald:{ bg: 'bg-emerald-50',border: 'border-emerald-200',title: 'text-emerald-900',badge: 'bg-emerald-100 text-emerald-800',header: 'bg-emerald-50 border-b border-emerald-200' },
};

export default function DJIFilesPanel({ mapping, canEdit }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const getDjiFiles = (categoryKey) => {
    return (mapping.files || []).filter(f => f.dji_category === categoryKey);
  };

  const handleUpload = async (filePath, fileName, categoryKey) => {
    const ext = fileName.toLowerCase().split('.').pop();
    const newFile = {
      name: fileName,
      url: filePath,
      type: ext,
      dji_category: categoryKey,
      upload_date: new Date().toISOString(),
    };
    const updatedFiles = [...(mapping.files || []), newFile];
    await base44.entities.Mapping.update(mapping.id, { ...mapping, files: updatedFiles });
    queryClient.invalidateQueries(['mappings']);
    toast.success(`Arquivo DJI enviado: ${fileName}`);
  };

  const handleDelete = async (fileIndex) => {
    const updatedFiles = (mapping.files || []).filter((_, i) => i !== fileIndex);
    await base44.entities.Mapping.update(mapping.id, { ...mapping, files: updatedFiles });
    queryClient.invalidateQueries(['mappings']);
    toast.success('Arquivo removido.');
  };

  const totalDjiFiles = (mapping.files || []).filter(f => f.dji_category).length;

  return (
    <div className="mt-3 border border-dashed border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
      >
        <span className="flex items-center gap-2">
          🚁 Arquivos DJI
          {totalDjiFiles > 0 && (
            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0">{totalDjiFiles}</Badge>
          )}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="p-3 space-y-3 bg-white">
          {DJI_CATEGORIES.map((cat) => {
            const c = colorMap[cat.color];
            const catFiles = getDjiFiles(cat.key);
            return (
              <div key={cat.key} className={`rounded-lg border ${c.border} overflow-hidden`}>
                <div className={`px-3 py-2 ${c.header} flex items-center justify-between`}>
                  <span className={`text-xs font-semibold ${c.title}`}>{cat.label}</span>
                  {canEdit && (
                    <SupabaseFileUpload
                      folder="mapeamentos-dji"
                      accept=".tif,.tiff,.tfw,.json,.png,.jpg,.jpeg,.md"
                      label="+ Upload"
                      onUploadDone={(fp, fn) => handleUpload(fp, fn, cat.key)}
                    />
                  )}
                </div>
                <div className={`${c.bg} px-3 py-2 space-y-1`}>
                  {/* Reference files list */}
                  {cat.files.map((ref) => {
                    const uploaded = catFiles.find(f => f.name.toLowerCase().includes(ref.name.toLowerCase().split('.')[0]));
                    return (
                      <div key={ref.name} className="flex items-center justify-between text-xs py-1 border-b border-white/60 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <code className="font-mono text-gray-700 bg-white/70 px-1.5 py-0.5 rounded text-[10px] flex-shrink-0">{ref.name}</code>
                          <span className="text-gray-500 truncate hidden sm:block">{ref.description}</span>
                          {ref.priority && <span className="text-[10px] text-amber-600 flex-shrink-0">{ref.priority}</span>}
                        </div>
                        {uploaded ? (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <SupabaseFileLink filePath={uploaded.url} label="↓" asLink={true} />
                            {canEdit && (
                              <button onClick={() => handleDelete((mapping.files || []).indexOf(uploaded))} className="text-red-400 hover:text-red-600">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            <Badge className="bg-green-100 text-green-800 text-[10px] px-1 py-0">✓</Badge>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 text-gray-400">pendente</Badge>
                        )}
                      </div>
                    );
                  })}
                  {/* Extra uploaded files in this category not matching the reference list */}
                  {catFiles.filter(f => !cat.files.some(ref => f.name.toLowerCase().includes(ref.name.toLowerCase().split('.')[0]))).map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate text-gray-600">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <SupabaseFileLink filePath={f.url} label="↓" asLink={true} />
                        {canEdit && (
                          <button onClick={() => handleDelete((mapping.files || []).indexOf(f))} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}