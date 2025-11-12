import { useState, useEffect } from 'react';
import { Facebook, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface FacebookConnectProps {
  onConnectionChange?: (isConnected: boolean) => void;
}

export const FacebookConnect = ({ onConnectionChange }: FacebookConnectProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('facebook_user_name, facebook_token_expires_at')
        .eq('user_id', user.id)
        .single();

      if (profile?.facebook_user_name) {
        setIsConnected(true);
        setUserName(profile.facebook_user_name);
        setExpiresAt(profile.facebook_token_expires_at ? new Date(profile.facebook_token_expires_at) : null);
        onConnectionChange?.(true);
      } else {
        setIsConnected(false);
        onConnectionChange?.(false);
      }
    } catch (error) {
      console.error('Error checking Facebook connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    const appId = '1525902928789947';
    const redirectUri = `${window.location.origin}/facebook/callback`;
    const scope = 'ads_read,pages_read_engagement';
    
    const authUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${window.location.pathname}`;
    
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          facebook_access_token: null,
          facebook_token_expires_at: null,
          facebook_user_id: null,
          facebook_user_name: null
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setIsConnected(false);
      setUserName(null);
      setExpiresAt(null);
      onConnectionChange?.(false);

      toast({
        title: t('facebook.disconnected'),
        description: t('facebook.disconnectedDesc'),
      });
    } catch (error) {
      console.error('Error disconnecting Facebook:', error);
      toast({
        title: t('facebook.error'),
        description: t('facebook.disconnectError'),
        variant: 'destructive',
      });
    }
  };

  const isExpired = expiresAt && expiresAt < new Date();

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-muted h-12 w-12"></div>
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (!isConnected || isExpired) {
    return (
      <Card className="p-6 border-2 border-dashed">
        <div className="flex items-start gap-4">
          <div className="bg-[#1877F2] rounded-full p-3">
            <Facebook className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">
              {isExpired ? t('facebook.reconnect') : t('facebook.connectAccount')}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {isExpired ? t('facebook.tokenExpired') : t('facebook.connectDesc')}
            </p>
            <Button
              onClick={handleConnect}
              className="bg-[#1877F2] hover:bg-[#1565D8] text-white"
            >
              <Facebook className="mr-2 h-4 w-4" />
              {isExpired ? t('facebook.reconnectButton') : t('facebook.connectButton')}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-green-500/20 bg-green-500/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{t('facebook.connectedAs')}</span>
              <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20">
                {userName}
              </Badge>
            </div>
            {expiresAt && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('facebook.expiresOn')} {expiresAt.toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={handleDisconnect}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4 mr-1" />
          {t('facebook.disconnect')}
        </Button>
      </div>
    </Card>
  );
};
