import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, BarChart3, ShoppingCart, Zap, TrendingUp, Target, Shield, Sparkles, Brain, Gauge, Lock, Activity, Search, CheckCircle2, Check, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import logo from "@/assets/logo.png";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  return <div className="min-h-screen bg-black text-white relative">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 py-4 relative">
          <div className="flex items-center justify-between">
            {/* Logo - Left */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary blur-xl opacity-30 animate-pulse" />
                <img src={logo} alt="Sheet Tools" className="h-12 sm:h-16 w-auto relative logo-glow" />
              </div>
            </div>
            
            {/* Nav - Center (absolute positioning for true center) - Desktop Only */}
            <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-8">
              <button onClick={() => scrollToSection('what-is-it')} className="text-white hover:text-primary transition-colors whitespace-nowrap">
                {t('nav.whatIsIt')}
              </button>
              <button onClick={() => scrollToSection('features')} className="text-white hover:text-primary transition-colors whitespace-nowrap">
                {t('nav.features')}
              </button>
              <button onClick={() => scrollToSection('pricing')} className="text-white hover:text-primary transition-colors whitespace-nowrap">
                {t('nav.pricing')}
              </button>
              <button onClick={() => scrollToSection('faq')} className="text-white hover:text-primary transition-colors whitespace-nowrap">
                {t('nav.faq')}
              </button>
            </nav>

            {/* Actions - Right */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="hidden sm:block">
                <LanguageToggle />
              </div>
              <Button className="hidden sm:flex btn-gradient shadow-glow font-semibold px-6 rounded-lg" onClick={() => navigate("/auth")}>
                {t('header.getStarted')}
              </Button>
              
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
      <section className="container mx-auto px-4 sm:px-6 pt-32 pb-20 relative">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-8 leading-tight">
              {t('landing.hero.title1')}{" "}
              <span className="gradient-text">
                {t('landing.hero.title2')}
              </span>
            </h1>
            
            <p className="text-xl text-gray-400 mb-8">
              {t('landing.hero.subtitle')}
            </p>

            <div className="space-y-4 mb-10">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary" />
                <span className="text-gray-300">{t('landing.hero.benefit1')}</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary" />
                <span className="text-gray-300">{t('landing.hero.benefit2')}</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary" />
                <span className="text-gray-300">{t('landing.hero.benefit3')}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="btn-gradient shadow-glow font-semibold px-8 py-6 text-lg rounded-lg" onClick={() => navigate("/auth")}>
                {t('landing.hero.ctaPrimary')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-lg" onClick={() => scrollToSection('what-is-it')}>
                {t('landing.hero.ctaSecondary')}
              </Button>
            </div>
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
            <Card className="p-8 bg-white/5 border border-white/10 hover:border-primary/50 transition-all rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow">
                <Brain className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{t('landing.whatIsIt.smartAnalysis.title')}</h3>
              <p className="text-gray-400 leading-relaxed">
                {t('landing.whatIsIt.smartAnalysis.description')}
              </p>
            </Card>

            <Card className="p-8 bg-white/5 border border-white/10 hover:border-primary/50 transition-all rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow">
                <Gauge className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{t('landing.whatIsIt.decisionAutomation.title')}</h3>
              <p className="text-gray-400 leading-relaxed">
                {t('landing.whatIsIt.decisionAutomation.description')}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 sm:px-6 py-20 relative">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            {t('landing.features.title')}
          </h2>
          <p className="text-xl text-gray-400">
            {t('landing.features.subtitle')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
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
        }].map((feature, index) => <Card key={index} className="p-8 bg-white/5 border border-white/10 hover:border-primary/50 transition-all duration-300 rounded-2xl">
              <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow">
                <feature.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-3">{t(`landing.features.${feature.key}.title`)}</h3>
              <p className="text-gray-400 leading-relaxed">{t(`landing.features.${feature.key}.description`)}</p>
            </Card>)}
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
          <div className="flex items-center justify-center gap-4 mb-8">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('landing.pricing.monthly')}
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                billingPeriod === 'annual'
                  ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('landing.pricing.annual')}
              <span className="text-xs bg-primary/20 px-2 py-1 rounded">
                {t('landing.pricing.save3Months')}
              </span>
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-12">
          {[
            { key: 'beginner', popular: false },
            { key: 'basic', popular: false },
            { key: 'standard', popular: true },
            { key: 'expert', popular: false }
          ].map((plan, index) => (
            <Card 
              key={index} 
              className={`p-6 bg-white/5 border relative flex flex-col ${
                plan.popular ? 'border-primary scale-105 shadow-glow' : 'border-white/10'
              } rounded-2xl transition-all hover:border-primary/70`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-primary rounded-full text-sm font-bold text-primary-foreground">
                  {t('landing.pricing.popular')}
                </div>
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
              
              <Button 
                className={`w-full rounded-lg mt-auto ${
                  plan.popular 
                    ? 'btn-gradient shadow-glow' 
                    : 'border-white/20 text-white hover:bg-white/10'
                }`} 
                variant={plan.popular ? 'default' : 'outline'} 
                onClick={() => navigate("/auth")}
              >
                {t('landing.pricing.choosePlan')}
              </Button>
            </Card>
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
      <section className="container mx-auto px-4 sm:px-6 py-20 relative">
        <Card className="p-16 text-center bg-white/5 border border-white/10 rounded-3xl max-w-4xl mx-auto">
          <div className="space-y-6">
            <h2 className="text-4xl sm:text-5xl font-bold">
              {t('landing.cta.title')}
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              {t('landing.cta.description')}
            </p>
            <Button size="lg" className="btn-gradient shadow-glow font-semibold text-lg px-10 py-7 rounded-lg" onClick={() => navigate("/auth")}>
              {t('landing.cta.button')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </Card>
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