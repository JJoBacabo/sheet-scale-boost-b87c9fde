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
import { motion } from "framer-motion";
import { Card3D } from "@/components/ui/Card3D";
import { Button3D } from "@/components/ui/Button3D";
import { Background3D } from "@/components/ui/Background3D";
import { useCinematicScroll } from "@/hooks/useCinematicScroll";

const Landing = () => {
  const navigate = useNavigate();
  const {
    t
  } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  
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
      {/* CSS para remover fundo preto da seção Features */}
      <style>{`
        #features-storytelling {
          background: transparent !important;
        }
        #features-storytelling > * {
          background: transparent !important;
        }
      `}</style>
      {/* Background 3D */}
      <Background3D />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 py-4 relative">
          <div className="flex items-center justify-between">
            {/* Logo - Left */}
            <motion.div 
              className="flex items-center gap-3 flex-shrink-0"
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
                    whileHover={{ rotateY: 360 }}
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

      {/* Features Section - Simple Text Only */}
      <section id="features-storytelling" className="relative overflow-hidden bg-transparent min-h-screen flex items-center justify-center" aria-label="Features that make the difference">
        {/* Background da homepage (partículas) */}
        <Background3D />
        
        {/* Texto centralizado */}
        <div className="relative z-10 text-center px-4 sm:px-6">
          <motion.h2 
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Features that make the difference
          </motion.h2>
          <motion.p 
            className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Everything you need to optimize your campaigns in one platform
          </motion.p>
        </div>

        {/* Features with Full Page Scroll - Cinematic Effect */}
        <div className="features-container">
          {[{
            icon: Activity,
            key: 'integration'
          }, {
            icon: BarChart3,
            key: 'metrics'
          }, {
            icon: Brain,
            key: 'ai'
          }, {
            icon: Zap,
            key: 'automation'
          }, {
            icon: TrendingUp,
            key: 'profit'
          }, {
            icon: Lock,
            key: 'secure'
          }].map((feature, index) => (
            <motion.div
              key={index}
              className="feature-item snap-start snap-always min-h-screen flex items-center justify-center px-4 sm:px-6 relative"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, margin: "-50px", amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
            <motion.div
              className="max-w-4xl mx-auto w-full"
              initial={{ opacity: 0, y: 80, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: false, margin: "-50px", amount: 0.3 }}
              transition={{ 
                duration: 0.7, 
                type: "spring",
                stiffness: 100,
                damping: 15
              }}
            >
              <Card3D intensity="high" glow className="p-6 sm:p-10 md:p-14 lg:p-16">
                <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6 md:space-y-8">
                  {/* Icon */}
                  <motion.div
                    className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow"
                    whileInView={{ 
                      rotateY: [0, 360],
                      scale: [1, 1.15, 1]
                    }}
                    viewport={{ once: false }}
                    transition={{ 
                      duration: 1.2,
                      repeat: Infinity,
                      repeatDelay: 3
                    }}
                  >
                    <feature.icon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 text-primary-foreground" />
                  </motion.div>

                  {/* Title */}
                  <motion.h3 
                    className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold gradient-text"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                  >
                    {t(`landing.features.${feature.key}.title`)}
                  </motion.h3>

                  {/* Description */}
                  <motion.p 
                    className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 leading-relaxed max-w-3xl mx-auto px-4"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                  >
                    {t(`landing.features.${feature.key}.description`)}
                  </motion.p>

                  {/* Scroll Indicator - Only on last feature */}
                  {index === 5 && (
                    <motion.div
                      className="mt-6 sm:mt-8 flex flex-col items-center gap-2"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: false }}
                      transition={{ delay: 0.6 }}
                    >
                      <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-gray-400 text-xs sm:text-sm"
                      >
                        Continue scrolling
                      </motion.div>
                      <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                      >
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-primary rotate-90" />
                      </motion.div>
                    </motion.div>
                  )}
                </div>
              </Card3D>
            </motion.div>
          </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 sm:px-6 py-20 relative">
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
              whileHover={{ rotateY: 5 }}
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
              whileHover={{ rotateY: 5 }}
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
            { key: 'basic', popular: false },
            { key: 'standard', popular: true },
            { key: 'expert', popular: false },
            { key: 'business', popular: false }
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
                className="p-6 relative flex flex-col"
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
              
              {plan.key === 'business' ? (
                <>
                  <div className="mb-4">
                    <span className="text-3xl font-bold">
                      {t(`landing.pricing.${plan.key}.price`)}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-6 min-h-[40px]">
                    {t(`landing.pricing.${plan.key}.description`)}
                  </p>
                </>
              ) : billingPeriod === 'monthly' ? (
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
                {['feature1', 'feature2', 'feature3', 'feature4', 'feature5', 'feature6', 'feature7'].map((feat, i) => {
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
              
                {plan.key === 'business' ? (
                  <Button3D
                    variant="glass"
                    size="md"
                    className="w-full mt-auto"
                    onClick={() => window.location.href = 'mailto:info@sheet-tools.com?subject=Business Plan Inquiry'}
                  >
                    {t(`landing.pricing.${plan.key}.contactUs`)}
                  </Button3D>
                ) : (
                  <Button3D
                    variant={plan.popular ? 'gradient' : 'glass'}
                    size="md"
                    glow={plan.popular}
                    className="w-full mt-auto"
                    onClick={() => navigate("/auth")}
                  >
                    {t('landing.pricing.choosePlan')}
                  </Button3D>
                )}
              </Card3D>
            </motion.div>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-5xl mx-auto mt-16">
          <h3 className="text-2xl font-bold text-center mb-4">{t('landing.pricing.featureComparison.title')}</h3>
          <p className="text-center text-gray-400 text-sm mb-8">
            {t('landing.pricing.featureComparison.note')}
          </p>
          <Card className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-gray-400 font-semibold">{t('landing.pricing.featureComparison.feature')}</th>
                    <th className="text-center p-4 text-gray-400 font-semibold">Basic</th>
                    <th className="text-center p-4 text-gray-400 font-semibold">Standard</th>
                    <th className="text-center p-4 text-gray-400 font-semibold">Expert</th>
                    <th className="text-center p-4 text-gray-400 font-semibold">Business</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'dailyRoas', basic: true, standard: true, expert: true, business: true },
                    { key: 'profitSheet', basic: true, standard: true, expert: true, business: true },
                    { key: 'quotation', basic: false, standard: true, expert: true, business: true },
                    { key: 'campaigns', basic: false, standard: true, expert: true, business: true },
                    { key: 'productResearch', basic: false, standard: false, expert: true, business: true },
                    { key: 'prioritySupport', basic: false, standard: false, expert: true, business: true },
                    { key: 'completeHistory', basic: false, standard: false, expert: true, business: true },
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
                      <td className="p-4 text-center">
                        {feature.business ? (
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