import { ChatLanguage, ChatCategory, ChatOption } from '@/types/chat';

export const getCategoryQuestion = (category: ChatCategory, language: ChatLanguage): string => {
  const questions = {
    meta_integration: {
      pt: 'Qual é o problema com a integração Meta?',
      en: 'What issue are you having with Meta integration?'
    },
    login: {
      pt: 'Que tipo de problema de acesso tens?',
      en: 'What type of access problem are you having?'
    },
    dashboard: {
      pt: 'Como podemos ajudar com o dashboard?',
      en: 'How can we help with the dashboard?'
    },
    payments: {
      pt: 'Qual é a tua questão sobre pagamentos?',
      en: 'What is your question about payments?'
    },
    technical: {
      pt: 'Que problema técnico estás a enfrentar?',
      en: 'What technical issue are you facing?'
    },
    admin: {
      pt: 'Em que posso ajudar?',
      en: 'How can I help you?'
    }
  };

  return questions[category]?.[language] || '';
};

export const getCategoryOptions = (category: ChatCategory, language: ChatLanguage): ChatOption[] => {
  const options = {
    meta_integration: {
      pt: [
        { id: 'meta_connect', label: '🔗 Como conectar minha conta Meta', nextStep: 'meta_connect' },
        { id: 'meta_permissions', label: '🔐 Problemas com permissões', nextStep: 'meta_permissions' },
        { id: 'meta_campaigns', label: '📊 Não vejo minhas campanhas', nextStep: 'meta_campaigns' },
        { id: 'meta_ads_account', label: '🏢 Múltiplas contas de anúncios', nextStep: 'meta_ads_account' },
        { id: 'meta_disconnect', label: '🔌 Desconectar conta Meta', nextStep: 'meta_disconnect' },
        { id: 'meta_data_sync', label: '⏰ Sincronização de dados', nextStep: 'meta_data_sync' },
        { id: 'main_menu', label: '← Voltar ao Menu Principal', nextStep: 'main_menu' }
      ],
      en: [
        { id: 'meta_connect', label: '🔗 How to connect my Meta account', nextStep: 'meta_connect' },
        { id: 'meta_permissions', label: '🔐 Permission issues', nextStep: 'meta_permissions' },
        { id: 'meta_campaigns', label: "📊 I don't see my campaigns", nextStep: 'meta_campaigns' },
        { id: 'meta_ads_account', label: '🏢 Multiple ad accounts', nextStep: 'meta_ads_account' },
        { id: 'meta_disconnect', label: '🔌 Disconnect Meta account', nextStep: 'meta_disconnect' },
        { id: 'meta_data_sync', label: '⏰ Data synchronization', nextStep: 'meta_data_sync' },
        { id: 'main_menu', label: '← Back to Main Menu', nextStep: 'main_menu' }
      ]
    },
    login: {
      pt: [
        { id: 'forgot_password', label: '🔑 Esqueci minha senha', nextStep: 'forgot_password' },
        { id: 'email_verification', label: '📧 Não recebi email de verificação', nextStep: 'email_verification' },
        { id: 'change_email', label: '✉️ Alterar email de login', nextStep: 'change_email' },
        { id: 'google_login', label: '🔐 Login com Google', nextStep: 'google_login' },
        { id: 'account_locked', label: '🔒 Conta bloqueada', nextStep: 'account_locked' },
        { id: 'main_menu', label: '← Voltar ao Menu Principal', nextStep: 'main_menu' }
      ],
      en: [
        { id: 'forgot_password', label: '🔑 Forgot my password', nextStep: 'forgot_password' },
        { id: 'email_verification', label: "📧 Didn't receive verification email", nextStep: 'email_verification' },
        { id: 'change_email', label: '✉️ Change login email', nextStep: 'change_email' },
        { id: 'google_login', label: '🔐 Google login', nextStep: 'google_login' },
        { id: 'account_locked', label: '🔒 Account locked', nextStep: 'account_locked' },
        { id: 'main_menu', label: '← Back to Main Menu', nextStep: 'main_menu' }
      ]
    },
    dashboard: {
      pt: [
        { id: 'update_data', label: '🔄 Como atualizar meus dados', nextStep: 'update_data' },
        { id: 'export_data', label: '📥 Exportar relatórios', nextStep: 'export_data' },
        { id: 'filters', label: '🎯 Usar filtros avançados', nextStep: 'filters' },
        { id: 'shopify_integration', label: '🛒 Integrar com Shopify', nextStep: 'shopify_integration' },
        { id: 'product_cost', label: '💰 Atualizar preços de produto', nextStep: 'product_cost' },
        { id: 'roas_calculation', label: '📊 Entender cálculo de ROAS', nextStep: 'roas_calculation' },
        { id: 'main_menu', label: '← Voltar ao Menu Principal', nextStep: 'main_menu' }
      ],
      en: [
        { id: 'update_data', label: '🔄 How to update my data', nextStep: 'update_data' },
        { id: 'export_data', label: '📥 Export reports', nextStep: 'export_data' },
        { id: 'filters', label: '🎯 Use advanced filters', nextStep: 'filters' },
        { id: 'shopify_integration', label: '🛒 Integrate with Shopify', nextStep: 'shopify_integration' },
        { id: 'product_cost', label: '💰 Update product prices', nextStep: 'product_cost' },
        { id: 'roas_calculation', label: '📊 Understand ROAS calculation', nextStep: 'roas_calculation' },
        { id: 'main_menu', label: '← Back to Main Menu', nextStep: 'main_menu' }
      ]
    },
    payments: {
      pt: [
        { id: 'billing', label: '💳 Informações de faturação', nextStep: 'billing' },
        { id: 'cancel_subscription', label: '❌ Cancelar assinatura', nextStep: 'cancel_subscription' },
        { id: 'upgrade', label: '⭐ Fazer upgrade do plano', nextStep: 'upgrade' },
        { id: 'invoice', label: '🧾 Obter fatura', nextStep: 'invoice' },
        { id: 'payment_methods', label: '💳 Métodos de pagamento', nextStep: 'payment_methods' },
        { id: 'refund', label: '💰 Solicitar reembolso', nextStep: 'refund' },
        { id: 'main_menu', label: '← Voltar ao Menu Principal', nextStep: 'main_menu' }
      ],
      en: [
        { id: 'billing', label: '💳 Billing information', nextStep: 'billing' },
        { id: 'cancel_subscription', label: '❌ Cancel subscription', nextStep: 'cancel_subscription' },
        { id: 'upgrade', label: '⭐ Upgrade plan', nextStep: 'upgrade' },
        { id: 'invoice', label: '🧾 Get invoice', nextStep: 'invoice' },
        { id: 'payment_methods', label: '💳 Payment methods', nextStep: 'payment_methods' },
        { id: 'refund', label: '💰 Request refund', nextStep: 'refund' },
        { id: 'main_menu', label: '← Back to Main Menu', nextStep: 'main_menu' }
      ]
    },
    technical: {
      pt: [
        { id: 'slow_loading', label: '🐌 Carregamento lento', nextStep: 'slow_loading' },
        { id: 'data_not_updating', label: '🔄 Dados não atualizam', nextStep: 'data_not_updating' },
        { id: 'error_message', label: '⚠️ Mensagem de erro', nextStep: 'error_message' },
        { id: 'browser_issues', label: '🌐 Problemas com navegador', nextStep: 'browser_issues' },
        { id: 'mobile_app', label: '📱 App mobile', nextStep: 'mobile_app' },
        { id: 'data_loss', label: '😱 Perdi os meus dados', nextStep: 'data_loss' },
        { id: 'main_menu', label: '← Voltar ao Menu Principal', nextStep: 'main_menu' }
      ],
      en: [
        { id: 'slow_loading', label: '🐌 Slow loading', nextStep: 'slow_loading' },
        { id: 'data_not_updating', label: '🔄 Data not updating', nextStep: 'data_not_updating' },
        { id: 'error_message', label: '⚠️ Error message', nextStep: 'error_message' },
        { id: 'browser_issues', label: '🌐 Browser issues', nextStep: 'browser_issues' },
        { id: 'mobile_app', label: '📱 Mobile app', nextStep: 'mobile_app' },
        { id: 'data_loss', label: '😱 Lost my data', nextStep: 'data_loss' },
        { id: 'main_menu', label: '← Back to Main Menu', nextStep: 'main_menu' }
      ]
    },
    admin: {
      pt: [],
      en: []
    }
  };

  return options[category]?.[language] || [];
};

