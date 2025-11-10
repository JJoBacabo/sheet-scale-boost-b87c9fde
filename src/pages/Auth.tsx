import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { authSchema } from "@/lib/validation";
const Auth = () => {
  const navigate = useNavigate();
  
  // Verificar se o usuário já está autenticado ao carregar a página
  useEffect(() => {
    let mounted = true;
    
    const checkSession = async () => {
      // Aguardar um pouco para garantir que o Supabase restaurou a sessão do localStorage
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!mounted) return;
      
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session && !error) {
        navigate("/dashboard");
      }
    };
    
    checkSession();
    
    // Também escutar mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) {
        navigate("/dashboard");
      }
    });
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);
  const {
    toast
  } = useToast();
  const {
    t
  } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: t('auth.errorCreatingAccount'),
        description: firstError.message,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
      toast({
        title: t('auth.accountCreated'),
        description: t('auth.checkEmail')
      });
    } catch (error: any) {
      toast({
        title: t('auth.errorCreatingAccount'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: t('auth.errorSigningIn'),
        description: firstError.message,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password
      });
      if (error) throw error;
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: t('auth.errorSigningIn'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleSignIn = async () => {
    try {
      const {
        error
      } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: t('auth.errorGoogleSignIn'),
        description: error.message,
        variant: "destructive"
      });
    }
  };
  return <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-hero opacity-60 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Left Side - Logo */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative z-10 p-12 border-r border-primary/10">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-primary blur-3xl opacity-30 animate-pulse" />
          <img 
            src={logo} 
            alt="Logo" 
            className="relative w-80 h-80 logo-glow drop-shadow-2xl"
          />
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 lg:p-12 relative z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => navigate("/")} className="btn-glass self-start">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('auth.backToHome')}
          </Button>

          {/* Logo on mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary blur-3xl opacity-30 animate-pulse" />
              <img 
                src={logo} 
                alt="Logo" 
                className="relative w-32 h-32 logo-glow drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Auth Card */}
          <Card className="p-10 glass-card rounded-3xl border-2 border-primary/20 shadow-2xl backdrop-blur-2xl">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 glass-card mb-8 h-14 p-1">
              <TabsTrigger 
                value="signin" 
                className="text-base data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow rounded-lg transition-all"
              >
                {t('auth.login')}
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="text-base data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow rounded-lg transition-all"
              >
                {t('auth.signUp')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-6">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <Input id="email" type="email" placeholder={t('auth.emailPlaceholder')} className="pl-12 h-14 glass-card border-border/50 text-base" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <Input id="password" type="password" placeholder={t('auth.passwordPlaceholder')} className="pl-12 h-14 glass-card border-border/50 text-base" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                </div>

                <Button type="submit" className="w-full h-14 btn-gradient shadow-glow text-base font-semibold" disabled={loading}>
                  {loading ? t('auth.signingIn') : t('auth.signIn')}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-sm uppercase">
                  
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full h-14 btn-glass text-base" onClick={handleGoogleSignIn}>
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('auth.google')}
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-6">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-base">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <Input id="signup-email" type="email" placeholder={t('auth.emailPlaceholder')} className="pl-12 h-14 glass-card border-border/50 text-base" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-base">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <Input id="signup-password" type="password" placeholder={t('auth.passwordPlaceholder')} className="pl-12 h-14 glass-card border-border/50 text-base" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                  </div>
                </div>

                <Button type="submit" className="w-full h-14 btn-gradient shadow-glow text-base font-semibold" disabled={loading}>
                  {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-sm uppercase">
                  
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full h-14 btn-glass text-base" onClick={handleGoogleSignIn}>
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('auth.google')}
              </Button>

              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                {t('auth.terms')}
              </p>
            </TabsContent>
          </Tabs>
        </Card>
        </div>
      </div>
    </div>;
};
export default Auth;