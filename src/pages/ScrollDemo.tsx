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

  // Refs for section
  const section4Ref = useRef<HTMLDivElement>(null);

  const gsapRef = useRef<any>(null);
  const ScrollTriggerRef = useRef<any>(null);
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


  // Section 4: Pinned Sections
  useEffect(() => {
    if (!gsapLoaded || !gsapRef.current || !ScrollTriggerRef.current || !section4Ref.current) return;

    const gsap = gsapRef.current;
    const ScrollTrigger = ScrollTriggerRef.current;
    const ctx = gsap.context(() => {
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
    }, section4Ref);

    return () => {
      ctx.revert();
      scrollTriggersRef.current.forEach((trigger) => trigger?.kill());
      scrollTriggersRef.current = [];
    };
  }, [gsapLoaded]);


  return (
    <div className="min-h-screen text-[#F0F4F8] overflow-x-hidden relative">
      {/* Background 3D */}
      <Background3D />
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
