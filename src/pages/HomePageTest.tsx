import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import logo from "@/assets/logo.png";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const HomePageTest = () => {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const heroRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Hero section animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate hero text elements
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

        // Number counting animation with better implementation
        const numbers = dashboardRef.current.querySelectorAll(".count-up");
        numbers.forEach((num, index) => {
          const target = parseFloat(num.getAttribute("data-target") || "0");
          const isDecimal = num.getAttribute("data-format") === "decimal";
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
                if (isDecimal) {
                  num.textContent = `${prefix}${obj.value.toFixed(1)}${suffix}`;
                } else {
                  num.textContent = `${prefix}${Math.round(obj.value)}${suffix}`;
                }
              }
            },
          });
        });
      }
    }, heroRef);

    return () => ctx.revert();
  }, []);

  // Features scroll reveal animation
  useEffect(() => {
    if (!featuresRef.current) return;

    const ctx = gsap.context(() => {
      const cards = featuresRef.current?.querySelectorAll(".feature-card");
      
      cards?.forEach((card, index) => {
        gsap.from(card, {
          opacity: 0,
          x: index % 2 === 0 ? -100 : 100,
          scale: 0.9,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card as Element,
            start: "top 80%",
            end: "top 50%",
            toggleActions: "play none none reverse",
          },
        });
      });
    }, featuresRef);

    return () => ctx?.revert();
  }, []);

  // CTA gradient animation
  useEffect(() => {
    if (!ctaRef.current) return;

    const ctx = gsap.context(() => {
      const gradient = ctaRef.current?.querySelector(".animated-gradient") as HTMLElement;
      const ctaContent = ctaRef.current?.querySelector(".cta-content");

      if (gradient) {
        // Animate gradient position infinitely
        gsap.to(gradient, {
          backgroundPosition: "400% 400%",
          duration: 20,
          repeat: -1,
          ease: "linear",
        });
      }

      // Parallax effect
      if (ctaContent) {
        gsap.to(ctaContent, {
          y: -30,
          scrollTrigger: {
            trigger: ctaRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        });
      }
    }, ctaRef);

    return () => ctx?.revert();
  }, []);

  // Smart Campaign Analysis scroll reveal
  useEffect(() => {
    const analysisSection = document.querySelector("#analysis-section");
    if (!analysisSection) return;

    const ctx = gsap.context(() => {
      const leftBlock = analysisSection.querySelector(".analysis-left");
      const rightBlock = analysisSection.querySelector(".analysis-right");
      const image = analysisSection.querySelector(".analysis-image");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: analysisSection as Element,
          start: "top 70%",
          end: "top 30%",
          scrub: 1,
        },
      });

      if (leftBlock) {
        tl.from(leftBlock, {
          opacity: 0,
          x: -50,
          duration: 1,
        });
      }

      if (rightBlock) {
        tl.from(
          rightBlock,
          {
            opacity: 0,
            x: 50,
            duration: 1,
          },
          "-=0.5"
        );
      }

      if (image) {
        tl.from(
          image,
          {
            opacity: 0,
            scale: 0.8,
            duration: 1,
          },
          "-=0.8"
        );
      }
    });

    return () => ctx?.revert();
  }, []);

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
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Sheet Tools" className="h-12 w-auto" />
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <button
                onClick={() => document.getElementById("analysis")?.scrollIntoView({ behavior: "smooth" })}
                className="text-white/70 hover:text-primary transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                className="text-white/70 hover:text-primary transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" })}
                className="text-white/70 hover:text-primary transition-colors"
              >
                FAQ
              </button>
            </nav>
            <Button
              onClick={() => navigate("/auth")}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-32 pb-20 px-4 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0D1117] via-[#1C1F2B] to-[#0D1117] opacity-50" />
        <div className="container mx-auto max-w-7xl relative z-10">
          <div ref={heroRef} className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="hero-title text-5xl sm:text-6xl md:text-7xl font-bold mb-6 leading-tight">
                Automate Your{" "}
                <span className="gradient-text">Facebook Campaigns</span>
              </h1>
              <p className="hero-subtitle text-xl text-gray-400 mb-8">
                Your smart platform for automatic metrics calculation and action recommendations.
              </p>

              <div className="space-y-4 mb-10">
                <div className="hero-bullet flex items-center gap-3">
                  <Check className="w-6 h-6 text-primary flex-shrink-0" />
                  <span className="text-gray-300">Calculates metrics automatically</span>
                </div>
                <div className="hero-bullet flex items-center gap-3">
                  <Check className="w-6 h-6 text-primary flex-shrink-0" />
                  <span className="text-gray-300">CPC, ROAS, CPA, Profit Margin in real-time</span>
                </div>
                <div className="hero-bullet flex items-center gap-3">
                  <Check className="w-6 h-6 text-primary flex-shrink-0" />
                  <span className="text-gray-300">Smart recommendations: Kill, Scale, Maintain</span>
                </div>
              </div>

              <Button
                onClick={() => navigate("/auth")}
                size="lg"
                className="hero-button bg-gradient-primary text-primary-foreground hover:opacity-90 text-lg px-8 py-6"
              >
                Start Free for 10 Days
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Animated Dashboard */}
            <div ref={dashboardRef} className="relative">
              <Card className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Campaign Performance</h3>
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-2">ROAS</div>
                      <div className="text-2xl font-bold text-primary">
                        <span className="count-up" data-target="4.2" data-format="decimal" data-suffix="x">0</span>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-2">CPC</div>
                      <div className="text-2xl font-bold text-primary">
                        <span className="count-up" data-target="0.45" data-format="decimal" data-prefix="€">0</span>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-2">CPA</div>
                      <div className="text-2xl font-bold text-primary">
                        <span className="count-up" data-target="12.5" data-format="decimal" data-prefix="€">0</span>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-2">Profit</div>
                      <div className="text-2xl font-bold text-primary">
                        <span className="count-up" data-target="2340" data-prefix="€">0</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-12 h-12 text-primary opacity-50" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* What Sheet Tools does for you */}
      <section
        id="analysis-section"
        className="py-20 px-4 sm:px-6 bg-[#1C1F2B] relative"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">Smart Campaign Analysis</h2>
            <p className="text-xl text-gray-400 max-w-4xl mx-auto">
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
              <Card className="bg-white/5 border border-white/10 p-8 h-full">
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6">
                  <Brain className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Smart Analysis</h3>
                <p className="text-gray-400 leading-relaxed">
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
              <Card className="bg-white/5 border border-white/10 p-8 h-full">
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6">
                  <Gauge className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Decision Automation</h3>
                <p className="text-gray-400 leading-relaxed">
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
            <Card className="bg-white/5 border border-white/10 p-8">
              <div className="h-64 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-lg flex items-center justify-center">
                <Target className="w-24 h-24 text-primary opacity-50" />
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        ref={featuresRef}
        className="py-20 px-4 sm:px-6 bg-black relative"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <motion.h2
              className="text-4xl sm:text-5xl font-bold mb-6 gradient-text"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Features that make the difference
            </motion.h2>
            <motion.p
              className="text-xl text-gray-400"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Everything you need to optimize your campaigns in one platform.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  className="feature-card"
                  whileHover={{ scale: 1.05, y: -5 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-white/5 border border-white/10 p-6 h-full hover:border-primary/50 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="py-20 px-4 sm:px-6 bg-gradient-to-b from-[#0D1117] to-[#1B1F2A] relative"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Choose Your Perfect Plan</h2>
            <p className="text-xl text-gray-400 mb-8">
              Simple and transparent plans to automate your Facebook campaigns.
            </p>

            {/* Toggle */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  billingPeriod === "monthly"
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  billingPeriod === "annual"
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                Annual
                <span className="text-xs bg-primary/20 px-2 py-1 rounded">SAVE 3 MONTHS</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-primary rounded-full text-sm font-bold text-primary-foreground z-10">
                    Most Popular
                  </div>
                )}
                <Card
                  className={`bg-white/5 border p-8 h-full flex flex-col ${
                    plan.popular ? "border-primary/50 shadow-glow" : "border-white/10"
                  }`}
                >
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">
                      {billingPeriod === "monthly" ? plan.monthlyPrice : plan.annualPrice}
                    </span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => navigate("/auth")}
                    className={`w-full transition-all duration-300 ${
                      plan.popular
                        ? "bg-gradient-primary text-primary-foreground hover:opacity-90 hover:shadow-[0_0_30px_rgba(74,233,189,0.5)]"
                        : "bg-white/5 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(139,92,246,0.3),0_0_20px_rgba(74,233,189,0.3)]"
                    }`}
                  >
                    Choose Plan
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 bg-black relative">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white/5 border border-white/10 rounded-2xl px-6 data-[state=open]:border-primary/50"
              >
                <AccordionTrigger className="text-lg font-bold hover:no-underline py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400 leading-relaxed pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Final Section */}
      <section
        ref={ctaRef}
        className="py-20 px-4 sm:px-6 relative overflow-hidden bg-black"
      >
        <div
          className="animated-gradient absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, hsl(166 82% 60% / 0.1), hsl(280 100% 70% / 0.15), hsl(200 100% 70% / 0.1), hsl(166 82% 60% / 0.1))",
            backgroundSize: "400% 400%",
            backgroundPosition: "0% 50%",
          }}
        />
        <div className="container mx-auto max-w-4xl relative z-10">
          <motion.div
            className="cta-content text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
              Ready to automate your ROAS?
            </h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Join hundreds of companies that are already saving 10+ hours weekly and increased
              their profits by 23%.
            </p>
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 text-lg px-8 py-6 shadow-glow"
            >
              Start Now – 10 Days Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-16 bg-black">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center text-gray-400">
            <p>&copy; 2024 Sheet Tools. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePageTest;

