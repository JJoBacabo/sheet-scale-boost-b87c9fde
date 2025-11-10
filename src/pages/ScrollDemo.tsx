import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Brain,
  Zap,
  TrendingUp,
  Lock,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const ScrollDemo = () => {
  const [gsapLoaded, setGsapLoaded] = useState(false);
  const [lenisLoaded, setLenisLoaded] = useState(false);

  // Refs for each section
  const section1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const section4Ref = useRef<HTMLDivElement>(null);

  const gsapRef = useRef<any>(null);
  const ScrollTriggerRef = useRef<any>(null);
  const lenisRef = useRef<any>(null);

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

  // Load Lenis for smooth scroll
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Try to load Lenis from CDN or npm
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/gh/studio-freight/lenis@1.0.29/bundled/lenis.min.js";
      script.async = true;
      script.onload = () => {
        if ((window as any).Lenis) {
          const lenis = new (window as any).Lenis({
            duration: 1.2,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: "vertical",
            gestureOrientation: "vertical",
            smoothWheel: true,
            wheelMultiplier: 1,
            smoothTouch: false,
            touchMultiplier: 2,
            infinite: false,
          });

          function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
          }

          requestAnimationFrame(raf);
          lenisRef.current = lenis;
          setLenisLoaded(true);
        }
      };
      document.head.appendChild(script);

      return () => {
        if (lenisRef.current) {
          lenisRef.current.destroy();
        }
        document.head.removeChild(script);
      };
    }
  }, []);

  // Section 1: Scroll Hijacking / Smooth Scroll Sections
  useEffect(() => {
    if (!gsapLoaded || !gsapRef.current || !section1Ref.current) return;

    const gsap = gsapRef.current;
    const cards = section1Ref.current.querySelectorAll(".feature-card-1");

    cards.forEach((card, index) => {
      gsap.from(card, {
        opacity: 0,
        y: 100,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: card,
          start: "top 80%",
          end: "top 50%",
          toggleActions: "play none none reverse",
        },
        delay: index * 0.2,
      });
    });
  }, [gsapLoaded, lenisLoaded]);

  // Section 2: Scroll-Triggered Transitions
  useEffect(() => {
    if (!gsapLoaded || !gsapRef.current || !ScrollTriggerRef.current || !section2Ref.current) return;

    const gsap = gsapRef.current;
    const ScrollTrigger = ScrollTriggerRef.current;
    const cards = section2Ref.current.querySelectorAll(".feature-card-2");

    cards.forEach((card, index) => {
      gsap.from(card, {
        opacity: 0,
        y: 100,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: card,
          start: "top 80%",
          end: "top 50%",
          scrub: true,
          toggleActions: "play none none reverse",
        },
        delay: index * 0.2,
      });
    });
  }, [gsapLoaded]);

  // Section 3: Scroll Snap + GSAP Timeline
  useEffect(() => {
    if (!gsapLoaded || !gsapRef.current || !ScrollTriggerRef.current || !section3Ref.current) return;

    const gsap = gsapRef.current;
    const ScrollTrigger = ScrollTriggerRef.current;
    const cards = section3Ref.current.querySelectorAll(".feature-card-3");

    cards.forEach((card, index) => {
      gsap.from(card, {
        opacity: 0,
        scale: 0.8,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: card,
          start: "top center",
          end: "bottom center",
          toggleActions: "play none none reverse",
        },
        delay: index * 0.1,
      });
    });
  }, [gsapLoaded]);

  // Section 4: Pinned Sections
  useEffect(() => {
    if (!gsapLoaded || !gsapRef.current || !ScrollTriggerRef.current || !section4Ref.current) return;

    const gsap = gsapRef.current;
    const ScrollTrigger = ScrollTriggerRef.current;
    const container = section4Ref.current.querySelector(".pinned-container");
    const cards = section4Ref.current.querySelectorAll(".feature-card-4");

    if (!container) return;

    // Set initial state - all cards hidden except first
    gsap.set(cards, { opacity: 0, y: 50, scale: 0.9 });
    gsap.set(cards[0], { opacity: 1, y: 0, scale: 1 });

    // Pin the container
    const pinTrigger = ScrollTrigger.create({
      trigger: container,
      start: "top top",
      end: "+=400%",
      pin: true,
      pinSpacing: true,
    });

    // Create timeline for card transitions
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: "+=400%",
        scrub: 1,
      },
    });

    // Animate each card transition
    cards.forEach((card, index) => {
      if (index === 0) return; // First card is already visible

      const startProgress = index / cards.length;
      const endProgress = (index + 1) / cards.length;

      // Hide previous card
      tl.to(
        cards[index - 1],
        {
          opacity: 0,
          y: -50,
          scale: 0.9,
          duration: 0.3,
        },
        startProgress
      );

      // Show current card
      tl.to(
        card,
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.3,
        },
        startProgress
      );
    });

    return () => {
      pinTrigger?.kill();
      tl?.kill();
    };
  }, [gsapLoaded]);

  return (
    <div className="min-h-screen bg-[#0A0C14] text-white overflow-x-hidden">
      {/* Section 1: Scroll Hijacking / Smooth Scroll Sections */}
      <section
        ref={section1Ref}
        className="min-h-screen py-20 px-4 sm:px-6 relative"
        style={{
          background: "linear-gradient(135deg, rgba(123, 188, 254, 0.1) 0%, rgba(0, 102, 255, 0.1) 100%)",
        }}
      >
        <div className="container mx-auto max-w-7xl relative z-10">
          {/* Label */}
          <div className="text-center mb-4">
            <span className="inline-block px-4 py-2 bg-[#7BBCFE]/20 border border-[#7BBCFE]/30 rounded-full text-sm text-[#7BBCFE] font-medium">
              Scroll Hijacking
            </span>
          </div>

          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] bg-clip-text text-transparent">
              Features that make the difference
            </h2>
            <p className="text-xl text-[#C5C7D0]">
              Everything you need to optimize your campaigns in one platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="feature-card-1 bg-[#0A0C14]/80 border border-[#7BBCFE]/20 p-6 backdrop-blur-sm hover:border-[#7BBCFE]/50 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-[#0A0C14]" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-[#C5C7D0] text-sm leading-relaxed">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#7BBCFE]/50 to-transparent" />

      {/* Section 2: Scroll-Triggered Transitions */}
      <section
        ref={section2Ref}
        className="min-h-screen py-20 px-4 sm:px-6 relative bg-[#0A0C14]"
      >
        <div className="container mx-auto max-w-7xl relative z-10">
          {/* Label */}
          <div className="text-center mb-4">
            <span className="inline-block px-4 py-2 bg-[#B8A8FE]/20 border border-[#B8A8FE]/30 rounded-full text-sm text-[#B8A8FE] font-medium">
              Scroll Triggered
            </span>
          </div>

          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] bg-clip-text text-transparent">
              Features that make the difference
            </h2>
            <p className="text-xl text-[#C5C7D0]">
              Everything you need to optimize your campaigns in one platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="feature-card-2 bg-[#0A0C14]/80 border border-[#7BBCFE]/20 p-6 backdrop-blur-sm hover:border-[#7BBCFE]/50 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-[#0A0C14]" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-[#C5C7D0] text-sm leading-relaxed">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#7BBCFE]/50 to-transparent" />

      {/* Section 3: Scroll Snap + GSAP Timeline */}
      <section
        ref={section3Ref}
        className="relative bg-[#0A0C14] snap-y snap-mandatory"
        style={{
          scrollSnapType: "y mandatory",
        }}
      >
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="min-h-screen flex items-center justify-center px-4 sm:px-6"
              style={{
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
              }}
            >
              <div className="container mx-auto max-w-4xl text-center">
                {/* Label - only on first card */}
                {index === 0 && (
                  <div className="mb-4">
                    <span className="inline-block px-4 py-2 bg-[#0066FF]/20 border border-[#0066FF]/30 rounded-full text-sm text-[#0066FF] font-medium">
                      Scroll Snap
                    </span>
                  </div>
                )}

                {index === 0 && (
                  <>
                    <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] bg-clip-text text-transparent">
                      Features that make the difference
                    </h2>
                    <p className="text-xl text-[#C5C7D0] mb-12">
                      Everything you need to optimize your campaigns in one platform
                    </p>
                  </>
                )}

                <Card className="feature-card-3 bg-[#0A0C14]/80 border border-[#7BBCFE]/20 p-12 backdrop-blur-sm max-w-2xl mx-auto">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] flex items-center justify-center mb-6 mx-auto">
                    <Icon className="w-10 h-10 text-[#0A0C14]" />
                  </div>
                  <h3 className="text-3xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-[#C5C7D0] text-lg leading-relaxed">{feature.description}</p>
                  <div className="mt-8 text-sm text-[#C5C7D0]/50">
                    {index + 1} / {features.length}
                  </div>
                </Card>
              </div>
            </div>
          );
        })}
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#7BBCFE]/50 to-transparent" />

      {/* Section 4: Pinned Sections */}
      <section ref={section4Ref} className="relative bg-[#0A0C14]">
        <div className="pinned-container min-h-screen flex items-center justify-center px-4 sm:px-6">
          <div className="container mx-auto max-w-4xl text-center relative">
            {/* Label */}
            <div className="mb-4">
              <span className="inline-block px-4 py-2 bg-[#7BBCFE]/20 border border-[#7BBCFE]/30 rounded-full text-sm text-[#7BBCFE] font-medium">
                Pinned Section
              </span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] bg-clip-text text-transparent">
              Features that make the difference
            </h2>
            <p className="text-xl text-[#C5C7D0] mb-12">
              Everything you need to optimize your campaigns in one platform
            </p>

            {/* Pinned content that changes */}
            <div className="relative min-h-[400px]">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="feature-card-4 absolute inset-0 flex items-center justify-center"
                  >
                    <Card className="bg-[#0A0C14]/80 border border-[#7BBCFE]/20 p-12 backdrop-blur-sm max-w-2xl mx-auto">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] flex items-center justify-center mb-6 mx-auto">
                        <Icon className="w-10 h-10 text-[#0A0C14]" />
                      </div>
                      <h3 className="text-3xl font-bold mb-4">{feature.title}</h3>
                      <p className="text-[#C5C7D0] text-lg leading-relaxed">{feature.description}</p>
                      <div className="mt-8 text-sm text-[#C5C7D0]/50">
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
    </div>
  );
};

export default ScrollDemo;

