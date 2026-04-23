import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  Users,
  Handshake,
  UserCheck,
  ClipboardList,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Star,
  Zap
} from 'lucide-react';

const CARD_DATA = [
  {
    icon: Handshake,
    title: 'Parceiro PRUMO',
    badge: 'Comercial',
    badgeColor: 'bg-amber-500',
    borderColor: 'border-amber-400/40',
    description:
      'O Parceiro PRUMO atua de forma mais ativa na apresentação e comercialização da plataforma. Ele realiza o contato com produtores ou profissionais interessados, apresenta o funcionamento do sistema e conduz o fechamento da contratação.',
    benefits: [
      'Participação direta nos fechamentos',
      'Comissão maior sobre contratos realizados',
      'Possibilidade de ampliar sua atuação profissional no agro',
    ],
  },
  {
    icon: UserCheck,
    title: 'Parceiro Indicador PRUMO',
    badge: 'Indicação',
    badgeColor: 'bg-emerald-500',
    borderColor: 'border-emerald-400/40',
    description:
      'O Parceiro Indicador PRUMO apenas realiza a indicação de potenciais clientes. Após a indicação, a equipe do PRUMO assume o atendimento e o processo de apresentação da plataforma.',
    benefits: [
      'Modelo simples de indicação',
      'Comissão sobre clientes indicados',
      'Forma prática de participar do ecossistema PRUMO',
    ],
  },
];

const STEPS = [
  {
    icon: ClipboardList,
    number: '01',
    title: 'Cadastre-se',
    description: 'Demonstre interesse em participar do Programa de Parceiros PRUMO.',
  },
  {
    icon: Users,
    number: '02',
    title: 'Indique ou apresente o PRUMO',
    description: 'Escolha a forma de participação que melhor se encaixa no seu perfil profissional.',
  },
  {
    icon: TrendingUp,
    number: '03',
    title: 'Gere oportunidades',
    description: 'Receba comissões sobre contratações realizadas a partir de suas indicações ou fechamentos.',
  },
];

const WHO_CAN = [
  'Engenheiros agrônomos',
  'Engenheiros ambientais',
  'Engenheiros florestais',
  'Técnicos agrícolas',
  'Consultores ambientais',
  'Advogados da área ambiental ou rural',
  'Empresas de consultoria',
  'Profissionais que atuam no agro',
];

const EMPTY_FORM = {
  nome: '',
  email: '',
  telefone: '',
  profissao: '',
  cidade: '',
  empresa: '',
  tipo_parceria: '',
};

