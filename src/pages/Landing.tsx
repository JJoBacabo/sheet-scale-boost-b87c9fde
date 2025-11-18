import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowRight,
  BarChart3,
  ShoppingCart,
  Zap,
  TrendingUp,
  Target,
  Shield,
  Sparkles,
  Brain,
  Gauge,
  Lock,
  Activity,
  Search,
  CheckCircle2,
  Check,
  Menu,
  Settings,
  Database,
} from "lucide-react";
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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Features data for the Pinned Section
const featuresData = [
  {
    icon: Activity,
    key: "integration",
    images: ["/images/features/facebook-ads-dashboard.png", "/images/features/facebook-ads-admin.png"],
  },
  {
    icon: BarChart3,
    key: "metrics",
    images: ["/images/features/metrics-1.png", "/images/features/metrics-2.png"],
  },
  {
    icon: Brain,
    key: "ai",
    images: ["/images/features/ai-1.png", "/images/features/ai-2.png"],
  },
  {
    icon: Zap,
    key: "automation",
    images: ["/images/features/automation-1.png", "/images/features/automation-2.png"],
  },
  {
    icon: TrendingUp,
    key: "profit",
    images: ["/images/features/profit-1.png", "/images/features/profit-2.png"],
  },
  {
    icon: Lock,
    key: "secure",
    images: ["/images/features/secure-1.png", "/images/features/secure-2.png"],
  },
];

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [gsapLoaded, setGsapLoaded] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{ featureIndex: number; imageIndex: number } | null>(null);

  // Refs for Features Pinned Section
  const featuresRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const gsapRef = useRef<any>(null);
  const ScrollTriggerRef = useRef<any>(null);
  const scrollTriggersRef = useRef<any[]>([]);

  // Load GSAP
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("gsap").then((gsapModule) => {
        import("gsap/ScrollTrigger").then((ScrollTriggerModule) => {
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

  // Hero section animations
  useEffect(() => {
    if (!gsapLoaded || !gsapRef.current) return;

    const gsap = gsapRef.current;
    const ctx = gsap.context(() => {
      const heroTitle = heroRef.current?.querySelector(".hero-title");
      const heroSubtitle = heroRef.current?.querySelector(".hero-subtitle");
      const heroDescription = heroRef.current?.querySelector(".hero-description");
      const heroButtons = heroRef.current?.querySelectorAll(".hero-button");

      const tl = gsap.timeline();

      if (heroTitle) {
        tl.from(heroTitle, {
          opacity: 0,
          y: 50,
          duration: 0.8,
          ease: "power3.out",
        });
      }

      if (heroSubtitle) {
        tl.from(
          heroSubtitle,
          {
            opacity: 0,
            y: 30,
            duration: 0.8,
            ease: "power3.out",
          },
          "-=0.5",
        );
      }

      if (heroDescription) {
        tl.from(
          heroDescription,
          {
            opacity: 0,
            y: 30,
            duration: 0.8,
            ease: "power3.out",
          },
          "-=0.5",
        );
      }

      if (heroButtons && heroButtons.length > 0) {
        tl.from(
          heroButtons,
          {
            opacity: 0,
            y: 20,
            duration: 0.6,
            stagger: 0.1,
            ease: "power2.out",
          },
          "-=0.4",
        );
      }

      // Dashboard animation
      if (dashboardRef.current) {
        gsap.from(dashboardRef.current, {
          opacity: 0,
          x: 100,
          scale: 0.9,
          duration: 1.2,
          delay: 0.3,
          ease: "power3.out",
        });

        // Number counting animation
        const numbers = dashboardRef.current.querySelectorAll(".count-up");
        numbers.forEach((num, index) => {
          const target = parseFloat(num.getAttribute("data-target") || "0");
          const prefix = num.getAttribute("data-prefix") || "";
          const suffix = num.getAttribute("data-suffix") || "";
          const obj = { value: 0 };

          gsap.to(obj, {
            value: target,
            duration: 2,
            delay: 1 + index * 0.1,
            ease: "power2.out",
            onUpdate: function () {
              if (num) {
                // Format numbers with commas for thousands
                const formatted = Math.round(obj.value).toLocaleString();
                num.textContent = `${prefix}${formatted}${suffix}`;
              }
            },
          });
        });
      }
    }, heroRef);

    return () => ctx.revert();
  }, [gsapLoaded]);

  // Features Sticky Stacking Section animation with 3D card stacking effect
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
        const container = featuresRef.current?.querySelector(".features-stacking-container");
        const cards = featuresRef.current?.querySelectorAll(".feature-sticky-card");
        if (!container || !cards || cards.length === 0) return;

        // Animate each card individually when it enters viewport
        cards.forEach((card, index) => {
          // Find text and image containers using specific classes
          const textSection = card.querySelector(".feature-text-content");
          const imageSection = card.querySelector(".feature-images-container");
          const imageCards = card.querySelectorAll(".feature-image-card");

          if (textSection && imageSection) {
            // Set initial state for text section
            gsap.set(textSection, {
              opacity: 0,
              y: 50,
            });

            // Set initial state for image cards
            imageCards.forEach((imageCard) => {
              gsap.set(imageCard, {
                opacity: 0,
                y: 30,
              });
            });

            // Create scroll trigger for each card entrance
            const scrollTrigger = ScrollTrigger.create({
              trigger: card as Element,
              start: "top 80%",
              end: "bottom 20%",
              toggleActions: "play none none reverse",
              onEnter: () => {
                // Animate text first
                gsap.to(textSection, {
                  opacity: 1,
                  y: 0,
                  duration: 0.9,
                  ease: "power3.out",
                });

                // Animate image cards with fade in
                imageCards.forEach((imageCard, imgIndex) => {
                  gsap.to(imageCard, {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    delay: 0.2 + imgIndex * 0.1,
                    ease: "power2.out",
                  });
                });
              },
              onLeave: () => {
                // Keep cards visible for sticky effect
              },
              onEnterBack: () => {
                // Animate when scrolling back up
                gsap.to(textSection, {
                  opacity: 1,
                  y: 0,
                  duration: 0.7,
                  ease: "power2.out",
                });
                
                imageCards.forEach((imageCard, imgIndex) => {
                  gsap.to(imageCard, {
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    delay: imgIndex * 0.1,
                    ease: "power2.out",
                  });
                });
              },
              onLeaveBack: () => {
                // Fade out when scrolling back up past the trigger
                imageCards.forEach((imageCard) => {
                  gsap.to(imageCard, {
                    opacity: 0,
                    y: 30,
                    duration: 0.4,
                    ease: "power2.in",
                  });
                });
              },
            });
            scrollTriggersRef.current.push(scrollTrigger);
          }
        });

        // ========================================
        // Feature Cards Stacking Animation
        // ========================================
        const stickyCards = gsap.utils.toArray(".feature-sticky-card") as HTMLElement[];
        
        stickyCards.forEach((card, index) => {
          const totalCards = stickyCards.length;
          
          // Set initial state
          gsap.set(card, {
            scale: 1,
            y: 0,
          });

          // Create scroll trigger for stacking effect
          const stackTrigger = ScrollTrigger.create({
            trigger: card,
            start: "top top",
            end: () => `+=${window.innerHeight * 1.2}`,
            pin: true,
            pinSpacing: false,
            scrub: 1,
            onUpdate: (self) => {
              const progress = self.progress;
              const nextCardIndex = index + 1;
              
              // Scale down and fade as next card comes
              if (nextCardIndex < totalCards) {
                gsap.to(card, {
                  scale: 1 - (progress * 0.08),
                  y: -progress * 50,
                  opacity: Math.max(0, 1 - (progress * 1.2)),
                  duration: 0.1,
                  ease: "none",
                });
              }
            },
          });
          scrollTriggersRef.current.push(stackTrigger);
        });

        // Refresh ScrollTrigger after setup
        ScrollTrigger.refresh();
      }, featuresRef);
    }, 100);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (ctx) ctx?.revert();
      scrollTriggersRef.current.forEach((trigger) => trigger?.kill());
      scrollTriggersRef.current = [];
    };
  }, [gsapLoaded]);

  // Verificar se o usuário já está autenticado ao carregar a página
  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      // Aguardar um pouco para garantir que o Supabase restaurou a sessão do localStorage
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!mounted) return;
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (session && !error) {
        navigate("/dashboard");
      }
    };
    checkSession();

    // Também escutar mudanças no estado de autenticação
    const {
      data: { subscription },
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
        behavior: "smooth",
      });
    }
    setMobileMenuOpen(false);
  };
  return (
    <div className="min-h-screen bg-[#0A0E27] text-[#F0F4F8] relative overflow-hidden">
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#050F2A]/80 backdrop-blur-md border-b border-[#7BBCFE]/20">
        <div className="container mx-auto px-4 sm:px-6 py-4 relative">
          <div className="flex items-center justify-between">
            {/* Logo - Left */}
            <motion.div
              className="flex items-center gap-3 flex-shrink-0"
              transition={{
                type: "spring",
                stiffness: 300,
              }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary blur-xl opacity-30 animate-pulse" />
                <motion.img
                  src={logo}
                  alt="Sheet Tools"
                  className="h-12 sm:h-16 w-auto relative logo-glow"
                  animate={{
                    filter: [
                      "drop-shadow(0 0 8px rgba(123, 188, 254, 0.3))",
                      "drop-shadow(0 0 16px rgba(123, 188, 254, 0.5))",
                      "drop-shadow(0 0 8px rgba(123, 188, 254, 0.3))",
                    ],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                  }}
                />
              </div>
            </motion.div>

            {/* Nav - Center (absolute positioning for true center) - Desktop Only */}
            <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-8">
              {["features", "pricing", "faq"].map((section, index) => (
                <motion.button
                  key={section}
                  onClick={() => scrollToSection(section)}
                  className="text-white hover:text-primary transition-colors whitespace-nowrap"
                  whileHover={{
                    rotateY: 5,
                    z: 10,
                    scale: 1.05,
                  }}
                  style={{
                    transformStyle: "preserve-3d",
                  }}
                  initial={{
                    opacity: 0,
                    y: -20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: index * 0.1,
                    type: "spring",
                  }}
                >
                  {t(`nav.${section}`)}
                </motion.button>
              ))}
            </nav>

            {/* Actions - Right */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="hidden sm:block">
                <LanguageToggle />
              </div>
              <Button3D variant="gradient" size="md" glow className="hidden sm:flex" onClick={() => navigate("/auth")}>
                {t("header.getStarted")}
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
                      onClick={() => scrollToSection("features")}
                      className="text-white hover:text-primary transition-colors text-left text-lg"
                    >
                      {t("nav.features")}
                    </button>
                    <button
                      onClick={() => scrollToSection("pricing")}
                      className="text-white hover:text-primary transition-colors text-left text-lg"
                    >
                      {t("nav.pricing")}
                    </button>
                    <button
                      onClick={() => scrollToSection("faq")}
                      className="text-white hover:text-primary transition-colors text-left text-lg"
                    >
                      {t("nav.faq")}
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
                      {t("header.getStarted")}
                    </Button>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-32 pb-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl relative z-10">
          <div ref={heroRef} className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Hero Content */}
            <div>
              <h1 className="hero-title text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight text-white">
                {t('landing.hero.title1')} <br />{t('landing.hero.title2')}
              </h1>
              <p className="hero-subtitle text-xl text-gray-300 mb-4 leading-relaxed">
                {t('landing.hero.subtitle')}
              </p>
              <p className="hero-description text-lg text-gray-400 mb-10 leading-relaxed">
                ✓ {t('landing.hero.benefit1')}<br />
                ✓ {t('landing.hero.benefit2')}<br />
                ✓ {t('landing.hero.benefit3')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => navigate("/auth")}
                  size="lg"
                  className="hero-button bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] text-[#0A0E27] hover:opacity-90 text-lg px-8 py-6 font-semibold shadow-lg shadow-[#7BBCFE]/30"
                >
                  Start Free for 10 Days
                </Button>
                <Button
                  onClick={() => scrollToSection("features")}
                  size="lg"
                  variant="outline"
                  className="hero-button bg-[#0A0E27]/80 border border-white/30 text-white hover:bg-white/10 hover:border-white/50 text-lg px-8 py-6 font-semibold"
                >
                  Explore Features
                </Button>
              </div>
            </div>

            {/* Right: Dashboard Card */}
            <div ref={dashboardRef} className="relative">
              <Card className="bg-[#0A0E27]/90 border border-[#7BBCFE]/20 p-6 rounded-2xl backdrop-blur-md shadow-xl">
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-white">Performance Overview</h3>

                  {/* Chart */}
                  <div className="h-48 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[
                          { name: "Mon", value: 2400 },
                          { name: "Tue", value: 3200 },
                          { name: "Wed", value: 2800 },
                          { name: "Thu", value: 3900 },
                          { name: "Fri", value: 4200 },
                          { name: "Sat", value: 4800 },
                          { name: "Sun", value: 5200 },
                        ]}
                      >
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7BBCFE" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#7BBCFE" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(123, 188, 254, 0.2)" />
                        <XAxis dataKey="name" stroke="rgba(240, 244, 248, 0.5)" style={{ fontSize: "12px" }} />
                        <YAxis stroke="rgba(240, 244, 248, 0.5)" style={{ fontSize: "12px" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0A0E27",
                            border: "1px solid rgba(123, 188, 254, 0.3)",
                            borderRadius: "8px",
                            color: "#F0F4F8",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#7BBCFE"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorSales)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-gradient-to-br from-[#7BBCFE] to-[#B8A8FE] rounded-xl p-4 border border-[#7BBCFE]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-white" />
                        <span className="text-xs text-white/90 font-medium">Stores Connected</span>
                      </div>
                      <div className="text-3xl font-bold text-white">
                        <span className="count-up" data-target="8">
                          0
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Orders Processed</div>
                        <div className="text-2xl font-bold text-white">
                          <span className="count-up" data-target="2140">
                            0
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Efficiency Boost</div>
                        <div className="text-2xl font-bold text-[#0066FF]">
                          <span className="count-up" data-target="27" data-suffix="%">
                            0
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Feature Cards - Bottom Section */}
          <div className="grid md:grid-cols-3 gap-6 mt-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="h-full"
            >
              <Card className="bg-[#0A0E27]/80 border border-[#7BBCFE]/20 p-6 rounded-2xl backdrop-blur-sm hover:border-[#7BBCFE]/40 transition-all h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] flex items-center justify-center mb-4 flex-shrink-0">
                  <Zap className="w-6 h-6 text-[#0A0E27]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{t('landing.features.automation.title')}</h3>
                <p className="text-gray-300/70 text-sm leading-relaxed flex-grow">
                  {t('landing.features.automation.description')}
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="h-full"
            >
              <Card className="bg-[#0A0E27]/80 border border-[#7BBCFE]/20 p-6 rounded-2xl backdrop-blur-sm hover:border-[#7BBCFE]/40 transition-all h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] flex items-center justify-center mb-4 flex-shrink-0">
                  <BarChart3 className="w-6 h-6 text-[#0A0E27]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{t('landing.features.metrics.title')}</h3>
                <p className="text-gray-300/70 text-sm leading-relaxed flex-grow">
                  {t('landing.features.metrics.description')}
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="h-full"
            >
              <Card className="bg-[#0A0E27]/80 border border-[#7BBCFE]/20 p-6 rounded-2xl backdrop-blur-sm hover:border-[#7BBCFE]/40 transition-all h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] flex items-center justify-center mb-4 flex-shrink-0">
                  <Shield className="w-6 h-6 text-[#0A0E27]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{t('landing.features.secure.title')}</h3>
                <p className="text-gray-300/70 text-sm leading-relaxed flex-grow">
                  {t('landing.features.secure.description')}
                </p>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>


      {/* Features Section - Sticky Stacking Scroll */}
      <section
        id="features"
        ref={featuresRef}
        className="relative bg-transparent overflow-hidden"
        aria-label="Features that make the difference"
      >
        {/* Header - Fixed outside scroll container */}
        <div className="container mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-8 sm:pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 sm:mb-8 text-center">
              <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/20 border border-primary/30 rounded-full text-xs sm:text-sm text-primary font-medium">
                Features
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-white text-center px-4">
              {t("landing.features.title")}
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 sm:mb-12 text-center px-4">
              {t("landing.features.subtitle")}
            </p>
          </div>
        </div>

        {/* Sticky Stacking Container - Height allows all cards to scroll */}
        <div
          className="features-stacking-container relative"
          style={{
            height: `${featuresData.length * 120}vh`,
          }}
        >
          {/* Each feature card - 100vh sticky */}
          {featuresData.map((feature, index) => {
            const Icon = feature.icon;
            const isEven = index % 2 === 0; // Even index = text left, image right
            const isZoomed = zoomedImage?.featureIndex === index;
            const zIndex = 10 + index; // Progressive z-index

            return (
              <div
                key={index}
                className="feature-sticky-card"
                data-feature-index={index}
                style={{
                  position: "sticky",
                  top: 0,
                  height: "100vh",
                  zIndex: zIndex,
                  willChange: "transform",
                }}
              >
                <div className="h-full flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative bg-[#0A0E27]">
                  <div className="container mx-auto max-w-7xl w-full relative z-10">
                    {/* Feature Card Box with GSAP animation */}
                    <div
                      className="feature-card-box rounded-3xl bg-[#0A0E27]/95 border border-primary/20 backdrop-blur-lg p-6 sm:p-8 md:p-10 lg:p-12 shadow-2xl"
                      data-feature-box={index}
                    >
                      <div
                        className={`grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 lg:gap-16 items-center h-full min-h-[600px] ${
                          isEven ? "" : "md:grid-flow-dense"
                        }`}
                      >
                        {/* Text Content */}
                        <div
                          className={`feature-text-content space-y-4 sm:space-y-5 md:space-y-6 order-1 md:order-none text-center md:text-left ${
                            isEven ? "" : "md:col-start-2"
                          }`}
                        >
                        <div className="inline-flex items-center justify-center md:justify-start gap-3 mb-2">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] flex items-center justify-center shadow-lg">
                            <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-[#0A0E27]" />
                          </div>
                        </div>
                        <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                          {t(`landing.features.${feature.key}.title`)}
                        </h3>
                        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300/80 leading-relaxed max-w-2xl mx-auto md:mx-0">
                          {t(`landing.features.${feature.key}.description`)}
                        </p>
                      </div>

                      {/* Images - Side by side with 3D stacking effect */}
                      <div
                          className={`feature-images-container grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 order-2 md:order-none w-full ${
                            isEven ? "" : "md:col-start-1 md:row-start-1"
                          }`}
                        >
                        <div
                          onClick={() =>
                            setZoomedImage(
                              isZoomed && zoomedImage.imageIndex === 1 ? null : { featureIndex: index, imageIndex: 1 },
                            )
                          }
                          className="feature-image-card aspect-square rounded-2xl sm:rounded-3xl bg-[#0A0E27]/60 border border-primary/30 backdrop-blur-md overflow-hidden shadow-xl cursor-pointer transition-all duration-300 active:scale-95 group hover:scale-105 hover:border-primary/50"
                        >
                          <img
                            src={feature.images[0]}
                            alt={`${t(`landing.features.${feature.key}.title`)} - Image 1`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              if (target.parentElement) {
                                target.parentElement.innerHTML =
                                  '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5"><span class="text-gray-300/40 text-xs font-medium">Image 1</span></div>';
                              }
                            }}
                          />
                        </div>
                        <div
                          onClick={() =>
                            setZoomedImage(
                              isZoomed && zoomedImage.imageIndex === 2 ? null : { featureIndex: index, imageIndex: 2 },
                            )
                          }
                          className="feature-image-card aspect-square rounded-2xl sm:rounded-3xl bg-[#0A0E27]/60 border border-primary/30 backdrop-blur-md overflow-hidden shadow-xl cursor-pointer transition-all duration-300 active:scale-95 group hover:scale-105 hover:border-primary/50"
                        >
                          <img
                            src={feature.images[1]}
                            alt={`${t(`landing.features.${feature.key}.title`)} - Image 2`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              if (target.parentElement) {
                                target.parentElement.innerHTML =
                                  '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5"><span class="text-gray-300/40 text-xs font-medium">Image 2</span></div>';
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Zoomed Image Modal */}
        {zoomedImage &&
          (() => {
            const feature = featuresData[zoomedImage.featureIndex];

            return (
              <div
                className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
                onClick={() => setZoomedImage(null)}
              >
                <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center">
                  <img
                    src={feature.images[zoomedImage.imageIndex - 1]}
                    alt={`${t(`landing.features.${feature.key}.title`)} - Zoomed`}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={() => setZoomedImage(null)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white text-xl font-bold transition-colors z-10"
                    aria-label="Close zoom"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })()}
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 sm:px-6 py-20 relative">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">{t("landing.pricing.title")}</h2>
          <p className="text-xl text-gray-400 mb-8">{t("landing.pricing.subtitle")}</p>

          {/* Billing Toggle */}
          <motion.div
            className="flex items-center justify-center gap-4 mb-8"
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.2,
            }}
          >
            <motion.button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${billingPeriod === "monthly" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-gray-400 hover:text-white"}`}
              whileHover={{
                rotateY: 5,
              }}
              whileTap={{
                scale: 0.95,
              }}
              style={{
                transformStyle: "preserve-3d",
              }}
            >
              {t("landing.pricing.monthly")}
            </motion.button>
            <motion.button
              onClick={() => setBillingPeriod("annual")}
              className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${billingPeriod === "annual" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-gray-400 hover:text-white"}`}
              whileHover={{
                rotateY: 5,
              }}
              whileTap={{
                scale: 0.95,
              }}
              style={{
                transformStyle: "preserve-3d",
              }}
            >
              {t("landing.pricing.annual")}
              <motion.span
                className="text-xs bg-primary/20 px-2 py-1 rounded"
                animate={{
                  y: [0, -3, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              >
                {t("landing.pricing.save3Months")}
              </motion.span>
            </motion.button>
          </motion.div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto mb-12">
          {[
            {
              key: "basic",
              popular: false,
              isContactPlan: false,
            },
            {
              key: "standard",
              popular: true,
              isContactPlan: false,
            },
            {
              key: "expert",
              popular: false,
              isContactPlan: false,
            },
            {
              key: "business",
              popular: false,
              isContactPlan: true,
            },
          ].map((plan, index) => (
            <motion.div
              key={index}
              initial={{
                opacity: 0,
                y: 50,
                rotateX: -15,
              }}
              animate={{
                opacity: 1,
                y: 0,
                rotateX: 0,
              }}
              transition={{
                delay: index * 0.15,
                type: "spring",
                stiffness: 100,
              }}
              className={plan.popular ? "lg:scale-105 lg:z-10 relative" : "relative"}
            >
              <Card3D
                intensity={plan.popular ? "high" : "medium"}
                glow={plan.popular}
                className={`p-8 relative flex flex-col h-full ${plan.popular ? "border-2 border-primary shadow-[0_0_30px_rgba(123,188,254,0.3)]" : ""}`}
              >
                {plan.popular && (
                  <>
                    <motion.div
                      className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-gradient-primary rounded-full text-sm font-bold text-primary-foreground z-10 shadow-glow"
                      animate={{
                        y: [0, -5, 0],
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                    >
                      {t("landing.pricing.popular")}
                    </motion.div>
                    <div className="absolute inset-0 bg-gradient-primary opacity-5 rounded-2xl pointer-events-none" />
                  </>
                )}
                <div className="flex flex-col gap-6 h-full">
                  <div>
                    <h3 className={`text-2xl font-bold mb-4 ${plan.popular ? "text-primary" : ""}`}>
                      {t(`landing.pricing.${plan.key}.name`)}
                    </h3>

                    {plan.isContactPlan ? (
                      <>
                        <div className="mb-4">
                          <span className="text-4xl font-bold">{t(`landing.pricing.${plan.key}.price`)}</span>
                        </div>
                        <p className="text-gray-400 text-sm min-h-[60px]">
                          {t(`landing.pricing.${plan.key}.description`)}
                        </p>
                      </>
                    ) : billingPeriod === "monthly" ? (
                      <>
                        <div className="mb-4">
                          <span className="text-4xl font-bold">{t(`landing.pricing.${plan.key}.price`)}</span>
                          <span className="text-lg text-gray-400">{t(`landing.pricing.${plan.key}.perMonth`)}</span>
                        </div>
                        <p className="text-gray-400 text-sm min-h-[60px]">
                          {t(`landing.pricing.${plan.key}.description`)}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="mb-2">
                          <span className="text-xl text-gray-500 line-through">
                            {t(`landing.pricing.${plan.key}.annualOriginal`)}
                          </span>
                        </div>
                        <div className="mb-4">
                          <span className="text-4xl font-bold">{t(`landing.pricing.${plan.key}.annualPrice`)}</span>
                          <span className="text-lg text-gray-400">{t(`landing.pricing.${plan.key}.perYear`)}</span>
                        </div>
                        <p className="text-primary text-sm font-semibold min-h-[60px]">
                          {t(`landing.pricing.${plan.key}.annualSavings`)}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="border-t border-border/30 pt-6 flex-1 flex flex-col">
                    <ul className="space-y-3 mb-6 flex-1">
                      {["feature1", "feature2", "feature3", "feature4", "feature5", "feature6", "feature7"].map(
                        (feat, i) => {
                          const featureText = t(`landing.pricing.${plan.key}.${feat}`);
                          if (featureText === `landing.pricing.${plan.key}.${feat}`) return null;
                          return (
                            <li key={i} className="flex items-start gap-3">
                              <Check
                                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${plan.popular ? "text-primary" : "text-primary/80"}`}
                              />
                              <span className="text-sm text-gray-300 leading-relaxed">{featureText}</span>
                            </li>
                          );
                        },
                      )}
                    </ul>

                    {plan.isContactPlan ? (
                      <Button3D
                        variant="glass"
                        size="lg"
                        className="w-full mt-auto"
                        onClick={() => navigate("/contact-business")}
                      >
                        {t(`landing.pricing.${plan.key}.contactUs`)}
                      </Button3D>
                    ) : (
                      <Button3D
                        variant={plan.popular ? "gradient" : "glass"}
                        size="lg"
                        glow={plan.popular}
                        className="w-full mt-auto"
                        onClick={() => navigate("/auth")}
                      >
                        {t("landing.pricing.choosePlan")}
                      </Button3D>
                    )}
                  </div>
                </div>
              </Card3D>
            </motion.div>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-7xl mx-auto mt-16">
          <div className="grid lg:grid-cols-[1fr,2fr] gap-12 items-start">
            {/* Left: Title Section */}
            <div className="space-y-4 text-center lg:text-left">
              <h3 className="text-5xl sm:text-6xl md:text-7xl font-bold">{t("landing.pricing.featureComparison.title")}</h3>
              <p className="text-gray-400 text-xl sm:text-2xl">{t("landing.pricing.featureComparison.note")}</p>
            </div>

            {/* Right: Table */}
            <Card className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden max-w-3xl">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-4 text-gray-400 font-semibold">
                        {t("landing.pricing.featureComparison.feature")}
                      </th>
                      <th className="text-center p-4 text-gray-400 font-semibold">{t('landing.pricing.basic.name')}</th>
                      <th className="text-center p-4 text-gray-400 font-semibold">{t('landing.pricing.standard.name')}</th>
                      <th className="text-center p-4 text-gray-400 font-semibold">{t('landing.pricing.expert.name')}</th>
                      <th className="text-center p-4 text-gray-400 font-semibold">{t('landing.pricing.business.name')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        key: "dailyRoas",
                        basic: true,
                        standard: true,
                        expert: true,
                        business: true,
                      },
                      {
                        key: "profitSheet",
                        basic: true,
                        standard: true,
                        expert: true,
                        business: true,
                      },
                      {
                        key: "quotation",
                        basic: false,
                        standard: true,
                        expert: true,
                        business: true,
                      },
                      {
                        key: "campaigns",
                        basic: false,
                        standard: true,
                        expert: true,
                        business: true,
                      },
                      {
                        key: "productResearch",
                        basic: false,
                        standard: false,
                        expert: true,
                        business: true,
                      },
                      {
                        key: "prioritySupport",
                        basic: false,
                        standard: false,
                        expert: true,
                        business: true,
                      },
                      {
                        key: "completeHistory",
                        basic: false,
                        standard: false,
                        expert: true,
                        business: true,
                      },
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
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="container mx-auto px-4 sm:px-6 py-20 relative">
        <div className="text-center mb-16">
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.6,
            }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 gradient-text">{t("landing.faq.title")}</h2>
            <p className="text-xl text-gray-400">{t("landing.faq.subtitle")}</p>
          </motion.div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {["q1", "q2", "q3", "q4", "q5"].map((key, index) => (
              <motion.div
                key={index}
                initial={{
                  opacity: 0,
                  x: -20,
                }}
                whileInView={{
                  opacity: 1,
                  x: 0,
                }}
                viewport={{
                  once: true,
                }}
                transition={{
                  delay: index * 0.1,
                  duration: 0.5,
                }}
              >
                <AccordionItem
                  value={`item-${index}`}
                  className="glass-card border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm transition-all duration-300 hover:border-primary/30 data-[state=open]:border-primary/50 data-[state=open]:shadow-[0_0_20px_rgba(123,188,254,0.2)]"
                >
                  <AccordionTrigger className="text-left text-base sm:text-lg font-bold hover:no-underline py-5 sm:py-6 px-6 hover:text-primary transition-colors group">
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm group-hover:bg-primary/20 transition-colors flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="flex-1">{t(`faq.${key}.question`)}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-400 leading-relaxed px-6 pb-6">
                    <div className="pl-11 text-sm sm:text-base">{t(`faq.${key}.answer`)}</div>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 py-20 relative z-10">
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.9,
            rotateX: -10,
          }}
          whileInView={{
            opacity: 1,
            scale: 1,
            rotateX: 0,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            type: "spring",
            stiffness: 100,
          }}
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          <Card3D intensity="high" glow className="p-16 text-center max-w-4xl mx-auto">
            <div className="space-y-6">
              <motion.h2
                className="text-4xl sm:text-5xl font-bold"
                animate={{
                  textShadow: [
                    "0 0 20px rgba(123, 188, 254, 0.3)",
                    "0 0 30px rgba(123, 188, 254, 0.5)",
                    "0 0 20px rgba(123, 188, 254, 0.3)",
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
              >
                {t("landing.cta.title")}
              </motion.h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">{t("landing.cta.description")}</p>
              <Button3D variant="gradient" size="lg" glow onClick={() => navigate("/auth")}>
                {t("landing.cta.button")}
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
              <h3 className="text-white font-bold text-lg mb-4">{t("footer.quickLinks")}</h3>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={() =>
                      window.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      })
                    }
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {t("footer.home")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("features")}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {t("footer.features")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("pricing")}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {t("footer.pricing")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("faq")}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {t("footer.faq")}
                  </button>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">{t("footer.legal")}</h3>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={() => navigate("/terms")}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {t("footer.termsOfService")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/privacy")}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {t("footer.privacyPolicy")}
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">{t("footer.contact")}</h3>
              <a href="mailto:info@sheet-tools.com" className="text-gray-400 hover:text-white transition-colors">
                info@sheet-tools.com
              </a>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8">
            <p className="text-center text-gray-400 text-sm">{t("footer.copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default Landing;
