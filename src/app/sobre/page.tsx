'use client'

import Link from 'next/link'
import { Calendar, Music, Users, Bell, Shield, Smartphone, BarChart3, MessageCircle } from 'lucide-react'

const features = [
  {
    icon: <Calendar className="w-6 h-6" />,
    title: 'Escalas Inteligentes',
    description: 'Gere escalas automaticamente respeitando bloqueios, gênero dos vocais e padrão de banda.',
  },
  {
    icon: <Music className="w-6 h-6" />,
    title: 'Gestão de Louvores',
    description: 'Set list completo com versão, ministro, links do YouTube e geração automática de repertório.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Múltiplos Ministérios',
    description: 'Gerencie louvor, intercessão, som, iluminação, projeção e todos os ministérios em um só lugar.',
  },
  {
    icon: <Bell className="w-6 h-6" />,
    title: 'Notificações Push',
    description: 'Membros recebem avisos automáticos no celular quando estão escalados.',
  },
  {
    icon: <MessageCircle className="w-6 h-6" />,
    title: 'Mensagens WhatsApp',
    description: 'Envie lembretes personalizados via WhatsApp para todos os escalados da semana.',
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: 'App Instalável (PWA)',
    description: 'Instale direto na tela inicial do celular. Funciona como app nativo, sem precisar da loja.',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Controle de Acesso',
    description: 'Área do admin, área do líder e área do membro. Cada um vê apenas o que precisa.',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Dashboard e Relatórios',
    description: 'Visão geral dos ministérios, membros, líderes e frequência de escalas.',
  },
]

const memberFeatures = [
  'Ver sua escala do mês (semanal e mensal)',
  'Consultar louvores com versão e ministro',
  'Ver equipe completa de cada dia',
  'Receber notificações push no celular',
  'Sugerir louvores para o repertório',
  'Redefinir senha pelo app',
]

