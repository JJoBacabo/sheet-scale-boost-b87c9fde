import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Check,
  ArrowRight,
  BarChart3,
  Brain,
  Zap,
  TrendingUp,
  Lock,
  Activity,
  Sparkles,
  Gauge,
  Target,
  MessageSquare,
  Send,
  ShoppingCart,
  Users,
  Settings,
  Shield,
} from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Background3D } from "@/components/ui/Background3D";
import logo from "@/assets/logo.png";

const HomePageTest = () => {
  // Lazy load GSAP to avoid SSR issues
  const [gsapLoaded, setGsapLoaded] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("gsap").then((gsapModule) => {
        import("gsap/ScrollTrigger").then((ScrollTriggerModule) => {
          const gsap = gsapModule.default;
          const ScrollTrigger = ScrollTriggerModule.default;
          gsap.registerPlugin(ScrollTrigger);
          setGsapLoaded(true);
        });
      });
    }
  }, []);

  // Store gsap in a ref to use in other effects
  const gsapRef = useRef<any>(null);
  const ScrollTriggerRef = useRef<any>(null);

  useEffect(() => {
    if (gsapLoaded && typeof window !== "undefined") {
      import("gsap").then((gsapModule) => {
        import("gsap/ScrollTrigger").then((ScrollTriggerModule) => {
          gsapRef.current = gsapModule.default;
          ScrollTriggerRef.current = ScrollTriggerModule.default;
        });
      });
    }
  }, [gsapLoaded]);

  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const heroRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const scrollTriggersRef = useRef<any[]>([]);

  // Hero section animations
  useEffect(() => {
    if (!gsapLoaded || !gsapRef.current) return;

    const gsap = gsapRef.current;
    const ctx = gsap.context(() => {
      const heroTitle = heroRef.current?.querySelector(".hero-title");
      const heroSubtitle = heroRef.current?.querySelector(".hero-subtitle");
      const heroBullets = heroRef.current?.querySelectorAll(".hero-bullet");
      const heroButton = heroRef.current?.querySelector(".hero-button");

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
          "-=0.5"
        );
      }

      if (heroBullets && heroBullets.length > 0) {
        tl.from(
          heroBullets,
          {
            opacity: 0,
            x: -30,
            duration: 0.6,
            stagger: 0.1,
            ease: "power2.out",
          },
          "-=0.4"
        );
      }

      if (heroButton) {
        tl.from(
          heroButton,
          {
            opacity: 0,
            y: 20,
            duration: 0.6,
            ease: "power2.out",
          },
          "-=0.3"
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

  // Features Pinned Section animation (from ScrollDemo)
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
        gsap.set(cards, { opacity: 0, y: 50, scale: 0.9 });
        gsap.set(cards[0], { opacity: 1, y: 0, scale: 1 });

        // Pin the container
        const pinTrigger = ScrollTrigger.create({
          trigger: container as Element,
          start: "top top",
          end: "+=500%",
          pin: true,
          pinSpacing: true,
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
          onUpdate: (self) => {
            const progress = self.progress;
            const totalCards = cards.length;

            // Calculate which card should be visible
            const newIndex = Math.min(
              Math.floor(progress * totalCards),
              totalCards - 1
            );

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
                    ease: "power2.out",
                  });
                } else {
                  // Hide other cards
                  gsap.to(card, {
                    opacity: 0,
                    y: index < currentVisibleIndex ? -50 : 50,
                    scale: 0.9,
                    duration: 0.5,
                    ease: "power2.out",
                  });
                }
              });
            }
          },
        });

        scrollTriggersRef.current.push(scrollTrigger);

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

  // Pricing section animation with timeline
  useEffect(() => {
    if (!pricingRef.current || !gsapLoaded || !gsapRef.current || !ScrollTriggerRef.current) return;

    const gsap = gsapRef.current;
    const ScrollTrigger = ScrollTriggerRef.current;
    const ctx = gsap.context(() => {
      const comparisonTable = pricingRef.current?.querySelector(".comparison-table");
      const pricingCards = pricingRef.current?.querySelectorAll(".pricing-card");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pricingRef.current,
          start: "top 70%",
          end: "top 30%",
          toggleActions: "play none none reverse",
        },
      });

      if (comparisonTable) {
        tl.from(comparisonTable, {
          opacity: 0,
          x: -50,
          duration: 0.8,
          ease: "power3.out",
        });
      }

      pricingCards?.forEach((card, index) => {
        tl.from(
          card,
          {
            opacity: 0,
            x: 50,
            scale: 0.95,
            duration: 0.6,
            ease: "power2.out",
          },
          index === 0 ? "-=0.4" : "-=0.3"
        );
      });
    }, pricingRef);

    return () => ctx?.revert();
  }, [gsapLoaded]);

  // FAQ section animation
  useEffect(() => {
    if (!faqRef.current || !gsapLoaded || !gsapRef.current || !ScrollTriggerRef.current) return;

    const gsap = gsapRef.current;
    const ScrollTrigger = ScrollTriggerRef.current;
    const ctx = gsap.context(() => {
      const faqLeft = faqRef.current?.querySelector(".faq-left");
      const faqRight = faqRef.current?.querySelector(".faq-right");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: faqRef.current,
          start: "top 70%",
          end: "top 30%",
          toggleActions: "play none none reverse",
        },
      });

      if (faqLeft) {
        tl.from(faqLeft, {
          opacity: 0,
          x: -50,
          duration: 0.8,
          ease: "power3.out",
        });
      }

      if (faqRight) {
        tl.from(
          faqRight,
          {
            opacity: 0,
            x: 50,
            duration: 0.8,
            ease: "power3.out",
          },
          "-=0.4"
        );
      }
    }, faqRef);

    return () => ctx?.revert();
  }, [gsapLoaded]);

  // Contact section animation
  useEffect(() => {
    if (!contactRef.current || !gsapLoaded || !gsapRef.current) return;

    const gsap = gsapRef.current;
    const ctx = gsap.context(() => {
      const contactContent = contactRef.current?.querySelector(".contact-content");

      if (contactContent) {
        gsap.from(contactContent, {
          opacity: 0,
          y: 50,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: contactRef.current,
            start: "top 80%",
            end: "top 50%",
            toggleActions: "play none none reverse",
          },
        });
      }
    }, contactRef);

    return () => ctx?.revert();
  }, [gsapLoaded]);

  const scrollToContact = () => {
    contactRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Contact form submitted:", contactForm);
    // Reset form
    setContactForm({ name: "", email: "", message: "" });
  };

  const features = [
    {
      icon: Activity,
      title: "Facebook Ads Integration",
      description: "Connect directly to your campaigns for real-time analysis",
    },
    {
      icon: BarChart3,
      title: "Automatic Metrics",
      description: "ROAS, CPC, CPA, CTR, Conversion Rate calculated automatically",
    },
    {
      icon: Brain,
      title: "AI for Decisions",
      description: "Smart algorithms suggest the best actions for each campaign",
    },
    {
      icon: Zap,
      title: "Complete Automation",
      description: "Save hours of manual analysis with smart automation",
    },
    {
      icon: TrendingUp,
      title: "Profit Analysis",
      description: "Accurate calculation of COGS, Profit Margin and real ROI",
    },
    {
      icon: Lock,
      title: "Secure Data",
      description: "Secure connection via OAuth, your data always protected",
    },
  ];

  const pricingPlans = [
    {
      name: "Basic",
      monthlyPrice: "€14.99",
      annualPrice: "€149.99",
      features: [
        "1 Store",
        "15 Campaigns",
        "ROAS Sheet",
        "Basic Support",
        "Email Updates",
      ],
      popular: false,
    },
    {
      name: "Standard",
      monthlyPrice: "€34.99",
      annualPrice: "€349.99",
      features: [
        "2 Stores",
        "40 Campaigns",
        "ROAS Sheet",
        "Quotation",
        "Campaigns",
        "Priority Support",
      ],
      popular: true,
    },
    {
      name: "Expert",
      monthlyPrice: "€49.99",
      annualPrice: "€499.99",
      features: [
        "4 Stores",
        "Unlimited Campaigns",
        "ROAS Sheet",
        "Quotation",
        "Campaigns",
        "Product Research",
        "Priority Support",
        "Complete History",
      ],
      popular: false,
    },
    {
      name: "Business",
      monthlyPrice: "€99.99",
      annualPrice: "€999.99",
      features: [
        "Unlimited Stores",
        "Unlimited Campaigns",
        "ROAS Sheet",
        "Quotation",
        "Campaigns",
        "Product Research",
        "Priority Support",
        "Complete History",
        "Dedicated Account Manager",
        "Custom Integrations",
      ],
      popular: false,
    },
  ];

  const featureComparison = [
    { feature: "ROAS Sheet", basic: true, standard: true, expert: true, business: true },
    { feature: "Quotation", basic: false, standard: true, expert: true, business: true },
    { feature: "Campaigns", basic: false, standard: true, expert: true, business: true },
    { feature: "Product Research", basic: false, standard: false, expert: true, business: true },
    { feature: "Priority Support", basic: false, standard: false, expert: true, business: true },
    { feature: "Complete History", basic: false, standard: false, expert: true, business: true },
    { feature: "Dedicated Manager", basic: false, standard: false, expert: false, business: true },
    { feature: "Custom Integrations", basic: false, standard: false, expert: false, business: true },
  ];

  const faqs = [
    {
      question: "How does the free trial work?",
      answer:
        "You get 10 days free to test all features. No credit card required. Cancel anytime during the trial.",
    },
    {
      question: "Can I change my plan later?",
      answer:
        "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Absolutely. We use OAuth for secure connections and never store your passwords. All data is encrypted.",
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards and PayPal through our secure payment processor.",
    },
    {
      question: "Do you offer refunds?",
      answer:
        "Yes, we offer a 30-day money-back guarantee. If you're not satisfied, contact us for a full refund.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0E27] text-[#F0F4F8] overflow-x-hidden relative">
      {/* Background 3D */}
      <Background3D />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0E27]/90 backdrop-blur-md border-b border-[#7BBCFE]/20">
        <div className="container mx-auto px-4 sm:px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Sheet Tools" className="h-12 w-auto" />
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <button
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                className="text-[#F0F4F8] hover:text-[#7BBCFE] transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                className="text-[#F0F4F8] hover:text-[#7BBCFE] transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" })}
                className="text-[#F0F4F8] hover:text-[#7BBCFE] transition-colors"
              >
                Support
              </button>
            </nav>
            <Button
              onClick={() => navigate("/auth")}
              variant="outline"
              className="bg-transparent border border-[#F0F4F8]/30 text-[#F0F4F8] hover:bg-[#F0F4F8]/10 hover:border-[#F0F4F8]/50 font-semibold"
            >
              Sign in
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-32 pb-20 px-4 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E27] via-[#0A0E27] to-[#0A0E27] opacity-90" />
        <div className="container mx-auto max-w-7xl relative z-10">
          <div ref={heroRef} className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Hero Content */}
            <div>
              <h1 className="hero-title text-5xl sm:text-6xl md:text-7xl font-bold mb-6 leading-tight text-white">
                The eCommerce Tools You Need
              </h1>
              <p className="hero-subtitle text-xl text-[#F0F4F8]/80 mb-10 leading-relaxed">
                Powerful solutions to help you increase sales and grow your business.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => navigate("/auth")}
                  size="lg"
                  className="hero-button bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] text-[#0A0E27] hover:opacity-90 text-lg px-8 py-6 font-semibold shadow-lg shadow-[#7BBCFE]/30"
                >
                  Get Started
                </Button>
                <Button
                  onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                  size="lg"
                  variant="outline"
                  className="bg-[#0A0E27]/80 border border-[#F0F4F8]/30 text-[#F0F4F8] hover:bg-[#F0F4F8]/10 hover:border-[#F0F4F8]/50 text-lg px-8 py-6 font-semibold"
                >
                  Learn More
                </Button>
              </div>
            </div>

            {/* Right: Sales Overview Card */}
            <div ref={dashboardRef} className="relative">
              <Card className="bg-[#0A0E27]/90 border border-[#7BBCFE]/20 p-6 rounded-2xl backdrop-blur-md shadow-xl">
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-white">Sales Overview</h3>
                  
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-[#B8A8FE] to-[#B8A8FE]/80 rounded-xl p-4 border border-[#B8A8FE]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart className="w-4 h-4 text-white" />
                        <span className="text-xs text-white/80 font-medium">Orders</span>
                      </div>
                      <div className="text-3xl font-bold text-white">
                        <span className="count-up" data-target="1250">0</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-[#F0F4F8]/70 mb-1">Revenue</div>
                        <div className="text-2xl font-bold text-white">
                          <span className="count-up" data-target="34500" data-prefix="€">0</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[#F0F4F8]/70 mb-1">Customers</div>
                        <div className="text-2xl font-bold text-white">
                          <span className="count-up" data-target="1080">0</span>
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
            >
              <Card className="bg-[#0A0E27]/80 border border-[#7BBCFE]/20 p-6 rounded-2xl backdrop-blur-sm hover:border-[#7BBCFE]/40 transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#7BBCFE] to-[#7BBCFE]/80 flex items-center justify-center mb-4">
                  <Settings className="w-6 h-6 text-[#0A0E27]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Easy Integration</h3>
                <p className="text-[#F0F4F8]/70 text-sm leading-relaxed">
                  Connect your Facebook Ads account in minutes. Our seamless integration makes setup effortless and secure.
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="bg-[#0A0E27]/80 border border-[#7BBCFE]/20 p-6 rounded-2xl backdrop-blur-sm hover:border-[#7BBCFE]/40 transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#B8A8FE] to-[#B8A8FE]/80 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Advanced Analytics</h3>
                <p className="text-[#F0F4F8]/70 text-sm leading-relaxed">
                  Get real-time insights with automated metrics calculation. ROAS, CPC, CPA, and profit margins at your fingertips.
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="bg-[#0A0E27]/80 border border-[#7BBCFE]/20 p-6 rounded-2xl backdrop-blur-sm hover:border-[#7BBCFE]/40 transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#7BBCFE] to-[#7BBCFE]/80 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-[#0A0E27]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Secure & Reliable</h3>
                <p className="text-[#F0F4F8]/70 text-sm leading-relaxed">
                  Your data is protected with OAuth authentication. Enterprise-grade security ensures your campaigns stay safe.
                </p>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* What Sheet Tools does for you */}
      <section
        id="analysis-section"
        className="py-20 px-4 sm:px-6 bg-[#0A0E27] relative"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">Smart Campaign Analysis</h2>
            <p className="text-xl text-[#F0F4F8] max-w-4xl mx-auto">
              Sheet Tools revolutionizes how you manage your Facebook Ads campaigns. Our platform
              automatically analyzes your metrics and offers precise recommendations to maximize your results.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <motion.div
              className="analysis-left"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <Card className="bg-[#0A0E27]/80 border border-[#7BBCFE]/20 p-8 h-full backdrop-blur-sm">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] flex items-center justify-center mb-6">
                  <Brain className="w-8 h-8 text-[#0A0E27]" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Smart Analysis</h3>
                <p className="text-[#F0F4F8] leading-relaxed">
                  Automatic calculation of CPC, ROAS, COGS, CPA, and Profit Margin. Get real-time
                  insights into your campaign performance without manual calculations.
                </p>
              </Card>
            </motion.div>

            <motion.div
              className="analysis-right"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <Card className="bg-[#0A0E27]/80 border border-[#7BBCFE]/20 p-8 h-full backdrop-blur-sm">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] flex items-center justify-center mb-6">
                  <Gauge className="w-8 h-8 text-[#0A0E27]" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Decision Automation</h3>
                <p className="text-[#F0F4F8] leading-relaxed">
                  Get automatic recommendations: kill underperforming campaigns, scale winners, or
                  maintain steady performers. Make data-driven decisions effortlessly.
                </p>
              </Card>
            </motion.div>
          </div>

          <motion.div
            className="analysis-image"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Card className="bg-[#0A0E27]/80 border border-[#7BBCFE]/20 p-8 backdrop-blur-sm">
              <div className="h-64 bg-gradient-to-r from-[#7BBCFE]/20 via-[#B8A8FE]/20 to-[#7BBCFE]/20 rounded-lg flex items-center justify-center border border-[#7BBCFE]/20">
                <Target className="w-24 h-24 text-[#0066FF] opacity-50" />
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Pinned Section (from ScrollDemo) */}
      <section
        id="features"
        ref={featuresRef}
        className="py-20 px-4 sm:px-6 bg-[#0A0E27] relative"
      >
        <div className="pinned-features-container min-h-screen flex items-center justify-center px-4 sm:px-6">
          <div className="container mx-auto max-w-4xl text-center relative">
            {/* Header */}
            <div className="mb-4">
              <span className="inline-block px-4 py-2 bg-[#7BBCFE]/20 border border-[#7BBCFE]/30 rounded-full text-sm text-[#7BBCFE] font-medium">
                Features
              </span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] bg-clip-text text-transparent">
              Features that make the difference
            </h2>
            <p className="text-xl text-[#F0F4F8]/80 mb-12">
              Everything you need to optimize your campaigns in one platform
            </p>

            {/* Pinned content that changes */}
            <div className="relative min-h-[500px] flex items-center justify-center">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="feature-card-4 absolute inset-0 flex items-center justify-center"
                  >
                    <Card className="bg-[#0A0E27]/80 border border-[#7BBCFE]/20 p-12 backdrop-blur-sm max-w-2xl mx-auto">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] flex items-center justify-center mb-6 mx-auto">
                        <Icon className="w-10 h-10 text-[#0A0E27]" />
                      </div>
                      <h3 className="text-3xl font-bold mb-4 text-[#F0F4F8]">{feature.title}</h3>
                      <p className="text-[#F0F4F8]/70 text-lg leading-relaxed">{feature.description}</p>
                      <div className="mt-8 text-sm text-[#F0F4F8]/50">
                        {index + 1} / {features.length}
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing + Feature Comparison Section - 2 Columns */}
      <section
        id="pricing"
        ref={pricingRef}
        className="py-20 px-4 sm:px-6 bg-[#0A0E27] relative"
      >
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Choose Your Perfect Plan</h2>
            <p className="text-xl text-[#F0F4F8] mb-8">
              Simple and transparent plans to automate your Facebook campaigns.
            </p>

            {/* Toggle */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  billingPeriod === "monthly"
                    ? "bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] text-[#0A0E27] shadow-lg shadow-[#7BBCFE]/30"
                    : "bg-[#0A0E27]/80 border border-[#7BBCFE]/20 text-[#F0F4F8] hover:text-white hover:border-[#7BBCFE]/40"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  billingPeriod === "annual"
                    ? "bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] text-[#0A0E27] shadow-lg shadow-[#7BBCFE]/30"
                    : "bg-[#0A0E27]/80 border border-[#7BBCFE]/20 text-[#F0F4F8] hover:text-white hover:border-[#7BBCFE]/40"
                }`}
              >
                Annual
                <span className="text-xs bg-[#7BBCFE]/20 px-2 py-1 rounded text-[#7BBCFE]">SAVE 3 MONTHS</span>
              </button>
            </div>
          </div>

          {/* 2 Column Layout: Comparison Table Left, Pricing Cards Right */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Feature Comparison Table */}
            <div className="comparison-table">
              <Card className="bg-[#0A0E27]/80 border border-[#7BBCFE]/20 p-6 backdrop-blur-sm">
                <h3 className="text-2xl font-bold mb-6">Feature Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#7BBCFE]/25">
                        <th className="text-left p-4 text-[#F0F4F8] font-semibold">Feature</th>
                        <th className="text-center p-4 text-[#F0F4F8] font-semibold">Basic</th>
                        <th className="text-center p-4 text-[#F0F4F8] font-semibold">Standard</th>
                        <th className="text-center p-4 text-[#F0F4F8] font-semibold">Expert</th>
                        <th className="text-center p-4 text-[#F0F4F8] font-semibold">Business</th>
                      </tr>
                    </thead>
                    <tbody>
                      {featureComparison.map((item, i) => (
                        <tr key={i} className="border-b border-[#7BBCFE]/10 last:border-0">
                          <td className="p-4 text-[#F0F4F8]">{item.feature}</td>
                          <td className="p-4 text-center">
                            {item.basic ? (
                              <Check className="w-5 h-5 text-[#7BBCFE] mx-auto" />
                            ) : (
                              <span className="text-[#F0F4F8]/30">—</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {item.standard ? (
                              <Check className="w-5 h-5 text-[#7BBCFE] mx-auto" />
                            ) : (
                              <span className="text-[#F0F4F8]/30">—</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {item.expert ? (
                              <Check className="w-5 h-5 text-[#7BBCFE] mx-auto" />
                            ) : (
                              <span className="text-[#F0F4F8]/30">—</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {item.business ? (
                              <Check className="w-5 h-5 text-[#7BBCFE] mx-auto" />
                            ) : (
                              <span className="text-[#F0F4F8]/30">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Right: Pricing Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6">
              {pricingPlans.map((plan, index) => (
                <motion.div
                  key={index}
                  className="pricing-card"
                  whileHover={{ scale: 1.02, y: -5 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    className={`bg-[#0A0E27]/80 border p-6 h-full flex flex-col backdrop-blur-sm transition-all duration-300 ${
                      plan.popular
                        ? "border-[#7BBCFE]/50 shadow-lg shadow-[#7BBCFE]/20 scale-105"
                        : "border-[#7BBCFE]/20 hover:border-[#7BBCFE]/40"
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] rounded-full text-sm font-bold text-[#0A0E27] z-10">
                        Most Popular
                      </div>
                    )}
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-3xl font-bold">
                        {billingPeriod === "monthly" ? plan.monthlyPrice : plan.annualPrice}
                      </span>
                      <span className="text-[#F0F4F8]">/month</span>
                    </div>
                    <ul className="space-y-2 mb-6 flex-1 text-sm">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-[#7BBCFE] flex-shrink-0 mt-0.5" />
                          <span className="text-[#F0F4F8]">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => navigate("/auth")}
                      className={`w-full transition-all duration-300 ${
                        plan.popular
                          ? "bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] text-[#0A0E27] hover:opacity-90 hover:shadow-lg hover:shadow-[#7BBCFE]/30"
                          : "bg-[#0A0E27]/80 border border-[#7BBCFE]/20 hover:bg-[#7BBCFE]/10 hover:border-[#7BBCFE]/40 text-[#7BBCFE]"
                      }`}
                    >
                      Choose Plan
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ + Contact Section - 2 Columns */}
      <section id="faq" ref={faqRef} className="py-20 px-4 sm:px-6 bg-[#0A0E27] relative">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Left: FAQ Info + Contact Button */}
            <div className="faq-left">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-xl text-[#F0F4F8] mb-4">Clear your doubts about Sheet.Tools</p>
              <p className="text-[#F0F4F8] mb-8 leading-relaxed">
                Find answers to common questions about our platform, pricing, and features. If you
                can't find what you're looking for, don't hesitate to contact us.
              </p>
              <Button
                onClick={scrollToContact}
                size="lg"
                className="bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] text-[#0A0E27] hover:opacity-90 text-lg px-8 py-6 font-semibold shadow-lg shadow-[#7BBCFE]/30 w-full sm:w-auto"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Contact Us
              </Button>
            </div>

            {/* Right: FAQ Accordions */}
            <div className="faq-right">
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="bg-[#0A0E27]/80 border border-[#7BBCFE]/20 rounded-2xl px-6 data-[state=open]:border-[#7BBCFE]/50 backdrop-blur-sm"
                  >
                    <AccordionTrigger className="text-lg font-bold hover:no-underline py-6 text-left">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] flex items-center justify-center text-[#0A0E27] font-bold text-sm flex-shrink-0">
                          {index + 1}
                        </span>
                        {faq.question}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-[#F0F4F8] leading-relaxed pb-6 pl-11">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section
        ref={contactRef}
        className="py-20 px-4 sm:px-6 relative overflow-hidden"
      >
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#0066FF] via-[#7BBCFE] to-[#B8A8FE] opacity-20"
          style={{
            backgroundSize: "400% 400%",
            animation: "gradientShift 15s ease infinite",
          }}
        />
        <style>{`
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `}</style>
        <div className="container mx-auto max-w-4xl relative z-10">
          <motion.div
            className="contact-content text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">Let's Talk</h2>
            <p className="text-xl text-[#F0F4F8] mb-10 max-w-2xl mx-auto">
              Have a question or want to learn more? Send us a message and we'll get back to you
              within 24 hours.
            </p>

            <Card className="bg-[#0A0E27]/80 border border-[#7BBCFE]/20 p-8 backdrop-blur-sm">
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#F0F4F8] mb-2">
                    Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="bg-[#0A0E27]/50 border-[#7BBCFE]/20 text-white placeholder:text-[#F0F4F8]/50 focus:border-[#7BBCFE] focus:ring-[#7BBCFE]"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#F0F4F8] mb-2">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="bg-[#0A0E27]/50 border-[#7BBCFE]/20 text-white placeholder:text-[#F0F4F8]/50 focus:border-[#7BBCFE] focus:ring-[#7BBCFE]"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-[#F0F4F8] mb-2">
                    Message
                  </label>
                  <Textarea
                    id="message"
                    placeholder="Tell us about your needs..."
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="bg-[#0A0E27]/50 border-[#7BBCFE]/20 text-white placeholder:text-[#F0F4F8]/50 focus:border-[#7BBCFE] focus:ring-[#7BBCFE] min-h-[120px]"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] text-[#0A0E27] hover:opacity-90 text-lg px-8 py-6 font-semibold shadow-lg shadow-[#7BBCFE]/30 w-full"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Send Message
                </Button>
                <p className="text-sm text-[#F0F4F8]/70 mt-4">
                  We'll get back to you within 24 hours.
                </p>
              </form>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#7BBCFE]/20 py-16 bg-[#0A0E27]">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <div className="text-center text-[#F0F4F8]">
            <p>&copy; 2024 Sheet Tools. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePageTest;
