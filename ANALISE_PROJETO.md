# Análise Completa do Projeto Sheet Scale Boost

## 📋 Visão Geral

**Sheet Scale Boost** é uma plataforma SaaS completa para gestão de campanhas de marketing digital, integração com Facebook Ads, análise de performance (ROAS), gestão de produtos Shopify e sistema de assinaturas com múltiplos planos.

### Propósito Principal
- Gestão de campanhas publicitárias (Facebook/Meta)
- Análise de performance e ROI (Profit Sheet)
- Integração com Shopify para sincronização de produtos
- Sistema de assinaturas com trial gratuito e planos pagos
- Dashboard administrativo com suporte ao cliente

---

NNNNNNIIIIIIGGGGAAAAA

## 🛠️ Stack Tecnológico

### Frontend
- **React 18.3.1** - Framework principal
- **TypeScript 5.8.3** - Tipagem estática
- **Vite 5.4.19** - Build tool e dev server
- **React Router DOM 6.30.1** - Roteamento
- **TanStack Query 5.83.0** - Gerenciamento de estado servidor
- **Tailwind CSS 3.4.17** - Estilização
- **shadcn/ui** - Componentes UI (Radix UI)
- **Recharts 2.15.4** - Gráficos e visualizações
- **React Hook Form 7.61.1** - Formulários
- **Zod 3.25.76** - Validação de schemas

### Backend/Infraestrutura
- **Supabase** - BaaS (Backend as a Service)
  - PostgreSQL Database
  - Edge Functions (Deno)
  - Authentication
  - Realtime subscriptions
  - Storage

### Integrações Externas
- **Stripe** - Pagamentos e assinaturas
- **Facebook/Meta API** - Gestão de campanhas publicitárias
- **Shopify** - Sincronização de produtos
- **Brevo (Sendinblue)** - Envio de emails

### Ferramentas de Desenvolvimento
- **ESLint 9.32.0** - Linting
- **TypeScript ESLint** - Linting TypeScript
- **PostCSS** - Processamento CSS
- **Autoprefixer** - Compatibilidade CSS

---

## 🏗️ Arquitetura

### Estrutura de Pastas

```
src/
├── components/          # Componentes React reutilizáveis
│   ├── admin/          # Componentes administrativos
│   ├── chat/           # Sistema de chat/suporte
│   ├── dashboard/      # Componentes do dashboard
│   └── ui/             # Componentes base (shadcn/ui)
├── contexts/           # React Contexts (Language, Chat, Currency)
├── hooks/              # Custom React Hooks
├── integrations/       # Integrações externas (Supabase)
├── lib/                # Utilitários e constantes
├── pages/              # Páginas/rotas da aplicação
├── services/           # Camada de serviços (API calls)
├── types/              # Definições TypeScript
└── utils/              # Funções utilitárias

supabase/
├── functions/          # Edge Functions (Deno)
│   ├── _shared/       # Código compartilhado (CORS, rate limiting)
│   └── [function-name]/ # Funções individuais
└── migrations/        # Migrações SQL do banco de dados
```

### Padrões Arquiteturais

1. **Separação de Responsabilidades**
   - Services layer para lógica de negócio
   - Hooks customizados para lógica reutilizável
   - Contexts para estado global
   - Componentes UI separados da lógica

2. **Gerenciamento de Estado**
   - React Query para estado servidor
   - React Context para estado global (idioma, moeda, chat)
   - Local state para componentes isolados

3. **Roteamento**
   - React Router com rotas protegidas
   - Lazy loading implícito via Vite

---

## 🎯 Funcionalidades Principais

### 1. Sistema de Autenticação
- Autenticação via Supabase Auth
- Proteção de rotas
- Gestão de sessão

### 2. Sistema de Assinaturas
**Planos:**
- FREE: Sem acesso (0 lojas, 0 campanhas)
- TRIAL: 10 dias grátis (2 lojas, 40 campanhas)
- BEGINNER: 1 loja, 0 campanhas
- BASIC: 1 loja, 15 campanhas
- STANDARD: 2 lojas, 40 campanhas
- EXPERT: 4 lojas, campanhas ilimitadas

**Recursos:**
- Trial automático de 10 dias
- Verificação de expiração via cron job
- Webhooks Stripe para sincronização
- Histórico de assinaturas
- Estados: active, expired, suspended, archived

### 3. Dashboard e Analytics
- Daily ROAS (Return on Ad Spend)
- Profit Sheet com análise detalhada
- Gráficos de performance (Recharts)
- Filtros por período e loja
- Exportação de dados (CSV, Excel)

### 4. Gestão de Campanhas
- Integração com Facebook Ads API
- Visualização de campanhas ativas
- Métricas: CPC, CPA, ROAS, conversões
- Controle de orçamento
- Filtros e busca

