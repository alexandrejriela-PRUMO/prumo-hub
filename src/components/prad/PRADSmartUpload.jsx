import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import {
  Upload, Sparkles, FileText, CheckCircle2, AlertTriangle,
  FileSearch, X, Loader2
} from 'lucide-react';

const SCHEMA_PROPERTIES = {
  project_name: { type: 'string' },
  degradation_type: { type: 'string' },
  total_area_ha: { type: 'number' },
  plot_name: { type: 'string' },
  coordinates: { type: 'string' },
  diagnosis_date: { type: 'string' },
  main_objective: { type: 'string' },
  impact_level: { type: 'string' },
  status: { type: 'string' },
  ai_analysis: { type: 'string' },
};

function buildPrompt() {
  return `Você é um especialista em Planos de Recuperação de Áreas Degradadas (PRAD) segundo a legislação ambiental brasileira (Lei 12.651/2012 - Código Florestal, resoluções CONAMA e normas dos órgãos estaduais de meio ambiente). Analise este PDF de um Plano de Recuperação de Área Degradada (PRAD) ou diagnóstico técnico de área degradada.

Extraia e retorne EXATAMENTE os seguintes dados em JSON:
- project_name: Nome/título do projeto de recuperação (ex: "PRAD - Área de APP do Córrego Norte")
- degradation_type: Um dos valores exatos: "Erosão", "Supressão", "Compactação", "APP", "Passivo Legal", "Outro" — classifique conforme o tipo de degradação predominante descrito no documento
- total_area_ha: Área total degradada em hectares como número (ex: 4.5)
- plot_name: Talhão, gleba ou identificação da área dentro da propriedade
- coordinates: Coordenadas do centróide da área degradada no formato "LAT,LNG" em decimais negativos para Sul/Oeste (converta graus/minutos/segundos quando necessário)
- diagnosis_date: Data do diagnóstico/levantamento técnico no formato YYYY-MM-DD
- main_objective: Um dos valores exatos: "Regularização Ambiental", "Atendimento a Auto de Infração", "Condicionante de Licença", "Recuperação Voluntária", "Compensação Ambiental" — identifique o objetivo principal do PRAD conforme descrito no documento
- impact_level: Um dos valores exatos: "Baixo", "Médio", "Alto" — grau de impacto da degradação conforme descrito ou inferido tecnicamente a partir do diagnóstico
- status: Um dos valores exatos: "Planejamento", "Em Execução", "Concluído", "Suspenso" — status atual do projeto conforme o documento (se não houver indicação clara, use "Planejamento")
- ai_analysis: Análise técnica em português (máx 300 palavras) atuando como especialista ambiental, destacando: 1. Riscos e inconsistências identificados no documento; 2. Se a área diagnosticada parece subestimada ou incompatível com a extensão da degradação descrita; 3. Se falta alguma informação técnica obrigatória para um PRAD completo (ex: caracterização do solo, cronograma de execução, espécies a plantar, responsável técnico com ART/RRT); 4. Se o grau de degradação descrito no texto é mais severo do que o campo de "nível de impacto" sugere; 5. Adequação do objetivo declarado à legislação ambiental aplicável (Lei 12.651/2012). Seja direto e técnico, apontando pontos de atenção que o usuário deve revisar antes de protocolar o PRAD.

Para datas: formato YYYY-MM-DD.
Para campos não encontrados no documento: use null.`;
}

function buildFormData(result, fileUrl) {
  const parseNumber = (raw) => {
    if (raw === null || raw === undefined || raw === '') return '';
    const parsed = parseFloat(String(raw).replace(',', '.'));
    return isNaN(parsed) ? '' : parsed;
  };

  return {
    project_name: result.project_name || '',
    degradation_type: result.degradation_type || '',
    total_area_ha: parseNumber(result.total_area_ha),
    plot_name: result.plot_name || '',
    coordinates: result.coordinates || '',
    diagnosis_date: result.diagnosis_date || '',
    main_objective: result.main_objective || '',
    impact_level: result.impact_level || '',
    status: result.status || 'Planejamento',
    ai_analysis: result.ai_analysis || '',
    _file_url: fileUrl,
  };
}

