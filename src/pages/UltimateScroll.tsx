import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles, Zap, Shield, TrendingUp, Globe, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Background3D } from "@/components/ui/Background3D";

interface SectionData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  icon: any;
  gradient: string;
  imagePosition: 'left' | 'right';
}

const sections: SectionData[] = [
  {
    id: 'power',
    title: 'Unleash Your Power',
    subtitle: 'Transform Your Business',
    description: 'Experience the future of automation with cutting-edge technology that adapts to your needs.',
    features: ['Real-time Analytics', 'AI-Powered Insights', 'Seamless Integration'],
    icon: Zap,
    gradient: 'from-[#7BBCFE] via-[#B8A8FE] to-[#0066FF]',
    imagePosition: 'left'
  },
  {
    id: 'scale',
    title: 'Scale Without Limits',
    subtitle: 'Grow Your Empire',
    description: 'Break through barriers and reach new heights with infrastructure designed for unlimited growth.',
    features: ['Global Reach', '99.9% Uptime', 'Auto Scaling'],
    icon: Rocket,
    gradient: 'from-[#0066FF] via-[#7BBCFE] to-[#B8A8FE]',
    imagePosition: 'right'
  },
  {
    id: 'secure',
    title: 'Fortress Security',
    subtitle: 'Your Data Protected',
    description: 'Enterprise-grade security that keeps your information safe while maintaining peak performance.',
    features: ['End-to-End Encryption', 'SOC 2 Certified', 'Zero Trust Architecture'],
    icon: Shield,
    gradient: 'from-[#B8A8FE] via-[#0066FF] to-[#7BBCFE]',
    imagePosition: 'left'
  },
  {
    id: 'insights',
    title: 'Deep Insights',
    subtitle: 'Data-Driven Decisions',
    description: 'Unlock the power of your data with advanced analytics and predictive intelligence.',
    features: ['Predictive Analytics', 'Custom Dashboards', 'Real-time Reports'],
    icon: TrendingUp,
    gradient: 'from-[#7BBCFE] via-[#0066FF] to-[#B8A8FE]',
    imagePosition: 'right'
  }
];