### 5. Integração Shopify
- Conexão OAuth com Shopify
- Sincronização automática de produtos
- Webhooks para atualizações em tempo real
- Gestão de múltiplas lojas

### 6. Product Research
- Pesquisa de produtos via IA
- Análise de mercado
- Recomendações baseadas em dados

### 7. Sistema de Suporte
- Chat widget integrado
- Tickets de suporte
- Modo admin para atendimento
- Realtime updates via Supabase

### 8. Internacionalização
- Suporte a múltiplos idiomas
- Context API para traduções
- Seletor de moeda

### 9. Painel Administrativo
- Gestão de usuários
- Gestão de admins
- Logs de auditoria
- Visualização de tickets

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

1. **profiles**
   - Dados do usuário
   - `subscription_plan`, `subscription_status`
   - `trial_ends_at`

2. **subscriptions**
   - Assinaturas pagas (Stripe)
   - `store_limit`, `campaign_limit`
   - `features_enabled`
   - `current_period_start/end`

3. **subscription_history**
   - Histórico de mudanças de plano
   - Auditoria de assinaturas

4. **campaigns**
   - Campanhas publicitárias
   - Métricas e performance

5. **products**
   - Produtos sincronizados do Shopify
   - Dados de vendas e performance

6. **integrations**
   - Conexões externas (Shopify, Facebook)
   - Tokens OAuth

7. **support_chats**
   - Tickets de suporte
   - Mensagens do chat

8. **audit_logs**
   - Logs de auditoria
   - Rastreamento de eventos

9. **usage_counters**
   - Contadores de uso
   - Limites de recursos

10. **user_activity**
    - Atividade do usuário
    - Tracking de ações

### Migrações
- 28 arquivos de migração SQL
- Evolução incremental do schema
- Suporte a soft deletes (em algumas tabelas)

---

## 🔒 Segurança

### Implementado ✅
- **CORS Restrito**: Lista de domínios permitidos (`_shared/cors.ts`)
- **Rate Limiting**: 10 req/min por usuário (`_shared/rateLimit.ts`)
- **Validação Zod**: Schemas de validação expandidos
- **Error Boundary**: Captura de erros React
- **Logger Condicional**: Logs apenas em desenvolvimento

### Pendente ⚠️
- Aplicar CORS/Rate Limiting a todas as 27 edge functions
- Adicionar domínios de produção ao CORS
- Substituir 522 console.logs por logger
- Sanitização HTML (DOMPurify se necessário)
- Índices de banco de dados para queries frequentes

---

## ⚡ Performance

### Pontos Positivos ✅
- React Query para cache e invalidação
- Lazy loading de componentes
- Vite para build rápido
- SWC para transpilação rápida

### Melhorias Necessárias ⚠️
- Configurar QueryClient com `staleTime` e `cacheTime`
- Implementar paginação em listas grandes
- Virtualização para listas (react-window)
- Debounce em campos de busca
- React.memo em componentes pesados
- Code splitting mais agressivo

---

## 📊 Qualidade de Código

### Pontos Fortes ✅
- TypeScript para type safety
- Componentes reutilizáveis (shadcn/ui)
- Hooks customizados bem organizados
- Separação de concerns (services, hooks, components)
- Constantes centralizadas
- Error boundaries implementados

### Áreas de Melhoria ⚠️

1. **TypeScript Strict Mode**
   - Atualmente desabilitado (`noImplicitAny: false`)
   - `strictNullChecks: false`
   - `noUnusedLocals: false`
   - **Recomendação**: Ativar gradualmente

2. **Console.logs**
   - 522 ocorrências em 57 arquivos
   - Substituir por logger centralizado
   - **Prioridade**: Alta

3. **Edge Functions**
   - Nem todas usam CORS/Rate Limiting
   - Padronizar tratamento de erros
   - **Prioridade**: Alta

4. **Testes**
   - Nenhum teste unitário encontrado
   - **Recomendação**: Implementar Jest/Vitest

5. **Documentação**
   - README básico
   - Falta documentação de API
   - **Recomendação**: Adicionar JSDoc

---

## 🔧 Edge Functions (27 funções)

### Categorias

**Stripe (6 funções)**
- `stripe-create-checkout` - Criar sessão de checkout
- `stripe-create-portal` - Portal do cliente
- `stripe-get-prices` - Listar preços
- `stripe-setup-products` - Configurar produtos
- `stripe-webhook` - Webhook principal
- `stripe-webhook-v2` - Webhook v2

**Shopify (4 funções)**
- `shopify-connect` - Conectar loja
- `shopify-disconnect` - Desconectar
- `shopify-sync-products` - Sincronizar produtos
- `shopify-webhook` - Webhooks Shopify

