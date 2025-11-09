# 📊 Sincronização de Dados do Facebook

## ✅ O que foi implementado

### 1. Nova Edge Function: `sync-facebook-campaigns`

**Localização:** `supabase/functions/sync-facebook-campaigns/index.ts`

**Funcionalidades:**
- Busca todas as campanhas do Facebook Ads via Graph API
- Processa insights diários de cada campanha
- Salva/atualiza dados na tabela `campaigns`
- Salva dados diários na tabela `daily_roas`
- Tenta associar campanhas com produtos Shopify (por nome)
- Calcula métricas: ROAS, margem, lucro, etc.

**Dados salvos na tabela `campaigns`:**
- `campaign_name` - Nome da campanha
- `platform` - 'facebook'
- `status` - Status (active, paused, etc)
- `total_spent` - Total gasto (soma dos insights)
- `total_revenue` - Receita total (se produto vinculado)
- `roas` - Return on Ad Spend
- `cpc` - Custo por clique médio
- `impressions` - Total de impressões
- `clicks` - Total de cliques
- `conversions` - Total de conversões (purchases)

**Dados salvos na tabela `daily_roas`:**
- `campaign_id` - ID da campanha no Facebook
- `campaign_name` - Nome da campanha
- `date` - Data do insight
- `total_spent` - Gasto no dia
- `cpc` - Custo por clique
- `atc` - Add to Cart
- `purchases` - Compras
- `product_price` - Preço do produto (se vinculado)
- `cog` - Custo do produto (se vinculado)
- `units_sold` - Unidades vendidas
- `roas` - ROAS do dia
- `margin_euros` - Margem em euros
- `margin_percentage` - Margem em percentual

### 2. Botão de Sincronização no Dashboard

**Localização:** `src/pages/Dashboard.tsx`

- Botão "Sincronizar Facebook" no header
- Sincroniza últimos 30 dias por padrão
- Mostra progresso e resultados
- Atualiza dados automaticamente após sincronização

## 🔄 Como usar

1. **Conectar Facebook Ads:**
   - Ir em Settings > Integrations
   - Conectar conta do Facebook

2. **Conectar Shopify (opcional):**
   - Ir em Settings > Integrations
   - Conectar loja Shopify
   - Isso permite vincular campanhas com produtos

3. **Sincronizar dados:**
   - Ir no Dashboard
   - Clicar em "Sincronizar Facebook"
   - Aguardar conclusão

## 📋 Estrutura de Dados

### Tabela `campaigns`
```sql
- id (UUID)
- user_id (UUID)
- campaign_name (TEXT)
- platform (TEXT) - 'facebook'
- status (TEXT) - 'active', 'paused', etc
- total_spent (DECIMAL)
- total_revenue (DECIMAL)
- roas (DECIMAL)
- cpc (DECIMAL)
- impressions (INTEGER)
- clicks (INTEGER)
- conversions (INTEGER)
- created_at, updated_at
```

### Tabela `daily_roas`
```sql
- id (UUID)
- user_id (UUID)
- campaign_id (TEXT) - ID do Facebook
- campaign_name (TEXT)
- date (DATE)
- total_spent (NUMERIC)
- cpc (NUMERIC)
- atc (INTEGER)
- purchases (INTEGER)
- product_price (NUMERIC)
- cog (NUMERIC)
- units_sold (INTEGER)
- roas (NUMERIC)
- margin_euros (NUMERIC)
- margin_percentage (NUMERIC)
- UNIQUE(user_id, campaign_id, date)
```

## 🔗 Associação Campanha ↔ Produto

A função tenta associar automaticamente:
- Busca produtos Shopify que contenham o nome da campanha
- Usa `product_name ILIKE '%campaign_name%'`
- Se encontrar, usa `selling_price` e `cost_price` para cálculos

**Melhorias futuras:**
- Permitir associação manual
- Usar tags/categorias
- Usar UTM parameters

## 📊 Dados do Facebook API

A função busca:
- **Campanhas:** id, name, status, objective, budgets, dates
- **Insights diários:** spend, impressions, clicks, actions (purchase, add_to_cart), cpc, cpm, ctr, etc.

## ⚠️ Limitações atuais

1. **Associação automática:** Apenas por nome (pode não funcionar sempre)
2. **Período:** Sincroniza últimos 30 dias por padrão
3. **Múltiplas lojas:** Usa primeira loja Shopify encontrada
4. **Múltiplas contas:** Usa primeira conta de anúncios

## 🚀 Melhorias futuras sugeridas

1. **Sincronização automática:** Cron job para sincronizar diariamente
2. **Associação manual:** Interface para vincular campanhas ↔ produtos
3. **Múltiplas contas:** Selecionar qual conta de anúncios usar
4. **Múltiplas lojas:** Selecionar qual loja Shopify usar
5. **Histórico completo:** Opção para sincronizar todos os dados históricos
6. **Webhooks:** Atualização em tempo real quando campanha muda

## 🔧 Troubleshooting

**Erro: "Facebook Ads not connected"**
- Verificar se integração Facebook está ativa em Settings > Integrations

**Erro: "No ad account found"**
- Verificar permissões da conta Facebook
- Verificar se conta tem contas de anúncios ativas

**Dados não aparecem no dashboard:**
- Verificar se sincronização foi concluída
- Verificar console do navegador para erros
- Verificar tabelas no Supabase

**ROAS = 0:**
- Verificar se produto está vinculado (Shopify)
- Verificar se produto tem `selling_price` definido
- Verificar se há purchases nas campanhas

