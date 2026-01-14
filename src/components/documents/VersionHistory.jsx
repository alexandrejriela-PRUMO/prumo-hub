import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Clock, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function VersionHistory({ versions = [], currentVersion, onRestore }) {
  if (!versions || versions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        Nenhuma versão anterior disponível
      </div>
    );
  }

  const sortedVersions = [...versions].sort((a, b) => b.version_number - a.version_number);

  return (
    <div className="space-y-3">
      {sortedVersions.map((version) => (
        <Card key={version.version_number} className={version.version_number === currentVersion ? 'border-emerald-500 bg-emerald-50/50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900">
                    Versão {version.version_number}
                  </h4>
                  {version.version_number === currentVersion && (
                    <Badge className="bg-emerald-600">Atual</Badge>
                  )}
                </div>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{format(parseISO(version.uploaded_date), "dd/MM/yyyy 'às' HH:mm")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    <span>{version.uploaded_by}</span>
                  </div>
                  {version.notes && (
                    <p className="mt-2 bg-gray-50 p-2 rounded text-xs">{version.notes}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <a
                  href={version.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-sm"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ver
                </a>
                {version.version_number !== currentVersion && onRestore && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRestore(version)}
                    className="text-xs"
                  >
                    Restaurar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}