# Limites de Planos de Assinatura

## Plano FREE
- **Lojas**: 0 lojas (sem acesso)
- **Campanhas**: 0 campanhas (sem acesso)
- **Recursos**: Nenhum
- **Duração**: Ilimitada
- **Nota**: Utilizadores sem trial ativo ou assinatura paga não têm acesso a funcionalidades

## Plano TRIAL (10 dias) - FREE TRIAL
Ao criar uma conta, o utilizador recebe automaticamente **10 dias de acesso COMPLETO ao Plano Standard**.

- **Lojas**: 2 lojas (igual ao Standard)
- **Campanhas**: 40 campanhas (igual ao Standard)
- **Recursos**: 
  - Daily ROAS
  - Profit Sheet
  - Campanhas
  - Cotação (IA)
  - Todas as funcionalidades do plano Standard
- **Expiração**: Após 10 dias:
  - O utilizador é informado com modal/banner
  - Acesso é bloqueado até escolher um plano pago
  - Dados são preservados
  - Obrigado a subscrever para continuar

## Plano Beginner (Pago)
- **Lojas**: 1 loja
- **Campanhas**: 0 campanhas (sem gestão de campanhas)
- **Recursos**: 
  - Daily ROAS básico
  - Sem automação

## Plano Basic (Pago)
- **Lojas**: 1 loja
- **Campanhas**: 15 campanhas
- **Recursos**:
  - Daily ROAS
  - Profit Sheet

## Plano Standard (Pago)
- **Lojas**: 2 lojas
- **Campanhas**: 40 campanhas
- **Recursos**:
  - Daily ROAS
  - Profit Sheet
  - Campanhas
  - Cotação (IA)

## Plano Expert (Pago)
- **Lojas**: 4 lojas
- **Campanhas**: Ilimitadas (0 = ilimitado)
- **Recursos**: 
  - Daily ROAS
  - Profit Sheet
  - Campanhas
  - Cotação (IA)
  - Product Research
  - Todas as funcionalidades avançadas

---

## Sistema de Expiração

### Assinaturas Mensais
- Período ativo: 30 dias
- No dia 30 + 1: Se não houver renovação automática, o plano volta para FREE

### Assinaturas Anuais
- Período ativo: 365 dias
- No dia 365 + 1: Se não houver renovação automática, o plano volta para FREE

### Verificação Automática
Um cron job executa diariamente à meia-noite (00:00) para verificar:
1. Assinaturas pagas expiradas
2. Trials expirados

Quando detectado:
- O plano é revertido para FREE
- O status da assinatura é marcado como inativo
- Um registro é criado no histórico de assinaturas
- O perfil do usuário é atualizado

### Renovação Automática
- Se o Stripe processar um pagamento de renovação, o plano continua ativo
- As datas de período são atualizadas automaticamente
- Um novo registro é criado no histórico

---

## Implementação Técnica

### Tabelas
- `profiles`: Contém `subscription_plan`, `subscription_status`, `trial_ends_at`
- `subscriptions`: Contém detalhes das assinaturas pagas
- `subscription_history`: Registra todos os eventos de mudança de plano

### Edge Functions
- `check-expired-subscriptions`: Verifica expiração de trials e assinaturas
- `stripe-webhook`: Processa eventos do Stripe (criação, renovação, cancelamento)

### Hook React
- `useSubscriptionLimits`: Retorna os limites atuais do usuário baseado no plano
- `useSubscriptionCheck`: Verifica expiração em tempo real no frontend
