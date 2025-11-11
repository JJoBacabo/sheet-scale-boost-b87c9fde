import { useEffect, useRef, useState } from "react";
import { Zap, Shield, TrendingUp, Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Background3D } from "@/components/ui/Background3D";

interface FeatureData {
  id: string;
  title: string;
  description: string;
  icon: any;
  gradient: string;
}

const features: FeatureData[] = [
  {
    id: 'power',
    title: 'Unleash Your Power',
    description: 'Transform your business with cutting-edge automation technology.',
    icon: Zap,
    gradient: 'from-[#7BBCFE] to-[#B8A8FE]'
  },
  {
    id: 'secure',
    title: 'Fortress Security',
    description: 'Enterprise-grade security that keeps your data protected.',
    icon: Shield,
    gradient: 'from-[#0066FF] to-[#7BBCFE]'
  },
  {
    id: 'insights',
    title: 'Deep Insights',
    description: 'Unlock the power of your data with advanced analytics.',
    icon: TrendingUp,
    gradient: 'from-[#B8A8FE] to-[#0066FF]'
  },
  {
    id: 'scale',
    title: 'Scale Without Limits',
    description: 'Break through barriers and reach new heights.',
    icon: Rocket,
    gradient: 'from-[#7BBCFE] to-[#0066FF]'
  }
];