export const getAnswerForStep = (step: string, language: ChatLanguage): string => {
  const answers = {
    // Meta Integration
    meta_connect: {
      pt: '🔗 Para conectar sua conta Meta:\n\n1. Vá em Definições > Integrações\n2. Clique em "Conectar Facebook"\n3. Faça login com sua conta Facebook\n4. Autorize as permissões necessárias\n5. Selecione sua Página e Conta de Anúncios\n\n⚠️ Importante: Use a conta que tem acesso aos anúncios!',
      en: '🔗 To connect your Meta account:\n\n1. Go to Settings > Integrations\n2. Click "Connect Facebook"\n3. Log in with your Facebook account\n4. Authorize the required permissions\n5. Select your Page and Ad Account\n\n⚠️ Important: Use the account that has access to the ads!'
    },
    meta_permissions: {
      pt: '🔐 Problemas com permissões:\n\n1. Certifique-se que tem papel de Admin ou Anunciante na conta de anúncios\n2. Tente desconectar e reconectar a conta\n3. Verifique em Business Manager se a conta está ativa\n4. Limpe o cache do navegador e tente novamente\n\nSe o problema persistir, contacte um administrador.',
      en: '🔐 Permission issues:\n\n1. Make sure you have Admin or Advertiser role in the ad account\n2. Try disconnecting and reconnecting the account\n3. Check in Business Manager if the account is active\n4. Clear browser cache and try again\n\nIf the problem persists, contact an administrator.'
    },
    meta_campaigns: {
      pt: '📊 Não vê suas campanhas?\n\n1. Verifique se a conta Meta está conectada corretamente\n2. Confirme que selecionou a conta de anúncios correta\n3. Aguarde alguns minutos para sincronização\n4. Atualize a página (F5)\n5. Verifique se as campanhas estão ativas no Meta\n\nAs campanhas podem demorar até 5 minutos para aparecer.',
      en: "📊 Don't see your campaigns?\n\n1. Verify that your Meta account is properly connected\n2. Confirm you selected the correct ad account\n3. Wait a few minutes for synchronization\n4. Refresh the page (F5)\n5. Check if campaigns are active on Meta\n\nCampaigns may take up to 5 minutes to appear."
    },
    meta_ads_account: {
      pt: '🏢 Múltiplas contas de anúncios:\n\n1. Desconecte a conta atual em Definições\n2. Conecte novamente e selecione a conta correta\n3. Pode ter acesso a múltiplas contas no Business Manager\n4. Certifique-se de escolher a conta ativa com campanhas\n\n💡 Só pode conectar uma conta de cada vez.',
      en: '🏢 Multiple ad accounts:\n\n1. Disconnect current account in Settings\n2. Connect again and select correct account\n3. You may have access to multiple accounts in Business Manager\n4. Make sure to choose active account with campaigns\n\n💡 You can only connect one account at a time.'
    },
    meta_disconnect: {
      pt: '🔌 Para desconectar Meta:\n\n1. Vá em Definições > Integrações\n2. Clique em "Desconectar" ao lado do Facebook\n3. Confirme a desconexão\n4. Seus dados existentes serão mantidos\n5. Pode reconectar a qualquer momento\n\n⚠️ Sincronização automática será interrompida.',
      en: '🔌 To disconnect Meta:\n\n1. Go to Settings > Integrations\n2. Click "Disconnect" next to Facebook\n3. Confirm disconnection\n4. Your existing data will be kept\n5. You can reconnect anytime\n\n⚠️ Automatic sync will be stopped.'
    },
    meta_data_sync: {
      pt: '⏰ Sincronização de dados:\n\n• Automática: A cada 1 hora\n• Manual: Botão "Atualizar" no Dashboard\n• Primeira sincronização: Pode demorar 5-10 minutos\n• Dados históricos: Últimos 90 dias\n\n🔄 Recarregue a página para ver novos dados.',
      en: '⏰ Data synchronization:\n\n• Automatic: Every 1 hour\n• Manual: "Refresh" button on Dashboard\n• First sync: May take 5-10 minutes\n• Historical data: Last 90 days\n\n🔄 Reload page to see new data.'
    },
    
    // Login
    forgot_password: {
      pt: '🔑 Para recuperar sua senha:\n\n1. Clique em "Esqueci minha senha" na página de login\n2. Digite seu email cadastrado\n3. Verifique sua caixa de entrada (e spam)\n4. Clique no link recebido\n5. Crie uma nova senha segura\n\n⏰ O link expira em 1 hora.',
      en: '🔑 To recover your password:\n\n1. Click "Forgot password" on login page\n2. Enter your registered email\n3. Check your inbox (and spam)\n4. Click the link received\n5. Create a new secure password\n\n⏰ The link expires in 1 hour.'
    },
    email_verification: {
      pt: '📧 Não recebeu o email?\n\n1. Verifique a pasta de spam/lixo\n2. Adicione noreply@sheetboost.com aos contatos\n3. Aguarde alguns minutos\n4. Solicite novo envio na página de login\n5. Confirme se o email está correto\n\nAinda com problemas? Fale com um administrador.',
      en: "📧 Didn't receive the email?\n\n1. Check spam/junk folder\n2. Add noreply@sheetboost.com to contacts\n3. Wait a few minutes\n4. Request new email on login page\n5. Confirm email is correct\n\nStill having issues? Talk to an administrator."
    },
    change_email: {
      pt: '✉️ Para alterar seu email:\n\n1. Acesse Definições > Perfil\n2. Atualize o campo de email\n3. Clique em Guardar\n4. Verifique o novo email (link de confirmação)\n5. Faça login com o novo email\n\n⚠️ O email antigo deixará de funcionar após confirmação.',
      en: '✉️ To change your email:\n\n1. Access Settings > Profile\n2. Update email field\n3. Click Save\n4. Verify new email (confirmation link)\n5. Log in with new email\n\n⚠️ Old email will stop working after confirmation.'
    },
    google_login: {
      pt: '🔐 Login com Google:\n\n1. Na página de login, clique em "Continuar com Google"\n2. Selecione a sua conta Google\n3. Autorize o acesso\n4. Será redirecionado automaticamente\n\n💡 Use sempre o mesmo método de login!',
      en: '🔐 Google login:\n\n1. On login page, click "Continue with Google"\n2. Select your Google account\n3. Authorize access\n4. You\'ll be redirected automatically\n\n💡 Always use the same login method!'
    },
    account_locked: {
      pt: '🔒 Conta bloqueada?\n\n1. Aguarde 15 minutos antes de tentar novamente\n2. Verifique se não está a usar VPN\n3. Tente recuperar palavra-passe\n4. Limpe os cookies do navegador\n\n🆘 Conta permanentemente bloqueada? Contacte o suporte urgente.',
      en: '🔒 Account locked?\n\n1. Wait 15 minutes before trying again\n2. Check if you\'re not using VPN\n3. Try password recovery\n4. Clear browser cookies\n\n🆘 Permanently locked account? Contact urgent support.'
    },
    
    // Dashboard
    update_data: {
      pt: '🔄 Para atualizar dados:\n\n1. Meta Ads: Os dados sincronizam automaticamente a cada hora\n2. Shopify: Use o botão "Sincronizar Produtos"\n3. Custos de produto: Edite em Produtos > Preço de Fornecedor\n4. Perfil: Aceda a Definições > Perfil\n\n💡 Pode forçar atualização recarregando a página (F5).',
      en: '🔄 To update data:\n\n1. Meta Ads: Data syncs automatically every hour\n2. Shopify: Use "Sync Products" button\n3. Product costs: Edit in Products > Supplier Price\n4. Profile: Go to Settings > Profile\n\n💡 You can force update by reloading the page (F5).'
    },
    export_data: {
      pt: '📥 Para exportar dados:\n\n1. Dashboard: Use filtros para selecionar período\n2. Clique no botão "Exportar" no canto superior\n3. Escolha o formato (CSV, Excel)\n4. O download iniciará automaticamente\n\n📊 Pode exportar campanhas, produtos vendidos e relatórios ROAS.',
      en: '📥 To export data:\n\n1. Dashboard: Use filters to select period\n2. Click "Export" button in top corner\n3. Choose format (CSV, Excel)\n4. Download will start automatically\n\n📊 You can export campaigns, sold products and ROAS reports.'
    },
    filters: {
      pt: '🎯 Usar filtros avançados:\n\n1. Selecione o período de datas\n2. Escolha uma campanha específica\n3. Filtre por produto\n4. Selecione a plataforma (Meta/Shopify)\n5. Aplique filtros combinados\n\n💡 Os filtros afetam os gráficos e as estatísticas em tempo real.',
      en: '🎯 Use advanced filters:\n\n1. Select date period\n2. Choose specific campaign\n3. Filter by product\n4. Select platform (Meta/Shopify)\n5. Apply combined filters\n\n💡 Filters affect charts and real-time statistics.'
    },
    shopify_integration: {
      pt: '🛒 Integrar Shopify:\n\n1. Aceda a Definições > Integrações\n2. Insira o nome da sua loja (sem .myshopify.com)\n3. Cole o Admin API access token\n4. Clique em Conectar\n5. Sincronize produtos e pedidos\n\n📋 Precisa de permissões: read_products, read_orders, write_webhooks',
      en: '🛒 Integrate Shopify:\n\n1. Go to Settings > Integrations\n2. Enter your store name (without .myshopify.com)\n3. Paste Admin API access token\n4. Click Connect\n5. Sync products and orders\n\n📋 Required permissions: read_products, read_orders, write_webhooks'
    },
    product_cost: {
      pt: '💰 Atualizar preços:\n\n1. Aceda a Produtos\n2. Clique no ícone de edição ao lado do preço\n3. Insira o novo preço de fornecedor\n4. Confirme a alteração\n5. ROAS e margens são recalculados automaticamente\n\n🔄 Afeta todos os dados históricos!',
      en: '💰 Update prices:\n\n1. Go to Products\n2. Click edit icon next to price\n3. Enter new supplier price\n4. Confirm change\n5. ROAS and margins recalculate automatically\n\n🔄 Affects all historical data!'
    },
    roas_calculation: {
      pt: '📊 Cálculo de ROAS:\n\n• ROAS = Receita Total / Investimento Total\n• Receita = Preço de Venda × Unidades Vendidas\n• Margem = Receita - COG - Investimento\n• COG = Preço Fornecedor × Unidades\n\n💡 ROAS > 2.0 geralmente indica campanha lucrativa!',
      en: '📊 ROAS calculation:\n\n• ROAS = Total Revenue / Total Investment\n• Revenue = Sale Price × Units Sold\n• Margin = Revenue - COG - Investment\n• COG = Supplier Price × Units\n\n💡 ROAS > 2.0 usually indicates profitable campaign!'
    },
    
    // Payments
    billing: {
      pt: '💳 Informações de faturação:\n\n1. Aceda a Definições > Assinatura\n2. Veja o seu plano atual e próxima cobrança\n3. Gerencie métodos de pagamento\n4. Descarregue faturas anteriores\n5. Atualize informações fiscais\n\n📧 Faturas são enviadas por email automaticamente.',
      en: '💳 Billing information:\n\n1. Access Settings > Subscription\n2. View current plan and next charge\n3. Manage payment methods\n4. Download previous invoices\n5. Update tax information\n\n📧 Invoices are sent automatically by email.'
    },
    cancel_subscription: {
      pt: '❌ Para cancelar assinatura:\n\n1. Aceda a Definições > Assinatura\n2. Clique em "Cancelar Assinatura"\n3. Confirme o cancelamento\n4. O seu plano continua até ao fim do período pago\n5. Após expirar, terá acesso limitado\n\n💡 Pode reativar a qualquer momento!',
      en: '❌ To cancel subscription:\n\n1. Go to Settings > Subscription\n2. Click "Cancel Subscription"\n3. Confirm cancellation\n4. Your plan continues until end of paid period\n5. After expiring, will have limited access\n\n💡 You can reactivate anytime!'
    },
    upgrade: {
      pt: '⭐ Para fazer upgrade:\n\n1. Aceda a Definições > Assinatura\n2. Veja os planos disponíveis\n3. Selecione o plano desejado\n4. Complete o pagamento\n5. Novos recursos ativam imediatamente\n\n🎁 O valor do plano atual é descontado proporcionalmente!',
      en: '⭐ To upgrade:\n\n1. Go to Settings > Subscription\n2. View available plans\n3. Select desired plan\n4. Complete payment\n5. New features activate immediately\n\n🎁 Current plan value is discounted proportionally!'
    },
    invoice: {
      pt: '🧾 Obter faturas:\n\n1. Aceda a Definições > Assinatura\n2. Role até "Histórico de faturas"\n3. Clique em "Descarregar" na fatura desejada\n4. PDF será gerado automaticamente\n\n📧 Faturas também são enviadas por email após pagamento.',
      en: '🧾 Get invoices:\n\n1. Access Settings > Subscription\n2. Scroll to "Invoice history"\n3. Click "Download" on desired invoice\n4. PDF will be generated automatically\n\n📧 Invoices are also sent by email after payment.'
    },
    payment_methods: {
      pt: '💳 Métodos de pagamento:\n\n1. Cartão de crédito/débito (Visa, Mastercard)\n2. Stripe (processador seguro)\n3. Pagamentos recorrentes automáticos\n4. Pode alterar cartão a qualquer momento\n\n🔒 Dados 100% seguros com criptografia SSL.',
      en: '💳 Payment methods:\n\n1. Credit/debit card (Visa, Mastercard)\n2. Stripe (secure processor)\n3. Automatic recurring payments\n4. Can change card anytime\n\n🔒 100% secure data with SSL encryption.'
    },
    refund: {
      pt: '💰 Solicitar reembolso:\n\n1. Aceda a Definições > Suporte\n2. Explique o motivo do reembolso\n3. Aguarde análise (até 48h)\n4. Reembolso aprovado: 5-10 dias úteis\n\n⚠️ Política: Reembolso até 14 dias após pagamento.',
      en: '💰 Request refund:\n\n1. Access Settings > Support\n2. Explain refund reason\n3. Wait for analysis (up to 48h)\n4. Approved refund: 5-10 business days\n\n⚠️ Policy: Refund up to 14 days after payment.'
    },
    
    // Technical
    slow_loading: {
      pt: '🐌 Carregamento lento?\n\n1. Limpe o cache do navegador (Ctrl+Shift+Del)\n2. Use Chrome ou Edge (mais rápidos)\n3. Verifique a sua conexão à internet\n4. Desative extensões do navegador temporariamente\n5. Tente numa janela anónima\n\n⚡ Problemas persistentes? Fale com o suporte.',
      en: '🐌 Slow loading?\n\n1. Clear browser cache (Ctrl+Shift+Del)\n2. Use Chrome or Edge (faster)\n3. Check your internet connection\n4. Disable browser extensions temporarily\n5. Try in incognito window\n\n⚡ Persistent issues? Talk to support.'
    },
    data_not_updating: {
      pt: '🔄 Os dados não atualizam?\n\n1. Recarregue a página (F5)\n2. Verifique a conexão com Meta/Shopify\n3. Aguarde a sincronização automática (até 1h)\n4. Force sincronização manual\n5. Limpe o cache do navegador\n\n🔍 Se os dados continuam antigos, contacte o suporte.',
      en: '🔄 Data not updating?\n\n1. Reload page (F5)\n2. Check Meta/Shopify connection\n3. Wait for automatic sync (up to 1h)\n4. Force manual synchronization\n5. Clear browser cache\n\n🔍 If data stays old, contact support.'
    },
    error_message: {
      pt: '⚠️ Recebeu um erro?\n\n1. Anote a mensagem de erro completa\n2. Tire uma captura de tela\n3. Tente fazer logout e login novamente\n4. Verifique se a sua sessão não expirou\n5. Tente num navegador diferente\n\n🛠️ Erros persistentes requerem suporte técnico.',
      en: '⚠️ Got an error?\n\n1. Note the complete error message\n2. Take a screenshot\n3. Try logging out and in again\n4. Check if your session expired\n5. Try in different browser\n\n🛠️ Persistent errors require technical support.'
    },
    browser_issues: {
      pt: '🌐 Problemas com navegador:\n\n✅ Recomendados:\n• Google Chrome (atualizado)\n• Microsoft Edge\n• Brave\n\n⚠️ Problemas conhecidos:\n• Safari (versões antigas)\n• Internet Explorer (não suportado)\n\n💡 Sempre use versão mais recente!',
      en: '🌐 Browser issues:\n\n✅ Recommended:\n• Google Chrome (updated)\n• Microsoft Edge\n• Brave\n\n⚠️ Known issues:\n• Safari (old versions)\n• Internet Explorer (not supported)\n\n💡 Always use latest version!'
    },
    mobile_app: {
      pt: '📱 App Mobile:\n\n• Atualmente: Versão web responsiva\n• Aceda pelo navegador do telemóvel\n• Funciona em iOS e Android\n• Pode adicionar à tela inicial\n\n🚀 App nativo em desenvolvimento para 2025!',
      en: '📱 Mobile App:\n\n• Currently: Responsive web version\n• Access via mobile browser\n• Works on iOS and Android\n• Can add to home screen\n\n🚀 Native app in development for 2025!'
    },
    data_loss: {
      pt: '😱 Perdeu dados?\n\n1. Não entre em pânico! Temos backups\n2. Recarregue a página primeiro\n3. Verifique se está na conta correta\n4. Limpe o cache e faça login novamente\n5. Contacte o suporte imediatamente\n\n🔐 Backups diários são feitos automaticamente!',
      en: '😱 Lost data?\n\n1. Don\'t panic! We have backups\n2. Reload page first\n3. Check if you\'re on correct account\n4. Clear cache and login again\n5. Contact support immediately\n\n🔐 Daily backups are made automatically!'
    }
  };

  return answers[step]?.[language] || '';
};

export const getBackToMainOption = (language: ChatLanguage): ChatOption => {
  return {
    id: 'back_to_main',
    label: language === 'pt' ? '← Voltar ao menu principal' : '← Back to main menu',
    nextStep: 'main_menu'
  };
};
