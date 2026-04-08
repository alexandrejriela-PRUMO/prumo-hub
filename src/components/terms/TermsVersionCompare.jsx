import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { GitCompare, FileText } from 'lucide-react';

// Simple word-level diff highlighter
function diffHtml(oldHtml, newHtml) {
  const stripTags = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const oldWords = stripTags(oldHtml).split(' ');
  const newWords = stripTags(newHtml).split(' ');

  const result = [];
  const maxLen = Math.max(oldWords.length, newWords.length);
  for (let i = 0; i < maxLen; i++) {
    const ow = oldWords[i] || '';
    const nw = newWords[i] || '';
    if (ow === nw) {
      result.push(nw);
    } else if (!ow) {
      result.push(`<mark class="bg-green-100 text-green-800 px-0.5 rounded">${nw}</mark>`);
    } else if (!nw) {
      result.push(`<del class="bg-red-100 text-red-700 px-0.5 rounded line-through">${ow}</del>`);
    } else {
      result.push(`<del class="bg-red-100 text-red-700 px-0.5 rounded line-through">${ow}</del> <mark class="bg-green-100 text-green-800 px-0.5 rounded">${nw}</mark>`);
    }
  }
  return result.join(' ');
}

export default function TermsVersionCompare({ terms }) {
  const [versionA, setVersionA] = useState('');
  const [versionB, setVersionB] = useState('');

  const termA = terms.find(t => String(t.id) === versionA);
  const termB = terms.find(t => String(t.id) === versionB);

  const diffResult = useMemo(() => {
    if (!termA || !termB) return null;
    return diffHtml(termA.content, termB.content);
  }, [termA, termB]);

  if (!terms || terms.length < 2) {
    return (
      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="py-14 text-center">
          <GitCompare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">É necessário ter ao menos 2 versões para comparar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700">Versão Base (antiga)</Label>
          <Select value={versionA} onValueChange={setVersionA}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar versão..." />
            </SelectTrigger>
            <SelectContent>
              {terms.map(t => (
                <SelectItem key={t.id} value={String(t.id)}>
                  Versão {t.version} {t.is_active ? '(ativa)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700">Nova Versão</Label>
          <Select value={versionB} onValueChange={setVersionB}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar versão..." />
            </SelectTrigger>
            <SelectContent>
              {terms.map(t => (
                <SelectItem key={t.id} value={String(t.id)}>
                  Versão {t.version} {t.is_active ? '(ativa)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Legend */}
      {diffResult && (
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300" /> Removido
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300" /> Adicionado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-gray-100 border border-gray-300" /> Sem alteração
          </span>
        </div>
      )}

      {/* Side by side */}
      {termA && termB ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-red-200">
            <CardContent className="pt-4">
              <p className="text-xs font-semibold text-red-600 mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Versão {termA.version} (base)
              </p>
              <div
                className="prose prose-sm max-w-none text-gray-700 text-xs leading-relaxed max-h-96 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: termA.content }}
              />
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardContent className="pt-4">
              <p className="text-xs font-semibold text-green-600 mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Versão {termB.version} (nova)
              </p>
              <div
                className="prose prose-sm max-w-none text-gray-700 text-xs leading-relaxed max-h-96 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: termB.content }}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="py-14 text-center">
            <GitCompare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">Selecione duas versões para comparar.</p>
          </CardContent>
        </Card>
      )}

      {/* Diff View */}
      {diffResult && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-gray-600 mb-3">Visão unificada (diferenças destacadas)</p>
            <div
              className="text-sm text-gray-700 leading-relaxed max-h-96 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: diffResult }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}