const adminFeatures = [
  'Gerar escalas automáticas ou manuais',
  'Gerenciar membros, bloqueios e funções',
  'Cadastrar e gerar louvores por evento',
  'Publicar/ocultar escalas para membros',
  'Enviar lembretes via WhatsApp',
  'Enviar notificações push em massa',
  'Exportar escalas em PDF e CSV',
  'Configurar padrão de banda e tipos de escala',
  'Dashboard com visão geral de todos os ministérios',
]

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#58a6ff]/10 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto px-6 py-20 text-center relative">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 overflow-hidden">
            <img src="/icon-512.png" alt="Worship Planner" className="w-full h-full object-cover rounded-2xl" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Worship Planner
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            A plataforma completa para gestão de escalas, louvores e ministérios da sua igreja.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-4 bg-white text-black font-bold rounded-2xl text-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Acessar o App
            </Link>
            <a
              href="#funcionalidades"
              className="px-8 py-4 border border-white/20 rounded-2xl text-lg font-medium hover:bg-white/5 transition-colors"
            >
              Ver Funcionalidades
            </a>
          </div>

          {/* Phone Mockups */}
          <div className="flex flex-col md:flex-row justify-center items-center gap-8 mt-12 px-4">
            {/* Phone 1 - Member View */}
            <div className="w-[280px]">
              <div className="bg-[#0d1117] border-2 border-[#30363d] rounded-[2.5rem] p-4 shadow-2xl">
                <div className="bg-black rounded-[2rem] overflow-hidden">
                  <div className="h-7 bg-black flex items-center justify-center">
                    <div className="w-20 h-4 bg-[#1c2128] rounded-full" />
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-xs font-bold text-center">Worship Planner</p>
                    <div className="bg-[#161b22] rounded-xl p-3">
                      <p className="text-[10px] font-bold">Olá, Michele! 👋</p>
                      <p className="text-[9px] text-gray-400 italic mt-1">&ldquo;Cantai ao Senhor um cântico novo&rdquo;</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-[#1c2128] rounded-xl py-2.5 text-center"><p className="text-[9px] text-gray-400">Mensal</p></div>
                      <div className="flex-1 bg-[#58a6ff] rounded-xl py-2.5 text-center"><p className="text-[9px] text-white font-bold">Semanal</p></div>
                    </div>
                    <div className="bg-[#161b22] border border-[#22c55e]/30 rounded-xl p-3 space-y-1.5">
                      <p className="text-[9px] text-gray-400">Sábado, 15/08</p>
                      <p className="text-xs font-bold text-[#22c55e]">ALIVE</p>
                      <div className="flex gap-1 flex-wrap">
                        <span className="text-[8px] bg-[#22c55e]/20 text-[#22c55e] px-1.5 py-0.5 rounded-md">🎤 Vocal 2 Michele</span>
                      </div>
                      <div className="border-t border-[#30363d] pt-2 mt-2 space-y-1">
                        <p className="text-[8px] text-gray-400">1. O Vento Encontra o Fogo</p>
                        <p className="text-[8px] text-gray-400">2. No Trono</p>
                        <p className="text-[8px] text-gray-400">3. Em Volta do Teu Trono</p>
                      </div>
                    </div>
                    <div className="bg-[#161b22] border border-[#22c55e]/30 rounded-xl p-3 space-y-1.5">
                      <p className="text-[9px] text-gray-400">Domingo, 16/08</p>
                      <p className="text-xs font-bold text-[#22c55e]">CELEBRAÇÃO</p>
                      <div className="flex gap-1 flex-wrap">
                        <span className="text-[8px] bg-[#1c2128] text-gray-400 px-1.5 py-0.5 rounded-md">🎤 V1 Covalsqui</span>
                        <span className="text-[8px] bg-[#1c2128] text-gray-400 px-1.5 py-0.5 rounded-md">🎤 V3 Érica</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-gray-500 mt-3 font-medium">Visão do Membro</p>
            </div>

            {/* Phone 2 - Admin View */}
            <div className="w-[280px]">
              <div className="bg-[#0d1117] border-2 border-[#30363d] rounded-[2.5rem] p-4 shadow-2xl">
                <div className="bg-black rounded-[2rem] overflow-hidden">
                  <div className="h-7 bg-black flex items-center justify-center">
                    <div className="w-20 h-4 bg-[#1c2128] rounded-full" />
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-xs font-bold text-center">Worship Planner</p>
                    <div className="flex gap-1">
                      <div className="flex-1 bg-[#58a6ff] rounded-lg py-1.5 text-center"><p className="text-[8px] text-white font-bold">Escalas</p></div>
                      <div className="flex-1 bg-[#1c2128] rounded-lg py-1.5 text-center"><p className="text-[8px] text-gray-400">Membros</p></div>
                      <div className="flex-1 bg-[#1c2128] rounded-lg py-1.5 text-center"><p className="text-[8px] text-gray-400">Músicas</p></div>
                    </div>
                    <p className="text-[10px] text-center font-semibold">Agosto 2026</p>
                    <div className="bg-[#161b22] rounded-xl overflow-hidden">
                      <div className="grid grid-cols-5 gap-px bg-[#30363d] text-[7px] text-gray-400">
                        <div className="bg-[#1c2128] p-1.5">Sem</div>
                        <div className="bg-[#1c2128] p-1.5">Data</div>
                        <div className="bg-[#1c2128] p-1.5">Culto</div>
                        <div className="bg-[#1c2128] p-1.5">V1</div>
                        <div className="bg-[#1c2128] p-1.5">V2</div>
                      </div>
                      {[['1','01/08','ALIVE','Cova','Érica'],['1','02/08','CELEB','Edu','Mavi'],['2','07/08','STRNG','Mat','Edu'],['2','09/08','CELEB','Mat','Mich'],['3','15/08','ALIVE','Mat','Nicole']].map(([sem,d,c,v1,v2],i) => (
                        <div key={i} className="grid grid-cols-5 gap-px bg-[#30363d] text-[7px]">
                          <div className="bg-[#0d1117] p-1.5 text-gray-500">{sem}</div>
                          <div className="bg-[#0d1117] p-1.5">{d}</div>
                          <div className="bg-[#0d1117] p-1.5 text-[#22c55e] font-bold">{c}</div>
                          <div className="bg-[#0d1117] p-1.5 text-gray-300">{v1}</div>
                          <div className="bg-[#0d1117] p-1.5 text-gray-300">{v2}</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#1c2128] border border-[#30363d] rounded-xl py-3 text-center">
                        <p className="text-[9px] font-semibold">+ GERAR</p>
                      </div>
                      <div className="bg-[#1c2128] border border-[#2ea043]/40 rounded-xl py-3 text-center">
                        <p className="text-[9px] text-[#3fb950] font-semibold">✓ PUBLICAR</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-gray-500 mt-3 font-medium">Painel Admin</p>
            </div>

            {/* Phone 3 - Messages */}
            <div className="w-[280px]">
              <div className="bg-[#0d1117] border-2 border-[#30363d] rounded-[2.5rem] p-4 shadow-2xl">
                <div className="bg-black rounded-[2rem] overflow-hidden">
                  <div className="h-7 bg-black flex items-center justify-center">
                    <div className="w-20 h-4 bg-[#1c2128] rounded-full" />
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-xs font-bold text-center">Envio de Mensagens</p>
                    <p className="text-[9px] text-center text-gray-400">Semana 3 - Agosto 2026</p>
                    <div className="bg-[#161b22] rounded-xl p-3 space-y-2.5">
                      {['Covalsqui Arrabal','Érica Alencar','Francieli Morais','José Vitor','Mateus Luna','Nicole Nunes'].map((name,i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div>
                            <p className="text-[9px] font-medium">{name}</p>
                            <p className="text-[7px] text-gray-500">Sáb 15/08, Dom 16/08</p>
                          </div>
                          <div className="bg-[#25d366] text-white text-[7px] px-2 py-1 rounded-lg font-bold">
                            Enviar
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#58a6ff] rounded-xl py-3 text-center">
                      <p className="text-[9px] text-white font-bold">🔔 Notificar Todos (Push)</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-gray-500 mt-3 font-medium">Mensagens WhatsApp</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="funcionalidades" className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Funcionalidades</h2>
        <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
          Tudo que sua equipe de louvor e ministérios precisa em uma única plataforma.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-6 hover:border-[#58a6ff]/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[#58a6ff]/10 flex items-center justify-center text-[#58a6ff] mb-4">
                {feature.icon}
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Member vs Admin */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Para cada perfil, uma experiência</h2>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Membro */}
          <div className="bg-[#0d1117] border border-[#22c55e]/30 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#22c55e]" />
              </div>
              <h3 className="text-xl font-bold text-[#22c55e]">Área do Membro</h3>
            </div>
            <ul className="space-y-3">
              {memberFeatures.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-[#22c55e] mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Admin */}
          <div className="bg-[#0d1117] border border-[#58a6ff]/30 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#58a6ff]/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#58a6ff]" />
              </div>
              <h3 className="text-xl font-bold text-[#58a6ff]">Área do Admin</h3>
            </div>
            <ul className="space-y-3">
              {adminFeatures.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-[#58a6ff] mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Como funciona</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-[#58a6ff]/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-[#58a6ff]">1</span>
            </div>
            <h4 className="font-semibold mb-2">Cadastre seus membros</h4>
            <p className="text-sm text-gray-400">Adicione vocais, músicos e membros de cada ministério com suas funções.</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-[#58a6ff]/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-[#58a6ff]">2</span>
            </div>
            <h4 className="font-semibold mb-2">Gere a escala</h4>
            <p className="text-sm text-gray-400">Selecione os dias e gere automaticamente. O sistema distribui de forma equilibrada.</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-[#58a6ff]/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-[#58a6ff]">3</span>
            </div>
            <h4 className="font-semibold mb-2">Publique e notifique</h4>
            <p className="text-sm text-gray-400">Publique para os membros verem no app e envie lembretes via WhatsApp ou push.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="bg-gradient-to-br from-[#0d1117] to-[#161b22] border border-[#30363d] rounded-3xl p-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Pronto para organizar suas escalas?</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Comece agora mesmo. Sem cartão de crédito, sem complicação.
          </p>
          <Link
            href="/login"
            className="inline-block px-10 py-4 bg-[#58a6ff] text-white font-bold rounded-2xl text-lg hover:bg-[#4c94e0] transition-colors shadow-lg shadow-[#58a6ff]/20"
          >
            Entrar no Worship Planner
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#30363d] py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/icon-192.png" alt="" className="w-6 h-6 rounded" />
            <span className="text-sm font-medium">Worship Planner</span>
          </div>
          <p className="text-xs text-gray-500">
            Desenvolvido para a Igreja Amor e Cuidado
          </p>
        </div>
      </footer>
    </div>
  )
}
