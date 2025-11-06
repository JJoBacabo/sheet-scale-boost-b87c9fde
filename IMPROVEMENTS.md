# Melhorias de Segurança, Performance e Código

## ✅ Implementadas Automaticamente

### 1. Segurança
- ✅ **CORS Restrito**: Criado `supabase/functions/_shared/cors.ts` com lista de domínios permitidos
- ✅ **Rate Limiting**: Implementado em `supabase/functions/_shared/rateLimit.ts` (10 req/min por utilizador)
- ✅ **Validação de Input**: Schema Zod expandido em `src/lib/validationSchemas.ts`
- ✅ **Edge Function Atualizada**: `billing-upgrade` usa novo CORS e rate limiting

### 2. Performance
- ✅ **React Query Optimizado**: Substituído `window.location.reload()` por invalidação de queries
- ✅ **Service Layer**: Criado `src/services/subscriptionService.ts` para separar lógica de negócio

### 3. Código
- ✅ **Logger Condicional**: `src/lib/logger.ts` - logs apenas em dev, pronto para produção
- ✅ **Error Boundary**: `src/components/ErrorBoundary.tsx` para capturar erros React
- ✅ **React.StrictMode**: Ativado em `src/main.tsx`
- ✅ **Constantes Centralizadas**: `src/lib/constants.ts` para valores mágicos

### 4. Arquitetura
- ✅ **Separação de Responsabilidades**: Services criados para lógica de API
- ✅ **Shared Utilities**: Edge functions partilham CORS e rate limiting

---

## ⚠️ Melhorias Manuais Necessárias

### 1. TypeScript Strict Mode (tsconfig.json é read-only)
**Contactar administrador para ativar strict mode manualmente**

Adicionar ao `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 2. Substituir console.logs por Logger
**191 ocorrências em 24 ficheiros** precisam ser substituídas manualmente:

```typescript
// ❌ Antes
console.log('Debug info');
console.error('Error:', error);

// ✅ Depois
import { logger } from '@/lib/logger';
logger.info('Debug info');
logger.error('Error:', error);
```

**Ficheiros prioritários:**
- `src/contexts/ChatContext.tsx` (13 console.logs)
- `src/pages/CampaignControl.tsx` (44 console.logs)
- `src/hooks/useAdminSupport.ts` (8 console.logs)

### 3. Atualizar Todas Edge Functions
**Aplicar CORS e Rate Limiting a todas as 20 edge functions:**

```typescript
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

serve(async (req) => {
  const corsResponse = handleCorsPreFlight(req);
  if (corsResponse) return corsResponse;
  
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Rate limiting
  const rateLimit = checkRateLimit(userId, { windowMs: 60000, maxRequests: 60 });
  if (!rateLimit.allowed) {
    return rateLimitResponse(userId, rateLimit.resetTime);
  }
  
  // ... rest of logic
});
```

### 4. Adicionar Domínios de Produção
**Editar `supabase/functions/_shared/cors.ts`:**

```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://cygvvrtsdatdczswcrqj.supabase.co',
  'https://SEU-DOMINIO-PRODUCAO.com',  // ⚠️ ADICIONAR AQUI
  'https://www.SEU-DOMINIO-PRODUCAO.com',
];
```

### 5. Performance - React Query Config
**Adicionar ao `src/main.tsx`:**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Wrap App com QueryClientProvider
```

### 6. Database - Índices e Constraints
**Executar no SQL Editor do Supabase:**

```sql
-- Adicionar índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id 
  ON subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
  ON subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_usage_counters_user_id 
  ON usage_counters(user_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id_timestamp 
  ON user_activity(user_id, created_at DESC);

-- Soft deletes (se apropriado)
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
```

---

## 📋 Checklist de Implementação

### Segurança
- [x] CORS restrito com domínios permitidos
- [x] Rate limiting básico implementado
- [x] Validação Zod expandida
- [ ] Sanitização HTML (adicionar DOMPurify se necessário)
- [ ] Atualizar TODAS edge functions com CORS/rate limiting
- [ ] Adicionar domínios de produção ao CORS

### Performance
- [x] React Query invalidation (sem reloads)
- [ ] Configurar QueryClient com staleTime/cacheTime
- [ ] Implementar paginação em listas grandes
- [ ] Virtualização para listas (react-window)
- [ ] Debounce em campos de busca
- [ ] React.memo em componentes pesados

### Código
- [x] Logger condicional criado
- [x] Error Boundary implementado
- [x] React.StrictMode ativado
- [x] Constantes centralizadas
- [ ] Substituir 191 console.logs por logger
- [ ] TypeScript strict mode (manual)
- [ ] Testes unitários (Jest/Vitest)

### UX/UI
- [x] Remover window.location.reload
- [ ] Loading skeletons em mais páginas
- [ ] Confirmações para ações destrutivas
- [ ] Retry automático em falhas de rede
- [ ] Melhorar responsividade mobile

### Database
- [ ] Adicionar índices (SQL acima)
- [ ] Implementar soft deletes
- [ ] Otimizar queries complexas
- [ ] Cache de queries pesadas

### DevOps
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Pre-commit hooks (husky + lint-staged)
- [ ] Monitoramento (Sentry/LogRocket)
- [ ] Health checks
- [ ] Versionamento de API

---

## 🚀 Próximos Passos Prioritários

1. **Substituir console.logs** em ficheiros críticos (ChatContext, CampaignControl)
2. **Aplicar CORS/Rate Limiting** às restantes edge functions
3. **Adicionar domínios de produção** ao CORS
4. **Criar índices** no banco de dados
5. **Configurar React Query** globalmente
6. **TypeScript strict mode** (coordenar com admin)

---

## 📚 Documentação Adicional

- Logger: `src/lib/logger.ts`
- Error Boundary: `src/components/ErrorBoundary.tsx`
- CORS Utils: `supabase/functions/_shared/cors.ts`
- Rate Limiting: `supabase/functions/_shared/rateLimit.ts`
- Services: `src/services/subscriptionService.ts`
- Constants: `src/lib/constants.ts`
- Validation: `src/lib/validationSchemas.ts`
