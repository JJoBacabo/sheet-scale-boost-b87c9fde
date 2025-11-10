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
const Landing = () => {
  const navigate = useNavigate();
  const {
    t
  } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [gsapLoaded, setGsapLoaded] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{featureIndex: number, imageIndex: number} | null>(null);

  // Refs for Features Pinned Section
  const featuresRef = useRef<HTMLDivElement>(null);
  const gsapRef = useRef<any>(null);
  const ScrollTriggerRef = useRef<any>(null);
  const scrollTriggersRef = useRef<any[]>([]);

  // Load GSAP
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("gsap").then(gsapModule => {
        import("gsap/ScrollTrigger").then(ScrollTriggerModule => {
          const gsap = gsapModule.default;
          const ScrollTrigger = ScrollTriggerModule.default;
          gsap.registerPlugin(ScrollTrigger);
          gsapRef.current = gsap;
          ScrollTriggerRef.current = ScrollTrigger;
          setGsapLoaded(true);
        });
      });
    }
  }, []);

  // Features Pinned Section animation
  useEffect(() => {
    if (!featuresRef.current || !gsapLoaded || !gsapRef.current || !ScrollTriggerRef.current) return;
    let timeoutId: NodeJS.Timeout;
    let ctx: any;

    // Wait a bit for DOM to be ready
    timeoutId = setTimeout(() => {
      const gsap = gsapRef.current;
      const ScrollTrigger = ScrollTriggerRef.current;
      if (!gsap || !ScrollTrigger || !featuresRef.current) return;
      ctx = gsap.context(() => {
        const container = featuresRef.current?.querySelector(".pinned-features-container");
        const cards = featuresRef.current?.querySelectorAll(".feature-card-4");
        if (!container || !cards || cards.length === 0) return;

        // Set initial state - all cards hidden except first
        gsap.set(cards, {
          opacity: 0,
          y: 50,
          scale: 0.9
        });
        gsap.set(cards[0], {
          opacity: 1,
          y: 0,
          scale: 1
        });

        // Pin the container
        const pinTrigger = ScrollTrigger.create({
          trigger: container as Element,
          start: "top top",
          end: "+=500%",
          pin: true,
          pinSpacing: true
        });
        scrollTriggersRef.current.push(pinTrigger);

        // Track current visible card to avoid unnecessary animations
        let currentVisibleIndex = 0;

        // Create scroll trigger that updates cards based on progress
        const scrollTrigger = ScrollTrigger.create({
          trigger: container as Element,
          start: "top top",
          end: "+=500%",
          scrub: 1,
          onUpdate: self => {
            const progress = self.progress;
            const totalCards = cards.length;

            // Calculate which card should be visible
            const newIndex = Math.min(Math.floor(progress * totalCards), totalCards - 1);

            // Only update if index changed
            if (newIndex !== currentVisibleIndex) {
              currentVisibleIndex = newIndex;

              // Update all cards based on current index
              cards.forEach((card, index) => {
                if (index === currentVisibleIndex) {
                  // Show current card
                  gsap.to(card, {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.5,
                    ease: "power2.out"
                  });
                } else {
                  // Hide other cards
                  gsap.to(card, {
                    opacity: 0,
                    y: index < currentVisibleIndex ? -50 : 50,
                    scale: 0.9,
                    duration: 0.5,
                    ease: "power2.out"
                  });
                }
              });
            }
          }
        });
        scrollTriggersRef.current.push(scrollTrigger);

        // Refresh ScrollTrigger after setup
        ScrollTrigger.refresh();
      }, featuresRef);
    }, 100);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (ctx) ctx?.revert();
      scrollTriggersRef.current.forEach(trigger => trigger?.kill());
      scrollTriggersRef.current = [];
    };
  }, [gsapLoaded]);

  // Verificar se o usuário já está autenticado ao carregar a página
  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      // Aguardar um pouco para garantir que o Supabase restaurou a sessão do localStorage
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!mounted) return;
      const {
        data: {
          session
        },
        error
      } = await supabase.auth.getSession();
      if (session && !error) {
        navigate("/dashboard");
      }
    };
    checkSession();

    // Também escutar mudanças no estado de autenticação
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
  return <div className="min-h-screen bg-[#0A0E27] text-[#F0F4F8] relative overflow-hidden">
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#050F2A]/80 backdrop-blur-md border-b border-[#B8A0FF]/20">
        <div className="container mx-auto px-4 sm:px-6 py-4 relative">
          <div className="flex items-center justify-between">
            {/* Logo - Left */}
            <motion.div className="flex items-center gap-3 flex-shrink-0" transition={{
            type: "spring",
            stiffness: 300
          }}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary blur-xl opacity-30 animate-pulse" />
                <motion.img src={logo} alt="Sheet Tools" className="h-12 sm:h-16 w-auto relative logo-glow" animate={{
                filter: ["drop-shadow(0 0 8px rgba(74, 233, 189, 0.3))", "drop-shadow(0 0 16px rgba(74, 233, 189, 0.5))", "drop-shadow(0 0 8px rgba(74, 233, 189, 0.3))"]
              }} transition={{
                duration: 3,
                repeat: Infinity
              }} />
              </div>
            </motion.div>
            
            {/* Nav - Center (absolute positioning for true center) - Desktop Only */}
            <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-8">
              {['what-is-it', 'features', 'pricing', 'faq'].map((section, index) => <motion.button key={section} onClick={() => scrollToSection(section)} className="text-white hover:text-primary transition-colors whitespace-nowrap" whileHover={{
              rotateY: 5,
              z: 10,
              scale: 1.05
            }} style={{
              transformStyle: 'preserve-3d'
            }} initial={{
              opacity: 0,
              y: -20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: index * 0.1,
              type: "spring"
            }}>
                  {t(`nav.${section === 'what-is-it' ? 'whatIsIt' : section}`)}
                </motion.button>)}
            </nav>

            {/* Actions - Right */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="hidden sm:block">
                <LanguageToggle />
              </div>
              <Button3D variant="gradient" size="md" glow className="hidden sm:flex" onClick={() => navigate("/auth")}>
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
                    <button onClick={() => scrollToSection('what-is-it')} className="text-white hover:text-primary transition-colors text-left text-lg">
                      {t('nav.whatIsIt')}
                    </button>
                    <button onClick={() => scrollToSection('features')} className="text-white hover:text-primary transition-colors text-left text-lg">
                      {t('nav.features')}
                    </button>
                    <button onClick={() => scrollToSection('pricing')} className="text-white hover:text-primary transition-colors text-left text-lg">
                      {t('nav.pricing')}
                    </button>
                    <button onClick={() => scrollToSection('faq')} className="text-white hover:text-primary transition-colors text-left text-lg">
                      {t('nav.faq')}
                    </button>
                    <div className="pt-4 border-t border-white/10">
                      <LanguageToggle />
                    </div>
                    <Button className="btn-gradient shadow-glow font-semibold rounded-lg w-full" onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/auth");
                  }}>
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
            <motion.h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-8 leading-tight" initial={{
            opacity: 0,
            y: 30
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6
          }}>
              {t('landing.hero.title1')}{" "}
              <motion.span className="gradient-text" style={{
              transformStyle: 'preserve-3d',
              display: 'inline-block'
            }} animate={{
              rotateY: [0, 5, 0],
              rotateX: [0, 2, 0]
            }} transition={{
              duration: 4,
              repeat: Infinity
            }}>
                {t('landing.hero.title2')}
              </motion.span>
            </motion.h1>
            
            <motion.p className="text-xl text-gray-400 mb-8" initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: 0.2,
            duration: 0.6
          }}>
              {t('landing.hero.subtitle')}
            </motion.p>

            <motion.div className="space-y-4 mb-10" initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} transition={{
            delay: 0.4,
            duration: 0.6
          }}>
              {[1, 2, 3].map(num => <motion.div key={num} className="flex items-center gap-3" initial={{
              opacity: 0,
              x: -20
            }} animate={{
              opacity: 1,
              x: 0
            }} transition={{
              delay: 0.5 + num * 0.1
            }}>
                  <motion.div animate={{
                rotate: [0, 10, -10, 0]
              }} transition={{
                duration: 2,
                repeat: Infinity,
                delay: num * 0.3
              }}>
                    <Check className="w-5 h-5 text-primary" />
                  </motion.div>
                  <span className="text-gray-300">{t(`landing.hero.benefit${num}`)}</span>
                </motion.div>)}
            </motion.div>

            <motion.div className="flex flex-col sm:flex-row gap-4" initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: 0.8,
            duration: 0.6
          }}>
              <Button3D variant="gradient" size="lg" glow onClick={() => navigate("/auth")}>
                {t('landing.hero.ctaPrimary')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button3D>
              <Button3D variant="glass" size="lg" onClick={() => scrollToSection('what-is-it')}>
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
            {[{
            icon: Brain,
            key: 'smartAnalysis'
          }, {
            icon: Gauge,
            key: 'decisionAutomation'
          }].map((item, index) => <motion.div key={item.key} initial={{
            opacity: 0,
            y: 50,
            rotateX: -15
          }} animate={{
            opacity: 1,
            y: 0,
            rotateX: 0
          }} transition={{
            delay: index * 0.2,
            type: "spring",
            stiffness: 100
          }}>
                <Card3D intensity="medium" glow>
                  <motion.div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow" whileHover={{
                rotateY: 360
              }} transition={{
                duration: 0.6
              }}>
                    <item.icon className="w-8 h-8 text-primary-foreground" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-4">{t(`landing.whatIsIt.${item.key}.title`)}</h3>
                  <p className="text-gray-400 leading-relaxed">
                    {t(`landing.whatIsIt.${item.key}.description`)}
                  </p>
                </Card3D>
              </motion.div>)}
          </div>
        </div>
      </section>

      {/* Features Section - Pinned Section with GSAP */}
      <section id="features" ref={featuresRef} className="py-12 sm:py-20 px-4 sm:px-6 bg-transparent relative" aria-label="Features that make the difference">
        {/* Header - Outside pinned container */}
        <div className="container mx-auto max-w-7xl mb-8 sm:mb-12">
          <div className="mb-6 sm:mb-8 text-center">
            <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/20 border border-primary/30 rounded-full text-xs sm:text-sm text-primary font-medium">
              Features
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-white text-center px-4">
            Features that make the difference
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 sm:mb-12 text-center px-4">
            Everything you need to optimize your campaigns in one platform
          </p>
        </div>

        <div className="pinned-features-container min-h-[80vh] sm:min-h-screen flex items-center justify-center px-4 sm:px-6">
          <div className="container mx-auto max-w-7xl relative w-full">
            {/* Pinned content that changes - 2 Column Layout */}
            <div className="relative min-h-[500px] sm:min-h-[600px] w-full pt-8 sm:pt-12">
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
            }].map((feature, index) => {
              const Icon = feature.icon;
              const isEven = (index + 1) % 2 === 0; // index 0 = 1 (ímpar), index 1 = 2 (par)
              const isZoomed = zoomedImage?.featureIndex === index;

              return <div key={index} className="feature-card-4 absolute inset-0 flex items-center justify-center px-4 sm:px-6">
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 lg:gap-16 w-full items-center ${isEven ? '' : 'md:grid-flow-dense'}`}>
                      {/* Text Content - Top on mobile, Left/Right on desktop */}
                      <div className={`space-y-4 sm:space-y-6 md:space-y-8 order-1 md:order-none ${isEven ? '' : 'md:col-start-2'}`}>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/30 mx-auto md:mx-0">
                          <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
                        </div>
                        <h3 className="text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold text-white leading-tight text-center md:text-left">{t(`landing.features.${feature.key}.title`)}</h3>
                        <p className="text-lg sm:text-xl md:text-xl lg:text-2xl text-gray-300/70 leading-relaxed text-center md:text-left">{t(`landing.features.${feature.key}.description`)}</p>
                      </div>

                      {/* Images - Stacked vertically on mobile, side by side on desktop */}
                      <div className={`flex flex-col md:grid md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 order-2 md:order-none ${isEven ? '' : 'md:col-start-1 md:row-start-1'}`}>
                        <div 
                          onClick={() => setZoomedImage(isZoomed && zoomedImage.imageIndex === 1 ? null : {featureIndex: index, imageIndex: 1})}
                          className={`aspect-square rounded-2xl sm:rounded-3xl bg-[#0A0E27]/40 border border-primary/30 backdrop-blur-md flex items-center justify-center overflow-hidden shadow-lg cursor-pointer transition-all duration-300 active:scale-95 ${
                            isZoomed && zoomedImage.imageIndex === 1 ? 'fixed inset-4 z-50 scale-110 bg-[#0A0E27]/95' : 'hover:scale-105'
                          }`}
                        >
                          <span className="text-gray-300/20 text-[10px] sm:text-xs font-medium">Image 1</span>
                        </div>
                        <div 
                          onClick={() => setZoomedImage(isZoomed && zoomedImage.imageIndex === 2 ? null : {featureIndex: index, imageIndex: 2})}
                          className={`aspect-square rounded-2xl sm:rounded-3xl bg-[#0A0E27]/40 border border-primary/30 backdrop-blur-md flex items-center justify-center overflow-hidden shadow-lg cursor-pointer transition-all duration-300 active:scale-95 ${
                            isZoomed && zoomedImage.imageIndex === 2 ? 'fixed inset-4 z-50 scale-110 bg-[#0A0E27]/95' : 'hover:scale-105'
                          }`}
                        >
                          <span className="text-gray-300/20 text-[10px] sm:text-xs font-medium">Image 2</span>
                        </div>
                      </div>
                    </div>
                  </div>;
            })}
            {/* Overlay to close zoom - outside map */}
            {zoomedImage && (
              <div 
                className="fixed inset-0 bg-black/80 z-40"
                onClick={() => setZoomedImage(null)}
              />
            )}
            </div>
          </div>
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
          <motion.div className="flex items-center justify-center gap-4 mb-8" initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.2
        }}>
            <motion.button onClick={() => setBillingPeriod('monthly')} className={`px-6 py-2 rounded-lg font-semibold transition-all ${billingPeriod === 'monthly' ? 'bg-gradient-primary text-primary-foreground shadow-glow' : 'text-gray-400 hover:text-white'}`} whileHover={{
            rotateY: 5
          }} whileTap={{
            scale: 0.95
          }} style={{
            transformStyle: 'preserve-3d'
          }}>
              {t('landing.pricing.monthly')}
            </motion.button>
            <motion.button onClick={() => setBillingPeriod('annual')} className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${billingPeriod === 'annual' ? 'bg-gradient-primary text-primary-foreground shadow-glow' : 'text-gray-400 hover:text-white'}`} whileHover={{
            rotateY: 5
          }} whileTap={{
            scale: 0.95
          }} style={{
            transformStyle: 'preserve-3d'
          }}>
              {t('landing.pricing.annual')}
              <motion.span className="text-xs bg-primary/20 px-2 py-1 rounded" animate={{
              y: [0, -3, 0]
            }} transition={{
              duration: 2,
              repeat: Infinity
            }}>
                {t('landing.pricing.save3Months')}
              </motion.span>
            </motion.button>
          </motion.div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-12">
          {[{
          key: 'basic',
          popular: false
        }, {
          key: 'standard',
          popular: true
        }, {
          key: 'expert',
          popular: false
        }, {
          key: 'business',
          popular: false
        }].map((plan, index) => <motion.div key={index} initial={{
          opacity: 0,
          y: 50,
          rotateX: -15
        }} animate={{
          opacity: 1,
          y: 0,
          rotateX: 0
        }} transition={{
          delay: index * 0.15,
          type: "spring",
          stiffness: 100
        }} className={plan.popular ? "lg:scale-110 lg:z-10" : ""}>
              <Card3D intensity={plan.popular ? "high" : "medium"} glow={plan.popular} className={`p-6 relative flex flex-col h-full ${plan.popular ? "border-2 border-primary shadow-[0_0_30px_rgba(74,233,189,0.3)]" : ""}`}>
                {plan.popular && <>
                    <motion.div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-primary rounded-full text-sm font-bold text-primary-foreground z-10 shadow-glow" animate={{
                y: [0, -5, 0],
                scale: [1, 1.05, 1]
              }} transition={{
                duration: 2,
                repeat: Infinity
              }}>
                      {t('landing.pricing.popular')}
                    </motion.div>
                    <div className="absolute inset-0 bg-gradient-primary opacity-5 rounded-2xl pointer-events-none" />
                  </>}
              <h3 className={`text-xl font-bold mb-2 ${plan.popular ? 'text-primary' : ''}`}>
                {t(`landing.pricing.${plan.key}.name`)}
              </h3>
              
              {plan.key === 'business' ? <>
                  <div className="mb-4">
                    <span className="text-3xl font-bold">
                      {t(`landing.pricing.${plan.key}.price`)}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-6 min-h-[40px]">
                    {t(`landing.pricing.${plan.key}.description`)}
                  </p>
                </> : billingPeriod === 'monthly' ? <>
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
                </> : <>
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
                </>}
              
              <ul className="space-y-2 mb-6 flex-1 min-h-[200px]">
                {['feature1', 'feature2', 'feature3', 'feature4', 'feature5', 'feature6', 'feature7'].map((feat, i) => {
                const featureText = t(`landing.pricing.${plan.key}.${feat}`);
                if (featureText === `landing.pricing.${plan.key}.${feat}`) return null;
                return <li key={i} className="flex items-start gap-2">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.popular ? 'text-primary' : 'text-primary/80'}`} />
                      <span className="text-xs text-gray-300">{featureText}</span>
                    </li>;
              })}
              </ul>
              
                {plan.key === 'business' ? <Button3D variant="glass" size="md" className="w-full mt-auto" onClick={() => navigate("/contact-business")}>
                    {t(`landing.pricing.${plan.key}.contactUs`)}
                  </Button3D> : <Button3D variant={plan.popular ? 'gradient' : 'glass'} size="md" glow={plan.popular} className="w-full mt-auto" onClick={() => navigate("/auth")}>
                    {t('landing.pricing.choosePlan')}
                  </Button3D>}
              </Card3D>
            </motion.div>)}
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
                  {[{
                  key: 'dailyRoas',
                  basic: true,
                  standard: true,
                  expert: true,
                  business: true
                }, {
                  key: 'profitSheet',
                  basic: true,
                  standard: true,
                  expert: true,
                  business: true
                }, {
                  key: 'quotation',
                  basic: false,
                  standard: true,
                  expert: true,
                  business: true
                }, {
                  key: 'campaigns',
                  basic: false,
                  standard: true,
                  expert: true,
                  business: true
                }, {
                  key: 'productResearch',
                  basic: false,
                  standard: false,
                  expert: true,
                  business: true
                }, {
                  key: 'prioritySupport',
                  basic: false,
                  standard: false,
                  expert: true,
                  business: true
                }, {
                  key: 'completeHistory',
                  basic: false,
                  standard: false,
                  expert: true,
                  business: true
                }].map((feature, i) => <tr key={i} className="border-b border-white/10 last:border-0">
                      <td className="p-4 text-gray-300">{t(`landing.pricing.featureComparison.${feature.key}`)}</td>
                      <td className="p-4 text-center">
                        {feature.basic ? <Check className="w-5 h-5 text-primary mx-auto" /> : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="p-4 text-center">
                        {feature.standard ? <Check className="w-5 h-5 text-primary mx-auto" /> : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="p-4 text-center">
                        {feature.expert ? <Check className="w-5 h-5 text-primary mx-auto" /> : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="p-4 text-center">
                        {feature.business ? <Check className="w-5 h-5 text-primary mx-auto" /> : <span className="text-gray-600">—</span>}
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="container mx-auto px-4 sm:px-6 py-20 relative">
        <div className="text-center mb-16">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.6
        }}>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 gradient-text">
              {t('landing.faq.title')}
            </h2>
            <p className="text-xl text-gray-400">
              {t('landing.faq.subtitle')}
            </p>
          </motion.div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {['q1', 'q2', 'q3', 'q4', 'q5'].map((key, index) => <motion.div key={index} initial={{
            opacity: 0,
            x: -20
          }} whileInView={{
            opacity: 1,
            x: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: index * 0.1,
            duration: 0.5
          }}>
                <AccordionItem value={`item-${index}`} className="glass-card border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm transition-all duration-300 hover:border-primary/30 data-[state=open]:border-primary/50 data-[state=open]:shadow-[0_0_20px_rgba(74,233,189,0.2)]">
                  <AccordionTrigger className="text-left text-base sm:text-lg font-bold hover:no-underline py-5 sm:py-6 px-6 hover:text-primary transition-colors group">
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm group-hover:bg-primary/20 transition-colors flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="flex-1">{t(`faq.${key}.question`)}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-400 leading-relaxed px-6 pb-6">
                    <div className="pl-11 text-sm sm:text-base">
                      {t(`faq.${key}.answer`)}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>)}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 py-20 relative z-10">
        <motion.div initial={{
        opacity: 0,
        scale: 0.9,
        rotateX: -10
      }} whileInView={{
        opacity: 1,
        scale: 1,
        rotateX: 0
      }} viewport={{
        once: true
      }} transition={{
        type: "spring",
        stiffness: 100
      }} style={{
        transformStyle: 'preserve-3d'
      }}>
          <Card3D intensity="high" glow className="p-16 text-center max-w-4xl mx-auto">
            <div className="space-y-6">
              <motion.h2 className="text-4xl sm:text-5xl font-bold" animate={{
              textShadow: ["0 0 20px rgba(74, 233, 189, 0.3)", "0 0 30px rgba(74, 233, 189, 0.5)", "0 0 20px rgba(74, 233, 189, 0.3)"]
            }} transition={{
              duration: 3,
              repeat: Infinity
            }}>
                {t('landing.cta.title')}
              </motion.h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                {t('landing.cta.description')}
              </p>
              <Button3D variant="gradient" size="lg" glow onClick={() => navigate("/auth")}>
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