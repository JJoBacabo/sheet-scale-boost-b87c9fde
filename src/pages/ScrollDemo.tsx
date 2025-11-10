import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Brain,
  Zap,
  TrendingUp,
  Lock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Background3D } from "@/components/ui/Background3D";

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
  const scrollTriggersRef = useRef<any[]>([]);

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

  // Load Lenis for smooth scroll (Section 1 only)
  useEffect(() => {
    if (typeof window !== "undefined" && section1Ref.current) {
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
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    }
  }, []);

  // Section 1: Scroll Hijacking / Smooth Scroll Sections
  useEffect(() => {
    if (!gsapLoaded || !gsapRef.current || !section1Ref.current) return;

    const gsap = gsapRef.current;
    const ScrollTrigger = ScrollTriggerRef.current;
    const ctx = gsap.context(() => {
      const cards = section1Ref.current?.querySelectorAll(".feature-card-1");

      // Set initial state
      gsap.set(cards, { opacity: 0, y: 100 });

      cards?.forEach((card, index) => {
        const trigger = ScrollTrigger.create({
          trigger: card as Element,
          start: "top 80%",
          end: "top 50%",
          toggleActions: "play none none reverse",
          onEnter: () => {
            gsap.to(card, {
              opacity: 1,
              y: 0,
              duration: 1,
              ease: "power3.out",
              delay: index * 0.15,
            });
          },
        });
        scrollTriggersRef.current.push(trigger);
      });
    }, section1Ref);

    return () => {
      ctx.revert();
      scrollTriggersRef.current.forEach((trigger) => trigger?.kill());
      scrollTriggersRef.current = [];
    };
  }, [gsapLoaded]);

  // Section 2: Scroll-Triggered Transitions with scrub
  useEffect(() => {
    if (!gsapLoaded || !gsapRef.current || !ScrollTriggerRef.current || !section2Ref.current) return;

    const gsap = gsapRef.current;
    const ScrollTrigger = ScrollTriggerRef.current;
    const ctx = gsap.context(() => {
      const cards = section2Ref.current?.querySelectorAll(".feature-card-2");

      // Set initial state
      gsap.set(cards, { opacity: 0, y: 100 });

      cards?.forEach((card, index) => {
        const trigger = ScrollTrigger.create({
          trigger: card as Element,
          start: "top 80%",
          end: "top 20%",
          scrub: 1,
          onUpdate: (self) => {
            const progress = self.progress;
            gsap.to(card, {
              opacity: progress,
              y: 100 * (1 - progress),
              duration: 0.1,
              ease: "none",
            });
          },
        });
        scrollTriggersRef.current.push(trigger);
      });
    }, section2Ref);

    return () => {
      ctx.revert();
      scrollTriggersRef.current.forEach((trigger) => trigger?.kill());
      scrollTriggersRef.current = [];
    };
  }, [gsapLoaded]);

  // Section 3: Scroll Snap + GSAP Timeline
  useEffect(() => {
    if (!gsapLoaded || !gsapRef.current || !ScrollTriggerRef.current || !section3Ref.current) return;

    const gsap = gsapRef.current;
    const ScrollTrigger = ScrollTriggerRef.current;
    const ctx = gsap.context(() => {
      const cards = section3Ref.current?.querySelectorAll(".feature-card-3");

      // Set initial state
      gsap.set(cards, { opacity: 0, scale: 0.8 });

      cards?.forEach((card, index) => {
        const trigger = ScrollTrigger.create({
          trigger: card as Element,
          start: "top center",
          end: "bottom center",
          toggleActions: "play none none reverse",
          onEnter: () => {
            gsap.to(card, {
              opacity: 1,
              scale: 1,
              duration: 0.8,
              ease: "power2.out",
            });
          },
          onLeave: () => {
            gsap.to(card, {
              opacity: 0.3,
              scale: 0.95,
              duration: 0.3,
            });
          },
          onEnterBack: () => {
            gsap.to(card, {
              opacity: 1,
              scale: 1,
              duration: 0.8,
              ease: "power2.out",
            });
          },
        });
        scrollTriggersRef.current.push(trigger);
      });
    }, section3Ref);

    return () => {
      ctx.revert();
      scrollTriggersRef.current.forEach((trigger) => trigger?.kill());
      scrollTriggersRef.current = [];
    };
  }, [gsapLoaded]);

  // Apply scroll snap to body when component mounts (only for section 3)
  useEffect(() => {
    if (section3Ref.current) {
      document.documentElement.style.scrollSnapType = "y mandatory";
      return () => {
        document.documentElement.style.scrollSnapType = "";
      };
    }
  }, []);

  // Section 4: Pinned Sections
  useEffect(() => {
    if (!section4Ref.current || !gsapLoaded || !gsapRef.current || !ScrollTriggerRef.current) return;

    let timeoutId: NodeJS.Timeout;
    let ctx: any;

    // Wait a bit for DOM to be ready
    timeoutId = setTimeout(() => {
      const gsap = gsapRef.current;
      const ScrollTrigger = ScrollTriggerRef.current;
      if (!gsap || !ScrollTrigger || !section4Ref.current) return;

      ctx = gsap.context(() => {
        const container = section4Ref.current?.querySelector(".pinned-container");
        const cards = section4Ref.current?.querySelectorAll(".feature-card-4");

        if (!container || !cards || cards.length === 0) return;

        // Set initial state - all cards hidden except first
        gsap.set(cards, { opacity: 0, y: 50, scale: 0.9 });
        gsap.set(cards[0], { opacity: 1, y: 0, scale: 1 });

        // Pin the container
        const pinTrigger = ScrollTrigger.create({
          trigger: container as Element,
          start: "top top",
          end: "+=600%",
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
          end: "+=600%",
          scrub: 0.5,
          onUpdate: (self) => {
            const progress = self.progress;
            const totalCards = cards.length;
            
            // Calculate which card should be visible
            // Map progress (0-1) to card index (0 to totalCards-1)
            // Each card occupies 1/totalCards of the progress
            let newIndex: number;
            
            if (progress >= 1) {
              newIndex = totalCards - 1; // Last card
            } else if (progress <= 0) {
              newIndex = 0; // First card
            } else {
              // Calculate index based on progress segments
              const segmentSize = 1 / totalCards;
              newIndex = Math.min(
                Math.floor(progress / segmentSize),
                totalCards - 1
              );
            }
            
            // Update if index changed
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
                    duration: 0.4,
                    ease: "power2.out",
                  });
                } else {
                  // Hide other cards
                  gsap.to(card, {
                    opacity: 0,
                    y: index < currentVisibleIndex ? -50 : 50,
                    scale: 0.9,
                    duration: 0.4,
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
      }, section4Ref);
    }, 100);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (ctx) ctx?.revert();
      scrollTriggersRef.current.forEach((trigger) => trigger?.kill());
      scrollTriggersRef.current = [];
    };
  }, [gsapLoaded]);


  return (
    <div className="min-h-screen text-[#F0F4F8] overflow-x-hidden relative">
      {/* Background 3D */}
      <Background3D />
      {/* Section 1: Scroll Hijacking / Smooth Scroll Sections */}
      <section
        ref={section1Ref}
        className="min-h-screen py-20 px-4 sm:px-6 relative"
      >
        <div className="container mx-auto max-w-7xl relative z-10">
          {/* Label */}
          <div className="text-center mb-4">
            <span className="inline-block px-4 py-2 bg-[#00D9FF]/20 border border-[#00D9FF]/30 rounded-full text-sm text-[#00D9FF] font-medium">
              Scroll Hijacking
            </span>
          </div>

          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-[#00D9FF] to-[#A855F7] bg-clip-text text-transparent">
              Features that make the difference
            </h2>
            <p className="text-xl text-[#F0F4F8]">
              Everything you need to optimize your campaigns in one platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="feature-card-1 bg-[#0A0E27]/80 border border-[#00D9FF]/20 p-6 backdrop-blur-sm hover:border-[#00D9FF]/50 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#A855F7] flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-[#0A0E27]" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-[#F0F4F8] text-sm leading-relaxed">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#00D9FF]/50 to-transparent" />

      {/* Section 2: Scroll-Triggered Transitions */}
      <section
        ref={section2Ref}
        className="min-h-screen py-20 px-4 sm:px-6 relative"
      >
        <div className="container mx-auto max-w-7xl relative z-10">
          {/* Label */}
          <div className="text-center mb-4">
            <span className="inline-block px-4 py-2 bg-[#A855F7]/20 border border-[#A855F7]/30 rounded-full text-sm text-[#A855F7] font-medium">
              Scroll Triggered
            </span>
          </div>

          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-[#00D9FF] to-[#A855F7] bg-clip-text text-transparent">
              Features that make the difference
            </h2>
            <p className="text-xl text-[#F0F4F8]">
              Everything you need to optimize your campaigns in one platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="feature-card-2 bg-[#0A0E27]/80 border border-[#00D9FF]/20 p-6 backdrop-blur-sm hover:border-[#00D9FF]/50 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#A855F7] flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-[#0A0E27]" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-[#F0F4F8] text-sm leading-relaxed">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#00D9FF]/50 to-transparent" />

      {/* Section 3: Scroll Snap + GSAP Timeline */}
      <section
        ref={section3Ref}
        className="relative"
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
                    <span className="inline-block px-4 py-2 bg-[#00D9FF]/20 border border-[#00D9FF]/30 rounded-full text-sm text-[#00D9FF] font-medium">
                      Scroll Snap
                    </span>
                  </div>
                )}

                {index === 0 && (
                  <>
                    <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-[#00D9FF] to-[#A855F7] bg-clip-text text-transparent">
                      Features that make the difference
                    </h2>
                    <p className="text-xl text-[#F0F4F8] mb-12">
                      Everything you need to optimize your campaigns in one platform
                    </p>
                  </>
                )}

                <Card className="feature-card-3 bg-[#0A0E27]/80 border border-[#00D9FF]/20 p-12 backdrop-blur-sm max-w-2xl mx-auto">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-[#00D9FF] to-[#A855F7] flex items-center justify-center mb-6 mx-auto">
                    <Icon className="w-10 h-10 text-[#0A0E27]" />
                  </div>
                  <h3 className="text-3xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-[#F0F4F8] text-lg leading-relaxed">{feature.description}</p>
                  <div className="mt-8 text-sm text-[#F0F4F8]/50">
                    {index + 1} / {features.length}
                  </div>
                </Card>
              </div>
            </div>
          );
        })}
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#00D9FF]/50 to-transparent" />

      {/* Section 4: Pinned Sections */}
      <section ref={section4Ref} className="relative">
        <div className="pinned-container min-h-screen flex items-center justify-center px-4 sm:px-6">
          <div className="container mx-auto max-w-4xl text-center relative">
            {/* Label */}
            <div className="mb-4">
              <span className="inline-block px-4 py-2 bg-[#00D9FF]/20 border border-[#00D9FF]/30 rounded-full text-sm text-[#00D9FF] font-medium">
                Pinned Section
              </span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-[#00D9FF] to-[#A855F7] bg-clip-text text-transparent">
              Features that make the difference
            </h2>
            <p className="text-xl text-[#F0F4F8] mb-12">
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
                    <Card className="bg-[#0A0E27]/80 border border-[#00D9FF]/20 p-12 backdrop-blur-sm max-w-2xl mx-auto">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-[#00D9FF] to-[#A855F7] flex items-center justify-center mb-6 mx-auto">
                        <Icon className="w-10 h-10 text-[#0A0E27]" />
                      </div>
                      <h3 className="text-3xl font-bold mb-4">{feature.title}</h3>
                      <p className="text-[#F0F4F8] text-lg leading-relaxed">{feature.description}</p>
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
    </div>
  );
};

export default ScrollDemo;