const SimpleScroll = () => {
  const [gsapLoaded, setGsapLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pinnedSectionRef = useRef<HTMLDivElement>(null);
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const gsapRef = useRef<any>(null);
  const ScrollTriggerRef = useRef<any>(null);
  const scrollTriggerInstance = useRef<any>(null);

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

  // Simple scroll animation - content changes within fixed section
  useEffect(() => {
    if (!gsapLoaded || !gsapRef.current || !ScrollTriggerRef.current || !containerRef.current || !pinnedSectionRef.current) return;

    const gsap = gsapRef.current;
    const ScrollTrigger = ScrollTriggerRef.current;
    let ctx: any;
    let timeoutId: NodeJS.Timeout;

    timeoutId = setTimeout(() => {
      ctx = gsap.context(() => {
        const featuresArray = featureRefs.current.filter(Boolean) as HTMLElement[];
        if (featuresArray.length === 0) return;

        // Create quick setters for performance
        const featureSetters = featuresArray.map((feature) => ({
          opacity: gsap.quickSetter(feature, "opacity"),
          scale: gsap.quickSetter(feature, "scale"),
          y: gsap.quickSetter(feature, "y", "px"),
        }));

        // Set initial state - first feature visible
        featuresArray.forEach((feature, i) => {
          if (i === 0) {
            featureSetters[i].opacity(1);
            featureSetters[i].scale(1);
            featureSetters[i].y(0);
            (feature as HTMLElement).style.pointerEvents = 'auto';
            (feature as HTMLElement).style.zIndex = '10';
          } else {
            featureSetters[i].opacity(0);
            featureSetters[i].scale(0.95);
            featureSetters[i].y(30);
            (feature as HTMLElement).style.pointerEvents = 'none';
            (feature as HTMLElement).style.zIndex = `${10 - i}`;
          }
        });

        // Create single ScrollTrigger for pinned section
        // Limited scroll duration - controlled, not infinite
        const scrollDuration = features.length * 80; // 320% for 4 features (shorter, more controlled)
        
        scrollTriggerInstance.current = ScrollTrigger.create({
          trigger: containerRef.current,
          start: "top top",
          end: `+=${scrollDuration}%`,
          scrub: 1,
          pin: pinnedSectionRef.current,
          pinSpacing: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            const progress = self.progress; // 0 to 1
            const totalFeatures = features.length;
            
            // Calculate which feature should be active
            const segmentSize = 1 / totalFeatures;
            let newActiveIndex = Math.floor(progress / segmentSize);
            
            // Ensure we don't go beyond last feature
            if (progress >= 1) {
              newActiveIndex = totalFeatures - 1;
            }
            newActiveIndex = Math.min(newActiveIndex, totalFeatures - 1);
            
            // Update active index state
            if (newActiveIndex !== activeIndex) {
              setActiveIndex(newActiveIndex);
            }
            
            // Calculate progress within current segment
            const segmentProgress = segmentSize > 0 
              ? (progress % segmentSize) / segmentSize 
              : 0;
            
            // Animate features based on scroll
            featuresArray.forEach((feature, i) => {
              const setter = featureSetters[i];
              const featureElement = feature as HTMLElement;
              
              if (i === newActiveIndex) {
                // Active feature: fade in and scale up smoothly
                const fadeProgress = Math.min(segmentProgress * 1.3, 1);
                setter.opacity(fadeProgress);
                setter.scale(0.95 + (0.05 * fadeProgress));
                setter.y(30 * (1 - fadeProgress));
                featureElement.style.pointerEvents = fadeProgress > 0.5 ? 'auto' : 'none';
                featureElement.style.zIndex = '20';
              } else if (i < newActiveIndex) {
                // Previous features: fade out completely
                setter.opacity(0);
                setter.scale(0.9);
                setter.y(0);
                featureElement.style.pointerEvents = 'none';
                featureElement.style.zIndex = `${10 - i}`;
              } else {
                // Future features: stay hidden
                setter.opacity(0);
                setter.scale(0.95);
                setter.y(30);
                featureElement.style.pointerEvents = 'none';
                featureElement.style.zIndex = `${10 - i}`;
              }
            });
          }
        });

        ScrollTrigger.refresh();
      }, containerRef);

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (ctx) ctx?.revert();
        if (scrollTriggerInstance.current) {
          scrollTriggerInstance.current.kill();
        }
      };
    }, 200);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (ctx) ctx?.revert();
      if (scrollTriggerInstance.current) {
        scrollTriggerInstance.current.kill();
      }
    };
  }, [gsapLoaded]);

  return (
    <div className="min-h-screen text-white bg-[#0A0C14]">
      {/* Background */}
      <Background3D />

      {/* Static Header Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 py-20">
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-[#7BBCFE] via-[#B8A8FE] to-[#0066FF] bg-clip-text text-transparent">
              Powerful Features
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300/90 mb-8 leading-relaxed">
            Scroll down to discover what makes us different
          </p>
        </div>
      </section>

      {/* Pinned Interactive Section - Content changes here */}
      <div ref={containerRef} className="relative">
        <section
          ref={pinnedSectionRef}
          className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 py-20"
        >
          <div className="container mx-auto max-w-6xl relative z-10">
            {/* Features Container - All features overlap, only one visible at a time */}
            <div className="relative min-h-[600px] flex items-center justify-center">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.id}
                    ref={(el) => (featureRefs.current[index] = el)}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full max-w-6xl">
                      {/* Left: Icon */}
                      <div className="flex items-center justify-center">
                        <div
                          className={`w-32 h-32 rounded-3xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-2xl`}
                        >
                          <Icon className="w-16 h-16 text-white" />
                        </div>
                      </div>

                      {/* Right: Content */}
                      <div className="space-y-6">
                        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                          <span className={`bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                            {feature.title}
                          </span>
                        </h2>
                        <p className="text-xl sm:text-2xl text-gray-300/90 leading-relaxed">
                          {feature.description}
                        </p>
                        <div className="pt-4">
                          <Button
                            size="lg"
                            className={`bg-gradient-to-r ${feature.gradient} hover:opacity-90 text-white font-bold px-8 py-6 text-lg rounded-xl shadow-xl transition-all duration-300`}
                          >
                            Learn More
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress Indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
              <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-[#0A0C14]/80 backdrop-blur-md border border-[#7BBCFE]/20">
                {features.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-500 ${
                      i === activeIndex
                        ? 'bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] w-8'
                        : 'bg-[#7BBCFE]/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Spacer - Limited height, not infinite */}
        <div style={{ height: `${features.length * 100}vh` }} />
      </div>

      {/* Static Footer Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 py-20">
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-[#7BBCFE] via-[#B8A8FE] to-[#0066FF] bg-clip-text text-transparent">
              Ready to Get Started?
            </span>
          </h2>
          <p className="text-xl sm:text-2xl text-gray-300/90 mb-10 leading-relaxed">
            Join thousands of companies already using our platform
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-[#7BBCFE] via-[#B8A8FE] to-[#0066FF] hover:opacity-90 text-white font-bold px-12 py-8 text-xl rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <span className="flex items-center">
              Get Started Now
              <ArrowRight className="ml-4 w-6 h-6" />
            </span>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default SimpleScroll;