**Facebook (3 funções)**
- `facebook-oauth-callback` - Callback OAuth
- `facebook-campaigns` - Gestão de campanhas
- `facebook-ads-research` - Pesquisa de anúncios

**Assinaturas (4 funções)**
- `check-expired-subscriptions` - Verificar expirações
- `subscription-state-manager` - Gerenciar estados
- `sync-subscription-to-profile` - Sincronizar perfil
- `billing-upgrade` - Upgrade de plano

**Admin (4 funções)**
- `add-admin` - Adicionar admin
- `get-admins` - Listar admins
- `get-users` - Listar usuários
- `get-entitlements` - Obter permissões

**Outros (6 funções)**
- `profit-sheet-data` - Dados do Profit Sheet
- `send-email` - Envio de emails
- `send-retention-emails` - Emails de retenção
- `setup-cron-jobs` - Configurar cron jobs
- `force-subscription-status` - Forçar status
- `test-brevo-email` - Teste de email

### Status de Segurança
- ✅ CORS e Rate Limiting em `_shared/`
- ⚠️ Apenas algumas funções usam (ex: `billing-upgrade`)
- ⚠️ Maioria ainda precisa implementar

---

## 📈 Métricas e Estatísticas

### Código
- **Componentes React**: ~100+ arquivos
- **Páginas**: 15 rotas principais
- **Hooks Customizados**: 12 hooks
- **Edge Functions**: 27 funções
- **Migrações SQL**: 28 arquivos

### Dependências
- **Produção**: 30+ pacotes
- **Desenvolvimento**: 15+ pacotes
- **Tamanho estimado**: ~50MB (node_modules)

### Console.logs
- **Total**: 522 ocorrências
- **Arquivos afetados**: 57
- **Prioridade alta**: ChatContext, CampaignControl, useAdminSupport

---

## 🚨 Problemas Identificados

### Críticos 🔴
1. **Segurança**: CORS e Rate Limiting não aplicados em todas as edge functions
2. **Logs**: 522 console.logs expõem informações em produção
3. **TypeScript**: Strict mode desabilitado (pode mascarar bugs)

### Importantes 🟡
1. **Performance**: Falta configuração otimizada do React Query
2. **Testes**: Nenhum teste automatizado
3. **Database**: Falta índices em queries frequentes
4. **Documentação**: Documentação técnica insuficiente

### Menores 🟢
1. **UX**: Alguns componentes podem ter loading states melhores
2. **Acessibilidade**: Pode melhorar (ARIA labels, keyboard navigation)
3. **Mobile**: Responsividade pode ser otimizada

---

## ✅ Recomendações Prioritárias

### Curto Prazo (1-2 semanas)
1. ✅ **Substituir console.logs** por logger em arquivos críticos
2. ✅ **Aplicar CORS/Rate Limiting** a todas as edge functions
3. ✅ **Adicionar domínios de produção** ao CORS
4. ✅ **Criar índices** no banco de dados

### Médio Prazo (1 mês)
1. ✅ **Configurar React Query** globalmente (staleTime, cacheTime)
2. ✅ **Implementar testes** unitários básicos
3. ✅ **Ativar TypeScript strict mode** gradualmente
4. ✅ **Otimizar performance** (paginação, virtualização)

### Longo Prazo (2-3 meses)
1. ✅ **CI/CD Pipeline** (GitHub Actions)
2. ✅ **Monitoramento** (Sentry/LogRocket)
3. ✅ **Documentação completa** da API
4. ✅ **Testes E2E** (Playwright/Cypress)

---

## 📝 Conclusão

### Pontos Fortes
- ✅ Arquitetura bem organizada e escalável
- ✅ Stack moderno e performático
- ✅ Funcionalidades completas e bem implementadas
- ✅ Sistema de assinaturas robusto
- ✅ Integrações bem estruturadas

### Áreas de Atenção
- ⚠️ Segurança precisa ser padronizada
- ⚠️ Logs precisam ser centralizados
- ⚠️ Testes precisam ser implementados
- ⚠️ Performance pode ser otimizada

### Avaliação Geral
**Nota: 7.5/10**

O projeto está bem estruturado e funcional, mas precisa de melhorias em segurança, testes e otimização de performance para estar pronto para produção em escala.

---

## 📚 Documentação de Referência

- **Limites de Assinatura**: `SUBSCRIPTION_LIMITS.md`
- **Melhorias Implementadas**: `IMPROVEMENTS.md`
- **Teste de Trial**: `TEST_TRIAL_EXPIRATION.md`
- **Fix de Perfis**: `FIX_PROFILES_SYNC.sql`

---

*Análise realizada em: Janeiro 2025*
*Versão do projeto: 0.0.0*

