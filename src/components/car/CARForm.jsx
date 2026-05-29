import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Leaf, MapPin, Save, X, Sparkles } from 'lucide-react';

const LIABILITIES = [
  'Déficit de Reserva Legal', 'Déficit de APP', 'Área degradada',
  'Uso irregular em APP', 'Compensação de Reserva Legal', 'Servidão ambiental', 'Outro'
];

const defaultForm = {
  car_number: '', car_status: 'Pendente de análise', car_registration_date: '',
  car_last_update: '', car_area_hectares: '', car_inconsistencies: '', car_notes: '',
  pra_status: 'Não aderido', pra_term_number: '', pra_adhesion_date: '',
  pra_deadline: '', pra_environmental_agency: '', pra_notes: '',
  environmental_liabilities: [],
  recovery_project_status: 'Não possui', recovery_technician: '', recovery_start_date: '',
  recovery_deadline: '', recovery_area_hectares: '', recovery_notes: '',
  ai_analysis: '',
  app_hectares: '',
  legal_reserve_hectares: '',
  consolidated_area_hectares: '',
  native_vegetation_hectares: '',
  legal_reserve_to_recover_hectares: '',
  app_to_recover_hectares: '',
  owner_name: '',
  municipality: '',
  state: '',
  registration_numbers: '',
  coordinates: '',
  native_vegetation_hectares: '',
  passive_rl_balance_hectares: '',
  use_restriction_to_recover_hectares: '',
  car_situation: '',
  owner_cpf_cnpj: '',
  last_rectification_date: '',
  registration_details: '',
  car_custom_title: '',
};

