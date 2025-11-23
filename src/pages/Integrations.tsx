import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { UpsellModal } from "@/components/UpsellModal";
import { LoadingOverlay } from "@/components/ui/loading-spinner";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface Integration {
  id: string;
  integration_type: string;
  connected_at: string;
  metadata: any;
  expires_at: string | null;
}

export default function Integrations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { checkStoreLimit } = useFeatureGate();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingFacebook, setConnectingFacebook] = useState(false);
  const [showShopifyDialog, setShowShopifyDialog] = useState(false);
  const [shopifyStoreName, setShopifyStoreName] = useState("");
  const [shopifyAccessToken, setShopifyAccessToken] = useState("");
  const [connectingShopify, setConnectingShopify] = useState(false);
  const [disconnectDialog, setDisconnectDialog] = useState<{type: 'facebook' | 'shopify', id?: string} | null>(null);
  const [showUpsellModal, setShowUpsellModal] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchIntegrations();

    const channel = supabase
      .channel('integrations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'integrations'
        },
        () => {
          fetchIntegrations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchIntegrations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectFacebook = async () => {
    setConnectingFacebook(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const state = btoa(JSON.stringify({ userId: session.user.id }));
      const facebookAppId = "1525902928789947";
      const supabaseUrl = "https://cygvvrtsdatdczswcrqj.supabase.co";
      const redirectUri = `${supabaseUrl}/functions/v1/facebook-oauth-callback`;
      
      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${facebookAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=ads_management,ads_read,business_management`;
      
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      const popup = window.open(
        authUrl,
        'Facebook Login',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'facebook-oauth-success') {
          popup?.close();
          toast({
            title: t('settings.success'),
            description: t('settings.integrationsPage.facebookConnected')
          });
          fetchIntegrations();
          setConnectingFacebook(false);
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'facebook-oauth-error') {
          popup?.close();
          toast({
            title: t('settings.error'),
            description: event.data.error || t('settings.integrationsPage.facebookError'),
            variant: "destructive"
          });
          setConnectingFacebook(false);
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      const checkPopupClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', handleMessage);
          setConnectingFacebook(false);
          fetchIntegrations();
        }
      }, 1000);
    } catch (error) {
      console.error('Error connecting Facebook:', error);
      toast({
        title: t('settings.error'),
        description: t('settings.integrationsPage.shopifyConnectError'),
        variant: "destructive"
      });
      setConnectingFacebook(false);
    }
  };

  const handleDisconnectFacebook = async (integrationId: string) => {
    setDisconnectDialog(null);
    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      toast({
        title: t('settings.success'),
        description: t('settings.integrationsPage.facebookDisconnected')
      });
      fetchIntegrations();
    } catch (error) {
      console.error('Error disconnecting Facebook:', error);
      toast({
        title: t('settings.error'),
        description: t('settings.integrationsPage.facebookError'),
        variant: "destructive"
      });
    }
  };

  const handleConnectShopify = () => {
    const storeCheck = checkStoreLimit();
    
    if (!storeCheck.canAccess) {
      setShowUpsellModal(true);
      return;
    }

    setShowShopifyDialog(true);
    setShopifyStoreName("");
    setShopifyAccessToken("");
  };

  const handleShopifySubmit = async () => {
    if (!shopifyStoreName || !shopifyAccessToken) {
      toast({
        title: t('settings.error'),
        description: t('settings.integrationsPage.fillAllFields'),
        variant: "destructive"
      });
      return;
    }

    setConnectingShopify(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: t('settings.error'),
          description: t('settings.integrationsPage.loginRequired'),
          variant: "destructive"
        });
        setConnectingShopify(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('shopify-connect', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          store_name: shopifyStoreName,
          access_token: shopifyAccessToken
        }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message);
      }

      toast({
        title: t('settings.success'),
        description: `${t('settings.integrationsPage.store')} ${data.shop.name} ${t('settings.integrationsPage.connectSuccess')}`
      });
      
      setShowShopifyDialog(false);
      fetchIntegrations();
      
      setTimeout(async () => {
        try {
          const { data: integrations } = await supabase
            .from('integrations')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('integration_type', 'shopify')
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (integrations && integrations.length > 0) {
            await supabase.functions.invoke('shopify-sync-products', {
              headers: {
                Authorization: `Bearer ${session.access_token}`
              },
              body: { integration_id: integrations[0].id }
            });
          }
        } catch (err) {
          console.error('Auto-sync error:', err);
        }
      }, 1000);
    } catch (error: any) {
      console.error('Error connecting Shopify:', error);
      toast({
        title: t('settings.error'),
        description: error.message || t('settings.integrationsPage.shopifyConnectError'),
        variant: "destructive"
      });
    } finally {
      setConnectingShopify(false);
    }
  };

  const handleDisconnectShopify = async (integrationId: string) => {
    setDisconnectDialog(null);
    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      toast({
        title: t('settings.success'),
        description: t('settings.integrationsPage.shopifyDisconnected')
      });
      fetchIntegrations();
    } catch (error) {
      console.error('Error disconnecting Shopify:', error);
      toast({
        title: t('settings.error'),
        description: t('settings.integrationsPage.shopifyError'),
        variant: "destructive"
      });
    }
  };

  const facebookIntegrations = integrations.filter(i => i.integration_type === 'facebook_ads');
  const shopifyIntegrations = integrations.filter(i => i.integration_type === 'shopify');

  if (loading) {
    return <LoadingOverlay message={t('settings.loading')} />;
  }

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
          <div className="relative z-10 h-screen flex items-center justify-center p-8 overflow-hidden">
            <div className="w-full max-w-6xl">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
              >
                <h1 className="text-4xl font-bold mb-3">{t('settings.integrationsPage.title')}</h1>
                <p className="text-muted-foreground text-lg">{t('settings.integrationsPage.subtitle')}</p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* Facebook Ads Card */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 h-full">
                    <div className="p-8 flex flex-col items-center text-center h-full justify-between">
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <motion.div
                          whileHover={{ scale: 1.05, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          className="mb-6"
                        >
                          <div className="w-32 h-32 rounded-2xl bg-[#1877F2] flex items-center justify-center shadow-2xl">
                            <svg className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          </div>
                        </motion.div>
                        
                        <h3 className="text-2xl font-bold mb-3">{t('settings.integrationsPage.facebookAdsTitle')}</h3>
                        <p className="text-muted-foreground mb-6">{t('settings.integrationsPage.facebookAdsDesc')}</p>
                        
                        {facebookIntegrations.length > 0 && (
                          <div className="flex items-center gap-2 text-emerald-500 mb-4">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-medium">{t('settings.integrationsPage.connected')}</span>
                          </div>
                        )}
                      </div>

                      <div className="w-full space-y-3">
                        {facebookIntegrations.length === 0 ? (
                          <Button
                            onClick={handleConnectFacebook}
                            disabled={connectingFacebook}
                            className="w-full h-12 text-base"
                            size="lg"
                          >
                            {connectingFacebook ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t('settings.integrationsPage.connecting')}
                              </>
                            ) : (
                              t('settings.integrationsPage.connectFacebook')
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => setDisconnectDialog({ type: 'facebook', id: facebookIntegrations[0].id })}
                            variant="outline"
                            className="w-full h-12 text-base"
                            size="lg"
                          >
                            {t('settings.integrationsPage.disconnect')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Shopify Card */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 h-full">
                    <div className="p-8 flex flex-col items-center text-center h-full justify-between">
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <motion.div
                          whileHover={{ scale: 1.05, rotate: -5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          className="mb-6"
                        >
                          <div className="w-32 h-32 rounded-2xl bg-[#96bf48] flex items-center justify-center shadow-2xl">
                            <svg className="w-20 h-20 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M15.337 2.293c-.134.04-.235.106-.235.106s-1.565 1.56-2.382 2.376a.336.336 0 0 0-.087.173c-.52-.153-.966-.228-1.342-.228-1.048 0-1.776.317-2.163.944-.39.628-.46 1.478-.46 2.098 0 .04.003.077.006.115-1.142.357-1.928.605-1.928.605-.578.182-.595.2-.672.742-.055.4-1.528 11.789-1.528 11.789L16.934 22l6.066-1.338S17.112 2.36 17.07 2.318c-.042-.042-.116-.063-.187-.063-.07 0-.12.008-.12.008s-.85-.173-1.426.03zm-1.598 2.59c-.45.14-.945.295-1.474.46-.001-.242-.026-.578-.098-.934.244.066.49.147.72.234.22.083.595.195.852.24zm-.524-1.424c.102.29.147.733.147 1.14 0 .03-.002.06-.003.09-.462.145-.965.302-1.482.463-.003-.036-.006-.072-.006-.108 0-.658.133-1.185.387-1.585zm-3.55 4.01c.167-.049.343-.1.524-.152.18-.052.36-.103.54-.154.003.014.006.028.006.042 0 .596-.315 1.85-1.07 1.85-.13 0-.208-.015-.208-.015.164-1.17.208-1.57.208-1.57z"/>
                            </svg>
                          </div>
                        </motion.div>
                        
                        <h3 className="text-2xl font-bold mb-3">{t('settings.integrationsPage.shopifyTitle')}</h3>
                        <p className="text-muted-foreground mb-6">{t('settings.integrationsPage.shopifyDesc')}</p>
                        
                        {shopifyIntegrations.length > 0 && (
                          <div className="flex items-center gap-2 text-emerald-500 mb-4">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-medium">
                              {shopifyIntegrations.length} {shopifyIntegrations.length === 1 ? t('settings.integrationsPage.store') : t('settings.integrationsPage.stores')}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="w-full space-y-3">
                        <Button
                          onClick={handleConnectShopify}
                          className="w-full h-12 text-base"
                          size="lg"
                        >
                          {t('settings.integrationsPage.connectShopify')}
                        </Button>
                        
                        {shopifyIntegrations.length > 0 && (
                          <Button
                            onClick={() => navigate('/products')}
                            variant="outline"
                            className="w-full h-12 text-base"
                            size="lg"
                          >
                            {t('settings.integrationsPage.manageStores')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>

      {/* Shopify Dialog */}
      <Dialog open={showShopifyDialog} onOpenChange={setShowShopifyDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('settings.integrationsPage.connectShopifyStore')}</DialogTitle>
            <DialogDescription>{t('settings.integrationsPage.enterShopifyDetails')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">{t('settings.integrationsPage.storeName')}</Label>
              <Input
                id="store-name"
                placeholder="mystore"
                value={shopifyStoreName}
                onChange={(e) => setShopifyStoreName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.integrationsPage.storeNameExample')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-token">{t('settings.integrationsPage.accessToken')}</Label>
              <Input
                id="access-token"
                type="password"
                placeholder="shpat_..."
                value={shopifyAccessToken}
                onChange={(e) => setShopifyAccessToken(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShopifyDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleShopifySubmit} disabled={connectingShopify}>
              {connectingShopify ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('settings.integrationsPage.connecting')}
                </>
              ) : (
                t('settings.integrationsPage.connect')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation */}
      <AlertDialog open={!!disconnectDialog} onOpenChange={() => setDisconnectDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.integrationsPage.confirmDisconnect')}</AlertDialogTitle>
            <AlertDialogDescription>
              {disconnectDialog?.type === 'facebook' 
                ? t('settings.integrationsPage.disconnectFacebookWarning')
                : t('settings.integrationsPage.disconnectShopifyWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (disconnectDialog?.type === 'facebook' && disconnectDialog.id) {
                  handleDisconnectFacebook(disconnectDialog.id);
                } else if (disconnectDialog?.type === 'shopify' && disconnectDialog.id) {
                  handleDisconnectShopify(disconnectDialog.id);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t('settings.integrationsPage.disconnect')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upsell Modal */}
      <UpsellModal
        open={showUpsellModal}
        onOpenChange={setShowUpsellModal}
        type="store"
      />
    </SidebarProvider>
  );
}