const UltimateScroll = () => {
  const [gsapLoaded, setGsapLoaded] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const featureRefs = useRef<(HTMLDivElement | null)[][]>([]);
  const gsapRef = useRef<any>(null);
  const ScrollTriggerRef = useRef<any>(null);
  const scrollTriggersRef = useRef<any[]>([]);
  const particlesRef = useRef<HTMLDivElement>(null);

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

  // Animated particles background
  useEffect(() => {
    if (!gsapLoaded || !particlesRef.current || !gsapRef.current) return;

    const gsap = gsapRef.current;
    const particles = particlesRef.current.querySelectorAll('.particle');

    particles.forEach((particle, i) => {
      gsap.to(particle, {
        y: `+=${Math.random() * 200 - 100}`,
        x: `+=${Math.random() * 200 - 100}`,
        rotation: Math.random() * 360,
        duration: 3 + Math.random() * 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: i * 0.2
      });
    });
  }, [gsapLoaded]);

  // Main scroll animations
  useEffect(() => {
    if (!gsapLoaded || !gsapRef.current || !ScrollTriggerRef.current || !containerRef.current) return;

    const gsap = gsapRef.current;
    const ScrollTrigger = ScrollTriggerRef.current;
    let ctx: any;

    const timeoutId = setTimeout(() => {
      ctx = gsap.context(() => {
        const sections = sectionRefs.current.filter(Boolean) as HTMLElement[];
        if (sections.length === 0) return;

        // Create master timeline for smooth transitions
        sections.forEach((section, index) => {
          const contentRef = contentRefs.current[index];
          const imageRef = imageRefs.current[index];
          const features = featureRefs.current[index]?.filter(Boolean) || [];

          if (!contentRef || !imageRef) return;

          // Pin each section
          const trigger = ScrollTrigger.create({
            trigger: section,
            start: "top top",
            end: "+=150%",
            pin: true,
            pinSpacing: true,
            scrub: 1,
            anticipatePin: 1,
            onUpdate: (self) => {
              const progress = self.progress;
              setCurrentSection(index);

              // Content animation
              const contentProgress = Math.min(progress * 1.5, 1);
              gsap.set(contentRef, {
                y: 50 * (1 - contentProgress),
                opacity: contentProgress,
                scale: 0.95 + (0.05 * contentProgress)
              });

              // Image animation with parallax
              const imageProgress = Math.min((progress - 0.2) * 1.3, 1);
              gsap.set(imageRef, {
                y: 80 * (1 - Math.max(0, imageProgress)),
                opacity: Math.max(0, imageProgress),
                scale: 0.9 + (0.1 * Math.max(0, imageProgress)),
                rotation: 5 * (1 - Math.max(0, imageProgress))
              });

              // Features stagger animation
              features.forEach((feature, i) => {
                const featureProgress = Math.max(0, Math.min((progress - 0.3 - (i * 0.1)) * 2, 1));
                gsap.set(feature, {
                  x: -50 * (1 - featureProgress),
                  opacity: featureProgress,
                  scale: 0.9 + (0.1 * featureProgress)
                });
              });

              // Previous sections: create staircase effect
              for (let i = 0; i < index; i++) {
                const prevSection = sectionRefs.current[i];
                const prevContent = contentRefs.current[i];
                const prevImage = imageRefs.current[i];
                
                if (prevSection && prevContent && prevImage) {
                  const stepsBehind = index - i;
                  const offset = stepsBehind * 60;
                  const scale = Math.max(0.7, 1 - (stepsBehind * 0.1));
                  const opacity = Math.max(0.3, 1 - (stepsBehind * 0.25));

                  gsap.set(prevSection, {
                    y: offset,
                    scale: scale,
                    opacity: opacity,
                    zIndex: sections.length - stepsBehind
                  });
                }
              }
            },
            onEnter: () => {
              setCurrentSection(index);
            },
            onLeave: () => {
              // Section leaves viewport
            },
            onEnterBack: () => {
              setCurrentSection(index);
            }
          });

          scrollTriggersRef.current.push(trigger);
        });

        // Floating elements animation
        const floatingElements = containerRef.current.querySelectorAll('.floating-element');
        floatingElements.forEach((el, i) => {
          gsap.to(el, {
            y: `+=${30 + Math.random() * 20}`,
            rotation: Math.random() * 10 - 5,
            duration: 2 + Math.random(),
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: i * 0.3
          });
        });

        ScrollTrigger.refresh();
      }, containerRef);

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (ctx) ctx?.revert();
        scrollTriggersRef.current.forEach(trigger => trigger?.kill());
        scrollTriggersRef.current = [];
      };
    }, 200);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (ctx) ctx?.revert();
      scrollTriggersRef.current.forEach(trigger => trigger?.kill());
      scrollTriggersRef.current = [];
    };
  }, [gsapLoaded]);

  return (
    <div 
      ref={containerRef}
      className="min-h-screen text-white overflow-x-hidden relative bg-[#0A0C14]"
    >
      {/* Animated Background */}
      <Background3D />
      
      {/* Floating Particles */}
      <div ref={particlesRef} className="fixed inset-0 pointer-events-none z-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle absolute w-2 h-2 rounded-full bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Progress Indicator */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-[#0A0C14]/50 z-50">
        <div 
          className="h-full bg-gradient-to-r from-[#7BBCFE] via-[#B8A8FE] to-[#0066FF] transition-all duration-300"
          style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
        />
      </div>

      {/* Sections */}
      {sections.map((section, index) => {
        const Icon = section.icon;
        const isImageLeft = section.imagePosition === 'left';

        return (
          <section
            key={section.id}
            ref={(el) => (sectionRefs.current[index] = el)}
            className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 py-20"
            style={{ willChange: 'transform, opacity' }}
          >
            {/* Gradient Overlay */}
            <div 
              className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-10 blur-3xl`}
              style={{ zIndex: 0 }}
            />

            {/* Content Container */}
            <div className="container mx-auto max-w-7xl relative z-10">
              <div
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center ${
                  isImageLeft ? '' : 'lg:grid-flow-dense'
                }`}
              >
                {/* Image/Visual - Left or Right */}
                <div
                  ref={(el) => (imageRefs.current[index] = el)}
                  className={`order-1 lg:order-none ${
                    isImageLeft ? '' : 'lg:col-start-2'
                  }`}
                >
                  <div className="relative">
                    {/* Glowing Background */}
                    <div 
                      className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-20 blur-3xl rounded-3xl`}
                      style={{ transform: 'scale(1.1)' }}
                    />
                    
                    {/* Main Visual Card */}
                    <div className="relative rounded-3xl overflow-hidden backdrop-blur-md bg-gradient-to-br from-[#0A0C14]/90 to-[#1a1f2e]/90 border border-[#7BBCFE]/20 p-8 shadow-2xl">
                      <div className="aspect-video bg-gradient-to-br from-[#0A0C14] via-[#1a1f2e] to-[#0A0C14] rounded-2xl flex items-center justify-center relative overflow-hidden">
                        {/* Animated Gradient */}
                        <div 
                          className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-20 animate-pulse`}
                          style={{ animationDuration: '3s' }}
                        />
                        
                        {/* Icon Container */}
                        <div className={`relative z-10 w-40 h-40 mx-auto rounded-3xl bg-gradient-to-br ${section.gradient} flex items-center justify-center shadow-2xl transform transition-transform duration-300 hover:scale-110`}>
                          <Icon className="w-20 h-20 text-white" />
                        </div>

                        {/* Floating Elements */}
                        <div className="floating-element absolute top-10 left-10 w-16 h-16 rounded-xl bg-gradient-to-br from-[#7BBCFE]/30 to-[#B8A8FE]/30 backdrop-blur-sm border border-[#7BBCFE]/20" />
                        <div className="floating-element absolute bottom-10 right-10 w-12 h-12 rounded-full bg-gradient-to-br from-[#0066FF]/30 to-[#7BBCFE]/30 backdrop-blur-sm border border-[#0066FF]/20" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Text Content - Right or Left */}
                <div
                  ref={(el) => (contentRefs.current[index] = el)}
                  className={`order-2 lg:order-none space-y-8 ${
                    isImageLeft ? '' : 'lg:col-start-1 lg:row-start-1'
                  }`}
                >
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#7BBCFE]/20 to-[#B8A8FE]/20 border border-[#7BBCFE]/30 backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 text-[#7BBCFE]" />
                    <span className="text-sm font-medium text-[#7BBCFE]">
                      {section.subtitle}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.1] tracking-tight">
                    <span className={`bg-gradient-to-r ${section.gradient} bg-clip-text text-transparent`}>
                      {section.title}
                    </span>
                  </h2>

                  {/* Description */}
                  <p className="text-xl sm:text-2xl text-gray-300/90 leading-relaxed max-w-2xl font-light">
                    {section.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-4 pt-4">
                    {section.features.map((feature, featureIndex) => (
                      <div
                        key={featureIndex}
                        ref={(el) => {
                          if (!featureRefs.current[index]) {
                            featureRefs.current[index] = [];
                          }
                          featureRefs.current[index][featureIndex] = el;
                        }}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#0A0C14]/50 to-[#1a1f2e]/50 border border-[#7BBCFE]/10 backdrop-blur-sm hover:border-[#7BBCFE]/30 transition-all duration-300"
                      >
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${section.gradient}`} />
                        <span className="text-lg text-gray-200 font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <div className="pt-4">
                    <Button
                      size="lg"
                      className={`group bg-gradient-to-r ${section.gradient} hover:opacity-90 text-white font-bold px-10 py-7 text-lg rounded-2xl shadow-2xl transition-all duration-300 hover:scale-[1.02] border-0`}
                    >
                      <span className="flex items-center">
                        Get Started
                        <ArrowRight className="ml-3 w-5 h-5 transition-transform duration-300 group-hover:translate-x-2" />
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Number Indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
              <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#0A0C14]/80 backdrop-blur-md border border-[#7BBCFE]/20">
                {sections.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i === currentSection
                        ? `bg-gradient-to-r ${section.gradient} w-8`
                        : 'bg-[#7BBCFE]/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Final CTA Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 py-20">
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <div className="space-y-8">
            <h2 className="text-6xl sm:text-7xl lg:text-8xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-[#7BBCFE] via-[#B8A8FE] to-[#0066FF] bg-clip-text text-transparent">
                Ready to Transform?
              </span>
            </h2>
            <p className="text-2xl sm:text-3xl text-gray-300/90 leading-relaxed">
              Join thousands of companies already using our platform
            </p>
            <div className="pt-8">
              <Button
                size="lg"
                className="group bg-gradient-to-r from-[#7BBCFE] via-[#B8A8FE] to-[#0066FF] hover:opacity-90 text-white font-bold px-12 py-8 text-xl rounded-2xl shadow-2xl transition-all duration-300 hover:scale-[1.05] border-0"
              >
                <span className="flex items-center">
                  Start Your Journey
                  <Rocket className="ml-4 w-6 h-6 transition-transform duration-300 group-hover:translate-x-2 group-hover:-translate-y-1" />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UltimateScroll;

