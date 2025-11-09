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
import { useCinematicScroll } from "@/hooks/useCinematicScroll";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ZoomIn } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();
  const {
    t
  } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);
  
  // Hook para efeito cinematográfico de scroll nas features
  useCinematicScroll('features');
  
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

      {/* Features Section - Full Page Scroll */}
      <section id="features" className="relative" aria-label="Features section">
        {/* Section Title - Fixed at top */}
        <div className="sticky top-0 z-30 text-center py-6 sm:py-8 bg-black/80 backdrop-blur-md border-b border-white/10">
          <motion.h2 
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {t('landing.features.title')}
          </motion.h2>
          <motion.p 
            className="text-base sm:text-lg md:text-xl text-gray-400"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            {t('landing.features.subtitle')}
          </motion.p>
        </div>

        {/* Features with Horizontal Scroll */}
        <div className="features-container relative" style={{ minHeight: '100vh', overflow: 'hidden' }}>
          {[{
            icon: Activity,
            key: 'integration',
            images: [
              { src: '/images/feature-integration-1.jpg', alt: 'Facebook Ads Integration Dashboard' },
              { src: '/images/feature-integration-2.jpg', alt: 'Campaign Analytics View' }
            ]
          }, {
            icon: BarChart3,
            key: 'metrics',
            images: [
              { src: '/images/feature-metrics-1.jpg', alt: 'Real-time Metrics Dashboard' },
              { src: '/images/feature-metrics-2.jpg', alt: 'Performance Analytics' }
            ]
          }, {
            icon: Brain,
            key: 'ai',
            images: [
              { src: '/images/feature-ai-1.jpg', alt: 'AI Analysis Interface' },
              { src: '/images/feature-ai-2.jpg', alt: 'Smart Recommendations' }
            ]
          }, {
            icon: Zap,
            key: 'automation',
            images: [
              { src: '/images/feature-automation-1.jpg', alt: 'Automation Settings' },
              { src: '/images/feature-automation-2.jpg', alt: 'Workflow Builder' }
            ]
          }, {
            icon: TrendingUp,
            key: 'profit',
            images: [
              { src: '/images/feature-profit-1.jpg', alt: 'Profit Analysis Dashboard' },
              { src: '/images/feature-profit-2.jpg', alt: 'Revenue Tracking' }
            ]
          }, {
            icon: Lock,
            key: 'secure',
            images: [
              { src: '/images/feature-secure-1.jpg', alt: 'Security Features' },
              { src: '/images/feature-secure-2.jpg', alt: 'Data Protection' }
            ]
          }].map((feature, index) => {
            return (
            <div
              key={index}
              className="feature-item min-h-screen flex items-center justify-center px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20"
              style={{ 
                position: 'relative',
                width: '100vw',
                flexShrink: 0,
              }}
            >
              <div className="max-w-7xl mx-auto w-full">
                {/* Disposição alternada: texto-imagem (índice par) ou imagem-texto (índice ímpar) */}
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center ${
                  index % 2 === 0 ? '' : 'lg:grid-flow-dense'
                }`}>
                  {/* Content Section */}
                  <div className={`space-y-6 sm:space-y-8 ${
                    index % 2 === 0 
                      ? 'lg:order-1' 
                      : 'lg:order-2 lg:col-start-2'
                  }`}>
                    {/* Icon */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
                        <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary-foreground" />
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
                    </div>

                    {/* Title */}
                    <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold gradient-text leading-tight">
                      {t(`landing.features.${feature.key}.title`)}
                    </h3>

                    {/* Description */}
                    <p className="text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed">
                      {t(`landing.features.${feature.key}.description`)}
                    </p>

                    {/* Additional Features List - Specific to each feature */}
                    <motion.div 
                      className="space-y-3 pt-4"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                      viewport={{ once: false, amount: 0.3 }}
                    >
                      {feature.key === 'integration' && (
                        <>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.4 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Conexão direta com Facebook Ads, Shopify e mais
                            </p>
                          </motion.div>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.5 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Sincronização automática de campanhas e produtos
                            </p>
                          </motion.div>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.6 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Configuração em menos de 5 minutos
                            </p>
                          </motion.div>
                        </>
                      )}
                      {feature.key === 'metrics' && (
                        <>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.4 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Análise em tempo real de todas as suas campanhas
                            </p>
                          </motion.div>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.5 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Dashboard completo com KPIs essenciais
                            </p>
                          </motion.div>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.6 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Alertas inteligentes sobre performance
                            </p>
                          </motion.div>
                        </>
                      )}
                      {feature.key === 'ai' && (
                        <>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.4 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Relatórios detalhados e insights acionáveis
                            </p>
                          </motion.div>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.5 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Sugestões automáticas de otimização
                            </p>
                          </motion.div>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.6 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Previsões de performance baseadas em IA
                            </p>
                          </motion.div>
                        </>
                      )}
                      {feature.key === 'automation' && (
                        <>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.4 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Integração automática com suas plataformas
                            </p>
                          </motion.div>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.5 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Regras personalizadas de auto-scaling
                            </p>
                          </motion.div>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.6 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Notificações instantâneas por email
                            </p>
                          </motion.div>
                        </>
                      )}
                      {feature.key === 'profit' && (
                        <>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.4 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Cálculo automático de margem e lucro líquido
                            </p>
                          </motion.div>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.5 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Relatórios de rentabilidade por produto
                            </p>
                          </motion.div>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.6 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Exportação para Excel e Google Sheets
                            </p>
                          </motion.div>
                        </>
                      )}
                      {feature.key === 'secure' && (
                        <>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.4 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Dados criptografados de ponta a ponta
                            </p>
                          </motion.div>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.5 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Conformidade com GDPR e LGPD
                            </p>
                          </motion.div>
                          <motion.div 
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.6 }}
                            viewport={{ once: false }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm sm:text-base text-gray-400">
                              Backups automáticos diários
                            </p>
                          </motion.div>
                        </>
                      )}
                    </motion.div>

                    {/* Scroll Indicator - Only on last feature */}
                    {index === 5 && (
                      <div className="pt-8 flex flex-col items-start gap-2">
                        <div className="text-gray-400 text-sm">
                          Continue scrolling
                        </div>
                        <ArrowRight className="w-5 h-5 text-primary rotate-90" />
                      </div>
                    )}
                  </div>

                  {/* Images Section */}
                  <div className={`space-y-4 ${
                    index % 2 === 0 
                      ? 'lg:order-2' 
                      : 'lg:order-1 lg:col-start-1 lg:row-start-1'
                  }`}>
                    {/* Two Images Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {feature.images.map((img, imgIndex) => (
                        <motion.div
                          key={imgIndex}
                          className="relative group cursor-pointer rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 aspect-video"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedImage(img)}
                        >
                          {/* Placeholder ou Imagem */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                            <div className="text-center p-4">
                              <feature.icon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 text-primary/50 group-hover:text-primary/70 transition-colors" />
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                Imagem {imgIndex + 1}
                              </p>
                            </div>
                            {/* Descomente para usar imagem real:
                            <img 
                              src={img.src} 
                              alt={img.alt} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            */}
                          </div>
                          
                          {/* Zoom Icon Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                            <ZoomIn className="w-8 h-8 text-white" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* Additional Info Below Images */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>Clique nas imagens para ampliar</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {/* Image Zoom Modal */}
        <AnimatePresence>
          {selectedImage && (
            <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
              <DialogContent className="max-w-7xl w-full p-0 bg-black/95 border-primary/20">
                <div className="relative">
                  <motion.button
                    className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/80 hover:bg-black/90 flex items-center justify-center text-white transition-colors"
                    onClick={() => setSelectedImage(null)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                  
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4"
                  >
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                      {/* Placeholder ou Imagem Ampliada */}
                      <div className="text-center p-8">
                        <ZoomIn className="w-24 h-24 mx-auto mb-4 text-primary/50" />
                        <p className="text-lg text-muted-foreground mb-2">
                          {selectedImage.alt}
                        </p>
                        <p className="text-sm text-muted-foreground/70">
                          Adicione sua imagem aqui para ver o zoom
                        </p>
                      </div>
                      {/* Descomente para usar imagem real:
                      <img 
                        src={selectedImage.src} 
                        alt={selectedImage.alt} 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      */}
                    </div>
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      {selectedImage.alt}
                    </p>
                  </motion.div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>
      </section>

      {/* Spacer between Features and Pricing - prevents black gap */}
      <div className="relative h-32 sm:h-40 md:h-48 overflow-hidden">
        {/* Gradient transition from features to pricing */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-primary/10 to-black" />
        {/* Decorative elements */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full max-w-4xl mx-auto px-4">
            <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 sm:px-6 py-20 relative bg-gradient-to-b from-black via-black/95 to-black">
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
                  <button onClick={() => scrollToSection('features')} className="text-gray-400 hover:text-white transition-colors">
                    {t('footer.features')}
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