export default function ParceiroPrumoSection() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tipo_parceria) {
      toast.error('Selecione o tipo de parceria de interesse.');
      return;
    }
    setLoading(true);
    try {
      await base44.entities.ParceiroPrumo.create(form);
      setSubmitted(true);
      setForm(EMPTY_FORM);
      toast.success('Cadastro realizado! Em breve entraremos em contato.');
    } catch (err) {
      toast.error('Erro ao enviar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="parceiros" className="relative py-24 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-2xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold mb-6">
            <Star className="w-4 h-4" />
            Programa de Parceiros
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight">
            Seja Parceiro <span className="text-amber-400">PRUMO</span>
          </h2>
          <p className="text-emerald-200 text-lg max-w-2xl mx-auto leading-relaxed">
            Participe do Programa de Parceiros PRUMO e ajude a levar tecnologia e organização para produtores e profissionais do agro.
          </p>
        </div>

        {/* Intro text */}
        <div className="max-w-3xl mx-auto mb-16 p-6 rounded-2xl border border-emerald-700/40 bg-emerald-800/20 backdrop-blur-sm text-center">
          <p className="text-emerald-200 leading-relaxed text-base">
            O PRUMO é uma plataforma desenvolvida para organizar projetos, documentos e demandas da gestão ambiental e rural.
            Para ampliar o acesso à tecnologia no agro, o PRUMO conta com um <strong className="text-white">Programa de Parceiros</strong>, permitindo que profissionais e empresas participem da expansão da plataforma e gerem novas oportunidades de negócio.
          </p>
          <p className="text-amber-400 font-semibold mt-4">
            Existem duas formas de participar do programa.
          </p>
        </div>

        {/* Partnership Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          {CARD_DATA.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className={`relative rounded-2xl border ${card.borderColor} bg-white/5 backdrop-blur-sm p-8 hover:bg-white/8 transition-all duration-300`}
              >
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-800/60 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full text-white ${card.badgeColor} mb-2 inline-block`}>
                      {card.badge}
                    </span>
                    <h3 className="text-xl font-bold text-white">{card.title}</h3>
                  </div>
                </div>
                <p className="text-emerald-200 text-sm leading-relaxed mb-6">{card.description}</p>
                <ul className="space-y-2.5">
                  {card.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* How it works */}
        <div className="mb-20">
          <h3 className="text-2xl font-bold text-white text-center mb-10 flex items-center justify-center gap-2">
            <Zap className="w-6 h-6 text-amber-400" />
            Como funciona
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative text-center">
                  {i < STEPS.length - 1 && (
                    <div className="hidden sm:block absolute top-8 left-1/2 w-full border-t border-dashed border-emerald-700/50" />
                  )}
                  <div className="relative z-10 inline-flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-800 border border-emerald-600/50 flex items-center justify-center mb-4 shadow-lg">
                      <Icon className="w-7 h-7 text-amber-400" />
                    </div>
                    <span className="text-xs font-bold text-amber-500 mb-1">{step.number}</span>
                    <h4 className="text-base font-bold text-white mb-2">{step.title}</h4>
                    <p className="text-sm text-emerald-300 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Who can participate */}
        <div className="mb-20 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-white text-center mb-8">
            Quem pode participar
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WHO_CAN.map((item) => (
              <div key={item} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-800/20 border border-emerald-700/30">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-emerald-100 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA + Form */}
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-3">Quero ser Parceiro PRUMO</h3>
            <p className="text-emerald-300 text-sm">Preencha o formulário abaixo e nossa equipe entrará em contato.</p>
          </div>

          {submitted ? (
            <div className="text-center py-12 rounded-2xl border border-emerald-500/40 bg-emerald-800/20">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h4 className="text-xl font-bold text-white mb-2">Cadastro recebido!</h4>
              <p className="text-emerald-300">Em breve nossa equipe entrará em contato com você.</p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-6 text-sm text-amber-400 hover:text-amber-300 underline"
              >
                Fazer novo cadastro
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-emerald-700/40 bg-white/5 backdrop-blur-sm p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1.5">Nome completo *</label>
                  <input
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    required
                    placeholder="Seu nome completo"
                    className="w-full px-4 py-2.5 rounded-xl bg-emerald-900/60 border border-emerald-700/50 text-white placeholder-emerald-500 text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1.5">Email *</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="seu@email.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-emerald-900/60 border border-emerald-700/50 text-white placeholder-emerald-500 text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1.5">Telefone / WhatsApp *</label>
                  <input
                    name="telefone"
                    value={form.telefone}
                    onChange={handleChange}
                    required
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2.5 rounded-xl bg-emerald-900/60 border border-emerald-700/50 text-white placeholder-emerald-500 text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1.5">Profissão *</label>
                  <input
                    name="profissao"
                    value={form.profissao}
                    onChange={handleChange}
                    required
                    placeholder="Ex: Engenheiro Agrônomo"
                    className="w-full px-4 py-2.5 rounded-xl bg-emerald-900/60 border border-emerald-700/50 text-white placeholder-emerald-500 text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1.5">Cidade / Estado *</label>
                  <input
                    name="cidade"
                    value={form.cidade}
                    onChange={handleChange}
                    required
                    placeholder="Ex: Cuiabá / MT"
                    className="w-full px-4 py-2.5 rounded-xl bg-emerald-900/60 border border-emerald-700/50 text-white placeholder-emerald-500 text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1.5">Empresa <span className="text-emerald-600">(opcional)</span></label>
                  <input
                    name="empresa"
                    value={form.empresa}
                    onChange={handleChange}
                    placeholder="Nome da empresa"
                    className="w-full px-4 py-2.5 rounded-xl bg-emerald-900/60 border border-emerald-700/50 text-white placeholder-emerald-500 text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-300 mb-1.5">Tipo de parceria de interesse *</label>
                <select
                  name="tipo_parceria"
                  value={form.tipo_parceria}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-emerald-900/60 border border-emerald-700/50 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-colors appearance-none"
                >
                  <option value="" disabled className="text-emerald-500">Selecione uma opção</option>
                  <option value="Parceiro PRUMO (fechamento de clientes)">Parceiro PRUMO — fechamento de clientes</option>
                  <option value="Parceiro Indicador PRUMO (apenas indicação)">Parceiro Indicador PRUMO — apenas indicação</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-base transition-all duration-200 shadow-lg shadow-amber-500/20 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Quero ser Parceiro PRUMO
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}