export default function CARForm({ initial, onSubmit, onCancel, isLoading, aiAnalysis }) {
  const [form, setForm] = useState({ ...defaultForm, ...initial });

  useEffect(() => { if (initial) setForm({ ...defaultForm, ...initial }); }, [initial]);

  useEffect(() => {
    if (aiAnalysis && aiAnalysis !== form.ai_analysis) {
      set('ai_analysis', aiAnalysis);
    }
  }, [aiAnalysis]);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const toggleLiability = (val) => {
    setForm(p => ({
      ...p,
      environmental_liabilities: p.environmental_liabilities.includes(val)
        ? p.environmental_liabilities.filter(v => v !== val)
        : [...p.environmental_liabilities, val]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      car_area_hectares: form.car_area_hectares !== '' ? parseFloat(form.car_area_hectares) : null,
      recovery_area_hectares: form.recovery_area_hectares !== '' ? parseFloat(form.recovery_area_hectares) : null,
      app_hectares: form.app_hectares !== '' ? parseFloat(form.app_hectares) : null,
      legal_reserve_hectares: form.legal_reserve_hectares !== '' ? parseFloat(form.legal_reserve_hectares) : null,
      consolidated_area_hectares: form.consolidated_area_hectares !== '' ? parseFloat(form.consolidated_area_hectares) : null,
      native_vegetation_hectares: form.native_vegetation_hectares !== '' ? parseFloat(form.native_vegetation_hectares) : null,
      legal_reserve_to_recover_hectares: form.legal_reserve_to_recover_hectares !== '' ? parseFloat(form.legal_reserve_to_recover_hectares) : null,
      app_to_recover_hectares: form.app_to_recover_hectares !== '' ? parseFloat(form.app_to_recover_hectares) : null,
      native_vegetation_hectares: form.native_vegetation_hectares !== '' ? parseFloat(form.native_vegetation_hectares) : null,
      passive_rl_balance_hectares: form.passive_rl_balance_hectares !== '' ? parseFloat(form.passive_rl_balance_hectares) : null,
      use_restriction_to_recover_hectares: form.use_restriction_to_recover_hectares !== '' ? parseFloat(form.use_restriction_to_recover_hectares) : null,
    };
    onSubmit(data);
  };

  const showPRA = form.pra_status !== 'Não aderido';
  const showRecovery = form.recovery_project_status !== 'Não possui';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* AI Analysis banner */}
      {form.ai_analysis && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <p className="text-xs font-semibold text-purple-800">Análise Técnica Ambiental (IA)</p>
          </div>
          <p className="text-xs text-purple-900 leading-relaxed">{form.ai_analysis}</p>
        </div>
      )}
      {/* CAR */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-600" />Dados do CAR</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div><Label className="text-xs">Número do CAR</Label><Input value={form.car_number} onChange={e => set('car_number', e.target.value)} placeholder="Ex: SP-3500105-..." /></div>
          <div>
            <Label className="text-xs">Título Personalizado (opcional)</Label>
            <Input value={form.car_custom_title} onChange={e => set('car_custom_title', e.target.value)} placeholder="Ex: Gleba Norte, Sítio das Pedras..." />
            <p className="text-[10px] text-gray-400 mt-0.5">Se preenchido, substitui "CAR 1", "CAR 2" na exibição.</p>
          </div>
          <div><Label className="text-xs">Situação do CAR *</Label>
            <Select value={form.car_status} onValueChange={v => set('car_status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Validado','Em análise pelo órgão ambiental','Pendente de análise','Com inconsistências','Cancelado','Necessita retificação'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Data de Cadastro</Label><Input type="date" value={form.car_registration_date} onChange={e => set('car_registration_date', e.target.value)} /></div>
          <div><Label className="text-xs">Última Atualização</Label><Input type="date" value={form.car_last_update} onChange={e => set('car_last_update', e.target.value)} /></div>
          <div><Label className="text-xs">Área Declarada no CAR (ha)</Label><Input type="number" step="0.01" value={form.car_area_hectares} onChange={e => set('car_area_hectares', e.target.value)} /></div>
          <div><Label className="text-xs">APP (ha)</Label><Input type="number" step="0.01" value={form.app_hectares} onChange={e => set('app_hectares', e.target.value)} /></div>
          <div><Label className="text-xs">Reserva Legal (ha)</Label><Input type="number" step="0.01" value={form.legal_reserve_hectares} onChange={e => set('legal_reserve_hectares', e.target.value)} /></div>
          <div><Label className="text-xs">Área Consolidada (ha)</Label><Input type="number" step="0.01" value={form.consolidated_area_hectares} onChange={e => set('consolidated_area_hectares', e.target.value)} /></div>
          <div><Label className="text-xs">Veg. Nativa Remanescente (ha)</Label><Input type="number" step="0.01" value={form.native_vegetation_hectares} onChange={e => set('native_vegetation_hectares', e.target.value)} /></div>
          <div><Label className="text-xs">RL a Recompor (ha)</Label><Input type="number" step="0.01" value={form.legal_reserve_to_recover_hectares} onChange={e => set('legal_reserve_to_recover_hectares', e.target.value)} /></div>
          <div><Label className="text-xs">APP a Recompor (ha)</Label><Input type="number" step="0.01" value={form.app_to_recover_hectares} onChange={e => set('app_to_recover_hectares', e.target.value)} /></div>
          <div><Label className="text-xs">Veg. Nativa Remanescente (ha)</Label><Input type="number" step="0.01" value={form.native_vegetation_hectares} onChange={e => set('native_vegetation_hectares', e.target.value)} /></div>
          <div><Label className="text-xs">Passivo/Excedente RL (ha) — negativo = déficit</Label><Input type="number" step="0.01" value={form.passive_rl_balance_hectares} onChange={e => set('passive_rl_balance_hectares', e.target.value)} /></div>
          <div><Label className="text-xs">Uso Restrito a Recompor (ha)</Label><Input type="number" step="0.01" value={form.use_restriction_to_recover_hectares} onChange={e => set('use_restriction_to_recover_hectares', e.target.value)} /></div>
          <div><Label className="text-xs">Proprietário</Label><Input value={form.owner_name} onChange={e => set('owner_name', e.target.value)} /></div>
          <div><Label className="text-xs">CPF/CNPJ do Proprietário</Label><Input value={form.owner_cpf_cnpj} onChange={e => set('owner_cpf_cnpj', e.target.value)} placeholder="Ex: 000.000.000-00" /></div>
          <div><Label className="text-xs">Matrículas</Label><Input value={form.registration_numbers} onChange={e => set('registration_numbers', e.target.value)} /></div>
          <div><Label className="text-xs">Data da Última Retificação</Label><Input type="date" value={form.last_rectification_date} onChange={e => set('last_rectification_date', e.target.value)} /></div>
          <div className="md:col-span-2"><Label className="text-xs">Matrículas Detalhadas</Label><Textarea value={form.registration_details} onChange={e => set('registration_details', e.target.value)} rows={3} placeholder="Ex: Matrícula 28.356, registrada em 12/03/1998, Livro 3, Folha 45, Cartório de Imóveis de Santa Bárbara do Sul/RS" /></div>
          {(form.car_status === 'Com inconsistências' || form.car_status === 'Necessita retificação') && (
            <div className="md:col-span-2"><Label className="text-xs">Descrição das Inconsistências</Label><Textarea value={form.car_inconsistencies} onChange={e => set('car_inconsistencies', e.target.value)} rows={2} /></div>
          )}
          <div className="md:col-span-2"><Label className="text-xs">Observações</Label><Textarea value={form.car_notes} onChange={e => set('car_notes', e.target.value)} rows={2} /></div>
        </CardContent>
      </Card>

      {/* PRA */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Leaf className="w-4 h-4 text-green-600" />Programa de Regularização Ambiental (PRA)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label className="text-xs">Status do PRA</Label>
              <Select value={form.pra_status} onValueChange={v => set('pra_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Não aderido','Em processo de adesão','Aderido','Em execução','Concluído'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {showPRA && <>
              <div><Label className="text-xs">Número do Termo de Compromisso</Label><Input value={form.pra_term_number} onChange={e => set('pra_term_number', e.target.value)} /></div>
              <div><Label className="text-xs">Data de Adesão</Label><Input type="date" value={form.pra_adhesion_date} onChange={e => set('pra_adhesion_date', e.target.value)} /></div>
              <div><Label className="text-xs">Prazo de Regularização</Label><Input type="date" value={form.pra_deadline} onChange={e => set('pra_deadline', e.target.value)} /></div>
              <div className="md:col-span-2"><Label className="text-xs">Órgão Ambiental Responsável</Label><Input value={form.pra_environmental_agency} onChange={e => set('pra_environmental_agency', e.target.value)} placeholder="Ex: SEMA-MT, SMA-SP..." /></div>
              <div className="md:col-span-2"><Label className="text-xs">Observações do PRA</Label><Textarea value={form.pra_notes} onChange={e => set('pra_notes', e.target.value)} rows={2} /></div>
            </>}
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-700">Tipos de Passivo Ambiental</Label>
            <div className="grid sm:grid-cols-2 gap-2 mt-2">
              {LIABILITIES.map(lib => (
                <label key={lib} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <Checkbox
                    checked={form.environmental_liabilities.includes(lib)}
                    onCheckedChange={() => toggleLiability(lib)}
                  />
                  <span className="text-sm text-gray-700">{lib}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projeto de Recuperação */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-600" />Projeto de Recuperação Ambiental</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label className="text-xs">Status do Projeto</Label>
              <Select value={form.recovery_project_status} onValueChange={v => set('recovery_project_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Não possui','PRAD em elaboração','PRAD aprovado','PRAD em execução','PRAD concluído'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {showRecovery && <>
              <div><Label className="text-xs">Responsável Técnico</Label><Input value={form.recovery_technician} onChange={e => set('recovery_technician', e.target.value)} /></div>
              <div><Label className="text-xs">Área em Recuperação (ha)</Label><Input type="number" step="0.01" value={form.recovery_area_hectares} onChange={e => set('recovery_area_hectares', e.target.value)} /></div>
              <div><Label className="text-xs">Data de Início</Label><Input type="date" value={form.recovery_start_date} onChange={e => set('recovery_start_date', e.target.value)} /></div>
              <div><Label className="text-xs">Prazo de Execução</Label><Input type="date" value={form.recovery_deadline} onChange={e => set('recovery_deadline', e.target.value)} /></div>
              <div className="md:col-span-2"><Label className="text-xs">Observações</Label><Textarea value={form.recovery_notes} onChange={e => set('recovery_notes', e.target.value)} rows={2} /></div>
            </>}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-1" />Cancelar</Button>}
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
          <Save className="w-4 h-4 mr-1" />{isLoading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}