export default function PRADSmartUpload({ onDataExtracted, onClose }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'analyzing' | 'done'
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep('analyzing');
    setError(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(),
        file_urls: [file_url],
        response_json_schema: { type: 'object', properties: SCHEMA_PROPERTIES },
        model: 'gemini_3_flash',
      });

      setResult({ ...extracted, _file_url: file_url });
      setStep('done');
    } catch (err) {
      setError('Erro ao processar o PDF. Tente novamente.');
      setStep('upload');
    }

    e.target.value = '';
  };

  const handleApply = () => {
    if (!result) return;
    onDataExtracted(buildFormData(result, result._file_url));
  };

  return (
    <div className="space-y-4">
      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="text-center pb-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 mb-3">
              <Sparkles className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Preencher com IA</h3>
            <p className="text-sm text-gray-500 mt-1">Faça upload do PDF do PRAD e a IA extrai os dados automaticamente</p>
          </div>

          <label className="block">
            <div className="border-2 border-dashed border-emerald-300 rounded-xl p-8 text-center cursor-pointer hover:bg-emerald-50 transition-colors">
              <Upload className="w-10 h-10 mx-auto text-emerald-400 mb-3" />
              <p className="font-semibold text-gray-700">Clique para selecionar o PDF</p>
              <p className="text-xs text-gray-400 mt-1">Documento de PRAD ou diagnóstico técnico da área degradada</p>
            </div>
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
          </label>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-center pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-gray-500">
              Preencher manualmente
            </Button>
          </div>
        </div>
      )}

      {/* Step: Analyzing */}
      {step === 'analyzing' && (
        <div className="py-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-50">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Analisando documento com IA...</p>
            <p className="text-sm text-gray-500 mt-1">Extraindo dados do PRAD e gerando análise técnica</p>
          </div>
          <div className="flex justify-center gap-2 flex-wrap text-xs text-gray-400">
            <span className="flex items-center gap-1"><FileSearch className="w-3 h-3" /> Lendo PDF</span>
            <span>→</span>
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> IA interpretando</span>
            <span>→</span>
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Preenchendo formulário</span>
          </div>
        </div>
      )}

      {/* Step: Done - Preview extracted data */}
      {step === 'done' && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Dados extraídos com sucesso!</p>
              <p className="text-xs text-emerald-600">Revise os dados abaixo e clique em "Aplicar ao Formulário"</p>
            </div>
          </div>

          {/* Key extracted fields preview */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Dados Extraídos</p>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { label: 'Nome do Projeto', value: result.project_name },
                { label: 'Tipo de Degradação', value: result.degradation_type },
                { label: 'Área Total', value: result.total_area_ha ? `${result.total_area_ha} ha` : null },
                { label: 'Talhão / Gleba', value: result.plot_name },
                { label: 'Data do Diagnóstico', value: result.diagnosis_date },
                { label: 'Objetivo da Recuperação', value: result.main_objective },
                { label: 'Grau de Impacto', value: result.impact_level },
                { label: 'Status', value: result.status },
                { label: 'Coordenadas', value: result.coordinates },
              ].filter(f => f.value).map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="text-gray-500 text-xs">{label}</span>
                  <span className="font-medium text-gray-900 text-xs text-right max-w-[60%] truncate" title={String(value)}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Arquivo carregado */}
          {result._file_url && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Arquivo Enviado</p>
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5">
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">Documento PRAD</p>
                  <p className="text-[10px] text-gray-400 truncate">{result._file_url.split('/').pop()}</p>
                </div>
                <a href={result._file_url} target="_blank" rel="noreferrer" className="text-[10px] text-gray-600 hover:text-gray-800 underline flex-shrink-0">Visualizar</a>
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {result.ai_analysis && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <p className="text-xs font-semibold text-purple-800">Análise Técnica IA</p>
              </div>
              <p className="text-xs text-purple-900 leading-relaxed">{result.ai_analysis}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setStep('upload'); setResult(null); }}
              className="flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Refazer
            </Button>
            <Button
              type="button"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApply}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Aplicar ao Formulário
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
