import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, BarChart3, ShoppingCart, Zap, TrendingUp, Target, Shield, Sparkles, Brain, Gauge, Lock, Activity, Search, CheckCircle2, Check, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import logo from "@/assets/logo.png";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Card3D } from "@/components/ui/Card3D";
import { Button3D } from "@/components/ui/Button3D";
import { Background3D } from "@/components/ui/Background3D";
import { useStorytellingScroll } from "@/hooks/useStorytellingScroll";
import { useStorytellingScrollWithImages } from "@/hooks/useStorytellingScrollWithImages";

const Landing = () => {
  const navigate = useNavigate();
  const {
    t
  } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  
  // Hook para efeito de scroll storytelling com imagens (Facebook Ads Integration)
  useStorytellingScrollWithImages('facebook-integration-storytelling');
  
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
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth'
      });
    }
    setMobileMenuOpen(false);
  };
  return <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background 3D */}
      <Background3D />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 py-4 relative">
          <div className="flex items-center justify-between">
            {/* Logo - Left */}
            <motion.div 
              className="flex items-center gap-3 flex-shrink-0"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary blur-xl opacity-30 animate-pulse" />
                <motion.img 
                  src={logo} 
                  alt="Sheet Tools" 
                  className="h-12 sm:h-16 w-auto relative logo-glow"
                  animate={{ 
                    filter: [
                      "drop-shadow(0 0 8px rgba(74, 233, 189, 0.3))",
                      "drop-shadow(0 0 16px rgba(74, 233, 189, 0.5))",
                      "drop-shadow(0 0 8px rgba(74, 233, 189, 0.3))"
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </div>
            </motion.div>
            
            {/* Nav - Center (absolute positioning for true center) - Desktop Only */}
            <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-8">
              {['what-is-it', 'features', 'pricing', 'faq'].map((section, index) => (
                <motion.button
                  key={section}
                  onClick={() => scrollToSection(section)}
                  className="text-white hover:text-primary transition-colors whitespace-nowrap"
                  whileHover={{ 
                    rotateY: 5, 
                    z: 10,
                    scale: 1.05
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, type: "spring" }}
                >
                  {t(`nav.${section === 'what-is-it' ? 'whatIsIt' : section}`)}
                </motion.button>
              ))}
            </nav>

            {/* Actions - Right */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="hidden sm:block">
                <LanguageToggle />
              </div>
              <Button3D 
                variant="gradient" 
                size="md"
                glow
                className="hidden sm:flex"
                onClick={() => navigate("/auth")}
              >
                {t('header.getStarted')}
              </Button3D>
              
              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="text-white">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] bg-black border-white/10">
                  <nav className="flex flex-col gap-6 mt-8">
                    <button 
                      onClick={() => scrollToSection('what-is-it')} 
                      className="text-white hover:text-primary transition-colors text-left text-lg"
                    >
                      {t('nav.whatIsIt')}
                    </button>
                    <button 
                      onClick={() => scrollToSection('features')} 
                      className="text-white hover:text-primary transition-colors text-left text-lg"
                    >
                      {t('nav.features')}
                    </button>
                    <button 
                      onClick={() => scrollToSection('pricing')} 
                      className="text-white hover:text-primary transition-colors text-left text-lg"
                    >
                      {t('nav.pricing')}
                    </button>
                    <button 
                      onClick={() => scrollToSection('faq')} 
                      className="text-white hover:text-primary transition-colors text-left text-lg"
                    >
                      {t('nav.faq')}
                    </button>
                    <div className="pt-4 border-t border-white/10">
                      <LanguageToggle />
                    </div>
                    <Button 
                      className="btn-gradient shadow-glow font-semibold rounded-lg w-full" 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate("/auth");
                      }}
                    >
                      {t('header.getStarted')}
                    </Button>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 pt-32 pb-20 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <motion.h1 
              className="text-5xl sm:text-6xl md:text-7xl font-bold mb-8 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {t('landing.hero.title1')}{" "}
              <motion.span 
                className="gradient-text"
                style={{ transformStyle: 'preserve-3d', display: 'inline-block' }}
                animate={{ 
                  rotateY: [0, 5, 0],
                  rotateX: [0, 2, 0]
                }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                {t('landing.hero.title2')}
              </motion.span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-gray-400 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              {t('landing.hero.subtitle')}
            </motion.p>

            <motion.div 
              className="space-y-4 mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {[1, 2, 3].map((num) => (
                <motion.div
                  key={num}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + num * 0.1 }}
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: num * 0.3 }}
                  >
                    <Check className="w-5 h-5 text-primary" />
                  </motion.div>
                  <span className="text-gray-300">{t(`landing.hero.benefit${num}`)}</span>
                </motion.div>
              ))}
            </motion.div>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <Button3D 
                variant="gradient" 
                size="lg" 
                glow
                onClick={() => navigate("/auth")}
              >
                {t('landing.hero.ctaPrimary')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button3D>
              <Button3D 
                variant="glass" 
                size="lg"
                onClick={() => scrollToSection('what-is-it')}
              >
                {t('landing.hero.ctaSecondary')}
              </Button3D>
            </motion.div>
          </div>
        </div>
      </section>

      {/* What is it Section */}
      <section id="what-is-it" className="container mx-auto px-4 sm:px-6 py-20 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              {t('landing.whatIsIt.title')}
            </h2>
            <p className="text-xl text-gray-400 max-w-4xl mx-auto">
              {t('landing.whatIsIt.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { icon: Brain, key: 'smartAnalysis' },
              { icon: Gauge, key: 'decisionAutomation' }
            ].map((item, index) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 50, rotateX: -15 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: index * 0.2, type: "spring", stiffness: 100 }}
              >
                <Card3D intensity="medium" glow>
                  <motion.div
                    className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow"
                    whileHover={{ rotateY: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <item.icon className="w-8 h-8 text-primary-foreground" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-4">{t(`landing.whatIsIt.${item.key}.title`)}</h3>
                  <p className="text-gray-400 leading-relaxed">
                    {t(`landing.whatIsIt.${item.key}.description`)}
                  </p>
                </Card3D>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 sm:px-6 py-20 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Features that make the difference
            </h2>
            <p className="text-xl text-gray-400 max-w-4xl mx-auto">
              Connect directly to your campaigns for real-time analysis and powerful insights
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: 'Real-Time Analysis', description: 'Monitoriza campanhas em tempo real com métricas atualizadas segundo a segundo' },
              { icon: Brain, title: 'Campaign Insights', description: 'Obtém insights automáticos sobre desempenho, públicos e tendências' },
              { icon: Shield, title: 'Automatic Reports', description: 'Gera relatórios personalizados automaticamente e exporta para PDF' },
              { icon: Target, title: 'Cross-Platform Integration', description: 'Liga o Facebook Ads a outras plataformas como Google Ads ou TikTok Ads' },
              { icon: Sparkles, title: 'Actionable Decisions', description: 'Transforma dados em decisões com recomendações inteligentes' },
              { icon: BarChart3, title: 'Advanced Analytics', description: 'Análise profunda de dados com visualizações interativas e dashboards personalizados' }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50, rotateX: -15 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
              >
                <Card3D intensity="medium" glow>
                  <motion.div
                    className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow"
                    whileHover={{ rotateY: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <feature.icon className="w-8 h-8 text-primary-foreground" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </Card3D>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Facebook Ads Integration - Storytelling Scroll with Images */}
      <section id="facebook-integration-storytelling" className="relative overflow-hidden" aria-label="Facebook Ads Integration">
        {/* Background da homepage (partículas) */}
        <Background3D />
        
        {/* Container para os tópicos - cada tópico será animado individualmente */}
        <div className="relative w-full">
          {/* Tópico 1: Facebook Ads Integration - Texto | Imagem */}
          <div className="storytelling-topic absolute inset-0 min-h-screen flex items-center justify-center pointer-events-none">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
                {/* Texto - Esquerda */}
                <div className="space-y-6 sm:space-y-8">
                  {/* Ícone */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
                      <Activity className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary-foreground" />
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold gradient-text leading-tight">
                    Facebook Ads Integration
                  </h2>
                  <p className="text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed">
                    Integra a tua conta do Facebook Ads e vê todos os dados num só painel.
                  </p>
                </div>
                {/* Imagens - Direita */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 aspect-video flex items-center justify-center">
                    <div className="text-center p-4">
                      <Activity className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 text-primary/50" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Logótipo Facebook Ads</p>
                    </div>
                  </div>
                  <div className="relative group rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 aspect-video flex items-center justify-center">
                    <div className="text-center p-4">
                      <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 text-primary/50" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Gráfico Dinâmico</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tópico 2: Real-Time Analysis - Imagem | Texto */}
          <div className="storytelling-topic absolute inset-0 min-h-screen flex items-center justify-center pointer-events-none">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center lg:grid-flow-dense">
                {/* Imagens - Esquerda */}
                <div className="grid grid-cols-2 gap-4 lg:order-1 lg:col-start-1 lg:row-start-1">
                  <div className="relative group rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 aspect-video flex items-center justify-center">
                    <div className="text-center p-4">
                      <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 text-primary/50" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Dashboard Analítico</p>
                    </div>
                  </div>
                  <div className="relative group rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 aspect-video flex items-center justify-center">
                    <div className="text-center p-4">
                      <Gauge className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 text-primary/50" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Relógio Digital</p>
                    </div>
                  </div>
                </div>
                {/* Texto - Direita */}
                <div className="space-y-6 sm:space-y-8 lg:order-2 lg:col-start-2">
                  {/* Ícone */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
                      <Zap className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary-foreground" />
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold gradient-text leading-tight">
                    Real-Time Analysis
                  </h2>
                  <p className="text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed">
                    Monitoriza campanhas em tempo real com métricas atualizadas segundo a segundo.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tópico 3: Campaign Insights - Texto | Imagem */}
          <div className="storytelling-topic absolute inset-0 min-h-screen flex items-center justify-center pointer-events-none">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
                {/* Texto - Esquerda */}
                <div className="space-y-6 sm:space-y-8">
                  {/* Ícone */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
                      <Brain className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary-foreground" />
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold gradient-text leading-tight">
                    Campaign Insights
                  </h2>
                  <p className="text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed">
                    Obtém insights automáticos sobre desempenho, públicos e tendências.
                  </p>
                </div>
                {/* Imagens - Direita */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 aspect-video flex items-center justify-center">
                    <div className="text-center p-4">
                      <TrendingUp className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 text-primary/50" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Gráfico de Barras</p>
                    </div>
                  </div>
                  <div className="relative group rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 aspect-video flex items-center justify-center">
                    <div className="text-center p-4">
                      <Brain className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 text-primary/50" />
                      <p className="text-xs sm:text-sm text-muted-foreground">IA</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tópico 4: Automatic Reports - Imagem | Texto */}
          <div className="storytelling-topic absolute inset-0 min-h-screen flex items-center justify-center pointer-events-none">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center lg:grid-flow-dense">
                {/* Imagens - Esquerda */}
                <div className="grid grid-cols-2 gap-4 lg:order-1 lg:col-start-1 lg:row-start-1">
                  <div className="relative group rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 aspect-video flex items-center justify-center">
                    <div className="text-center p-4">
                      <Shield className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 text-primary/50" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Documento PDF</p>
                    </div>
                  </div>
                  <div className="relative group rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 aspect-video flex items-center justify-center">
                    <div className="text-center p-4">
                      <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 text-primary/50" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Gráfico Resumido</p>
                    </div>
                  </div>
                </div>
                {/* Texto - Direita */}
                <div className="space-y-6 sm:space-y-8 lg:order-2 lg:col-start-2">
                  {/* Ícone */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
                      <Shield className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary-foreground" />
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold gradient-text leading-tight">
                    Automatic Reports
                  </h2>
                  <p className="text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed">
                    Gera relatórios personalizados automaticamente e exporta para PDF.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tópico 5: Cross-Platform Integration - Texto | Imagem */}
          <div className="storytelling-topic absolute inset-0 min-h-screen flex items-center justify-center pointer-events-none">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
                {/* Texto - Esquerda */}
                <div className="space-y-6 sm:space-y-8">
                  {/* Ícone */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
                      <Target className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary-foreground" />
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold gradient-text leading-tight">
                    Cross-Platform Integration
                  </h2>
                  <p className="text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed">
                    Liga o Facebook Ads a outras plataformas como Google Ads ou TikTok Ads.
                  </p>
                </div>
                {/* Imagens - Direita */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 aspect-video flex items-center justify-center">
                    <div className="text-center p-4">
                      <Target className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 text-primary/50" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Ícones Plataformas</p>
                    </div>
                  </div>
                  <div className="relative group rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 aspect-video flex items-center justify-center">
                    <div className="text-center p-4">
                      <Zap className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 text-primary/50" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Linhas de Ligação</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tópico 6: Actionable Decisions - Imagem | Texto */}
          <div className="storytelling-topic absolute inset-0 min-h-screen flex items-center justify-center pointer-events-none">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center lg:grid-flow-dense">
                {/* Imagens - Esquerda */}
                <div className="grid grid-cols-2 gap-4 lg:order-1 lg:col-start-1 lg:row-start-1">
                  <div className="relative group rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 aspect-video flex items-center justify-center">
                    <div className="text-center p-4">
                      <Zap className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 text-primary/50" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Botão de Ação</p>
                    </div>
                  </div>
                  <div className="relative group rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 aspect-video flex items-center justify-center">
                    <div className="text-center p-4">
                      <ArrowRight className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 text-primary/50" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Setas Progresso</p>
                    </div>
                  </div>
                </div>
                {/* Texto - Direita */}
                <div className="space-y-6 sm:space-y-8 lg:order-2 lg:col-start-2">
                  {/* Ícone */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
                      <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary-foreground" />
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold gradient-text leading-tight">
                    Actionable Decisions
                  </h2>
                  <p className="text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed">
                    Transforma dados em decisões com recomendações inteligentes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 sm:px-6 pt-0 pb-20 relative bg-gradient-to-b from-black via-black/95 to-black">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            {t('landing.pricing.title')}
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            {t('landing.pricing.subtitle')}
          </p>
          
          {/* Billing Toggle */}
          <motion.div 
            className="flex items-center justify-center gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                  : 'text-gray-400 hover:text-white'
              }`}
              whileHover={{ scale: 1.05, rotateY: 5 }}
              whileTap={{ scale: 0.95 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {t('landing.pricing.monthly')}
            </motion.button>
            <motion.button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                billingPeriod === 'annual'
                  ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                  : 'text-gray-400 hover:text-white'
              }`}
              whileHover={{ scale: 1.05, rotateY: 5 }}
              whileTap={{ scale: 0.95 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {t('landing.pricing.annual')}
              <motion.span 
                className="text-xs bg-primary/20 px-2 py-1 rounded"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {t('landing.pricing.save3Months')}
              </motion.span>
            </motion.button>
          </motion.div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-12">
          {[
            { key: 'beginner', popular: false },
            { key: 'basic', popular: false },
            { key: 'standard', popular: true },
            { key: 'expert', popular: false }
          ].map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50, rotateX: -15 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: index * 0.15, type: "spring", stiffness: 100 }}
            >
              <Card3D 
                intensity={plan.popular ? "high" : "medium"}
                glow={plan.popular}
                className={`p-6 relative flex flex-col ${plan.popular ? 'scale-105' : ''}`}
              >
                {plan.popular && (
                  <motion.div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-primary rounded-full text-sm font-bold text-primary-foreground z-10"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {t('landing.pricing.popular')}
                  </motion.div>
                )}
              <h3 className="text-xl font-bold mb-2">{t(`landing.pricing.${plan.key}.name`)}</h3>
              
              {billingPeriod === 'monthly' ? (
                <>
                  <div className="mb-4">
                    <span className="text-3xl font-bold">
                      {t(`landing.pricing.${plan.key}.price`)}
                    </span>
                    <span className="text-lg text-gray-400">
                      {t(`landing.pricing.${plan.key}.perMonth`)}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-6 min-h-[40px]">
                    {t(`landing.pricing.${plan.key}.description`)}
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-2">
                    <span className="text-2xl text-gray-500 line-through">
                      {t(`landing.pricing.${plan.key}.annualOriginal`)}
                    </span>
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-bold">
                      {t(`landing.pricing.${plan.key}.annualPrice`)}
                    </span>
                    <span className="text-lg text-gray-400">
                      {t(`landing.pricing.${plan.key}.perYear`)}
                    </span>
                  </div>
                  <p className="text-primary text-sm mb-6 font-semibold">
                    {t(`landing.pricing.${plan.key}.annualSavings`)}
                  </p>
                </>
              )}
              
              <ul className="space-y-2 mb-6 flex-1">
                {['feature1', 'feature2', 'feature3', 'feature4', 'feature5'].map((feat, i) => {
                  const featureText = t(`landing.pricing.${plan.key}.${feat}`);
                  if (featureText === `landing.pricing.${plan.key}.${feat}`) return null;
                  
                  return (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-gray-300">{featureText}</span>
                    </li>
                  );
                })}
              </ul>
              
                <Button3D
                  variant={plan.popular ? 'gradient' : 'glass'}
                  size="md"
                  glow={plan.popular}
                  className="w-full mt-auto"
                  onClick={() => navigate("/auth")}
                >
                  {t('landing.pricing.choosePlan')}
                </Button3D>
              </Card3D>
            </motion.div>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-5xl mx-auto mt-16">
          <h3 className="text-2xl font-bold text-center mb-8">{t('landing.pricing.featureComparison.title')}</h3>
          <Card className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-gray-400 font-semibold">{t('landing.pricing.featureComparison.feature')}</th>
                    <th className="text-center p-4 text-gray-400 font-semibold">Basic</th>
                    <th className="text-center p-4 text-gray-400 font-semibold">Standard</th>
                    <th className="text-center p-4 text-gray-400 font-semibold">Expert</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'roasSheet', basic: true, standard: true, expert: true },
                    { key: 'quotation', basic: false, standard: true, expert: true },
                    { key: 'campaigns', basic: false, standard: true, expert: true },
                    { key: 'productResearch', basic: false, standard: false, expert: true },
                    { key: 'prioritySupport', basic: false, standard: false, expert: true },
                    { key: 'completeHistory', basic: false, standard: false, expert: true },
                  ].map((feature, i) => (
                    <tr key={i} className="border-b border-white/10 last:border-0">
                      <td className="p-4 text-gray-300">{t(`landing.pricing.featureComparison.${feature.key}`)}</td>
                      <td className="p-4 text-center">
                        {feature.basic ? (
                          <Check className="w-5 h-5 text-primary mx-auto" />
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {feature.standard ? (
                          <Check className="w-5 h-5 text-primary mx-auto" />
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {feature.expert ? (
                          <Check className="w-5 h-5 text-primary mx-auto" />
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="container mx-auto px-4 sm:px-6 py-20 relative">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            {t('landing.faq.title')}
          </h2>
          <p className="text-xl text-gray-400">
            {t('landing.faq.subtitle')}
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {['q1', 'q2', 'q3', 'q4', 'q5'].map((key, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-white/5 border border-white/10 rounded-2xl px-6 data-[state=open]:border-primary/50"
              >
                <AccordionTrigger className="text-lg font-bold hover:no-underline py-6">
                  {t(`faq.${key}.question`)}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400 leading-relaxed pb-6">
                  {t(`faq.${key}.answer`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 py-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotateX: -10 }}
          whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 100 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <Card3D intensity="high" glow className="p-16 text-center max-w-4xl mx-auto">
            <div className="space-y-6">
              <motion.h2 
                className="text-4xl sm:text-5xl font-bold"
                animate={{ 
                  textShadow: [
                    "0 0 20px rgba(74, 233, 189, 0.3)",
                    "0 0 30px rgba(74, 233, 189, 0.5)",
                    "0 0 20px rgba(74, 233, 189, 0.3)"
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {t('landing.cta.title')}
              </motion.h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                {t('landing.cta.description')}
              </p>
              <Button3D 
                variant="gradient" 
                size="lg" 
                glow
                onClick={() => navigate("/auth")}
              >
                {t('landing.cta.button')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button3D>
            </div>
          </Card3D>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-16 bg-black">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Logo Column */}
            <div>
              <img src={logo} alt="Sheet Tools" className="h-16 w-auto mb-4" />
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">{t('footer.quickLinks')}</h3>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => window.scrollTo({
                  top: 0,
                  behavior: 'smooth'
                })} className="text-gray-400 hover:text-white transition-colors">
                    {t('footer.home')}
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('pricing')} className="text-gray-400 hover:text-white transition-colors">
                    {t('footer.pricing')}
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('faq')} className="text-gray-400 hover:text-white transition-colors">
                    {t('footer.faq')}
                  </button>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">{t('footer.legal')}</h3>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => navigate('/terms')} className="text-gray-400 hover:text-white transition-colors">
                    {t('footer.termsOfService')}
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/privacy')} className="text-gray-400 hover:text-white transition-colors">
                    {t('footer.privacyPolicy')}
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">{t('footer.contact')}</h3>
              <a href="mailto:info@sheet-tools.com" className="text-gray-400 hover:text-white transition-colors">
                info@sheet-tools.com
              </a>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8">
            <p className="text-center text-gray-400 text-sm">{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Landing;