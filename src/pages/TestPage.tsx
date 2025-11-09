import { motion } from "framer-motion";
import { Card3D } from "@/components/ui/Card3D";
import { Button3D } from "@/components/ui/Button3D";
import { Background3D } from "@/components/ui/Background3D";
import { PageLayout } from "@/components/PageLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Sparkles, 
  Zap, 
  TrendingUp, 
  Target, 
  Rocket,
  Star,
  Gem,
  Crown,
  Infinity,
  Layers,
  Globe
} from "lucide-react";

const TestPage = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Sparkles,
      title: "Design Futurista",
      description: "Interface moderna com elementos 3D e animações suaves",
      color: "from-primary/20 to-primary-glow/20",
      iconColor: "text-primary"
    },
    {
      icon: Zap,
      title: "Performance",
      description: "Otimizado para velocidade e experiência fluida",
      color: "from-yellow-500/20 to-orange-500/20",
      iconColor: "text-yellow-500"
    },
    {
      icon: TrendingUp,
      title: "Crescimento",
      description: "Escalável e preparado para o futuro",
      color: "from-emerald-500/20 to-teal-500/20",
      iconColor: "text-emerald-500"
    },
    {
      icon: Target,
      title: "Precisão",
      description: "Foco em detalhes e excelência",
      color: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-500"
    },
    {
      icon: Rocket,
      title: "Inovação",
      description: "Tecnologia de ponta e soluções avançadas",
      color: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-500"
    },
    {
      icon: Infinity,
      title: "Ilimitado",
      description: "Possibilidades infinitas de personalização",
      color: "from-indigo-500/20 to-violet-500/20",
      iconColor: "text-indigo-500"
    }
  ];

  const stats = [
    { label: "Performance", value: "99.9%", icon: Star },
    { label: "Satisfação", value: "100%", icon: Gem },
    { label: "Qualidade", value: "Premium", icon: Crown },
    { label: "Cobertura", value: "Global", icon: Globe }
  ];

  return (
    <PageLayout
      title="Design Test Page"
      subtitle="Uma experiência visual futurista e elegante"
    >
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative mb-16"
      >
        <Card3D intensity="high" glow className="p-12 text-center relative overflow-hidden">
          {/* Animated background gradient */}
          <motion.div
            className="absolute inset-0 opacity-20"
            animate={{
              background: [
                "radial-gradient(circle at 20% 50%, rgba(74, 233, 189, 0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 50%, rgba(74, 233, 189, 0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 50% 20%, rgba(74, 233, 189, 0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 20% 50%, rgba(74, 233, 189, 0.3) 0%, transparent 50%)"
              ]
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-block mb-6"
            >
              <div className="w-24 h-24 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow mx-auto">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <Layers className="w-12 h-12 text-primary-foreground" />
                </motion.div>
              </div>
            </motion.div>

            <motion.h1
              className="text-5xl md:text-7xl font-bold mb-6 gradient-text"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Design de Outro Mundo
            </motion.h1>

            <motion.p
              className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Uma experiência visual única que combina elegância, modernidade e tecnologia de ponta
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button3D variant="gradient" size="lg" glow>
                <Rocket className="w-5 h-5 mr-2" />
                Explorar Agora
              </Button3D>
              <Button3D variant="glass" size="lg">
                <Sparkles className="w-5 h-5 mr-2" />
                Saber Mais
              </Button3D>
            </motion.div>
          </div>
        </Card3D>
      </motion.section>

      {/* Stats Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mb-16"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + index * 0.1 }}
              >
                <Card3D intensity="medium" glow className="p-6 text-center">
                  <motion.div
                    className="inline-block mb-4"
                    whileHover={{ rotateY: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Icon className="w-8 h-8 text-primary mx-auto" />
                  </motion.div>
                  <motion.h3
                    className="text-2xl font-bold gradient-text mb-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8 + index * 0.1, type: "spring" }}
                  >
                    {stat.value}
                  </motion.h3>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </Card3D>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Features Grid */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mb-16"
      >
        <motion.h2
          className="text-4xl font-bold text-center mb-12 gradient-text"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          Recursos Excepcionais
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50, rotateX: -15 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ 
                  delay: 1 + index * 0.1, 
                  type: "spring", 
                  stiffness: 100 
                }}
              >
                <Card3D intensity="medium" glow className="p-8 h-full">
                  <motion.div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-glow`}
                    whileHover={{ 
                      rotateY: 360, 
                      scale: 1.1,
                      boxShadow: "0 20px 40px rgba(74, 233, 189, 0.4)"
                    }}
                    transition={{ duration: 0.6 }}
                  >
                    <Icon className={`w-8 h-8 ${feature.iconColor}`} />
                  </motion.div>
                  
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Animated accent line */}
                  <motion.div
                    className="mt-4 h-1 bg-gradient-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ delay: 1.2 + index * 0.1, duration: 0.5 }}
                  />
                </Card3D>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Showcase Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mb-16"
      >
        <Card3D intensity="high" glow className="p-12 relative overflow-hidden">
          {/* Floating particles effect */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary/30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.3, 1, 0.3],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}

          <div className="relative z-10 text-center">
            <motion.h2
              className="text-4xl md:text-5xl font-bold mb-6 gradient-text"
              animate={{
                textShadow: [
                  "0 0 20px rgba(74, 233, 189, 0.3)",
                  "0 0 30px rgba(74, 233, 189, 0.5)",
                  "0 0 20px rgba(74, 233, 189, 0.3)"
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Experiência Visual Única
            </motion.h2>

            <motion.p
              className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 }}
            >
              Cada elemento foi cuidadosamente projetado para criar uma experiência
              imersiva e memorável. Design que inspira e tecnologia que impressiona.
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-6 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.7 }}
            >
              {[
                { icon: Star, label: "Premium", value: "Design" },
                { icon: Gem, label: "Elegante", value: "Interface" },
                { icon: Crown, label: "Exclusivo", value: "Experiência" }
              ].map((item, index) => {
                const ItemIcon = item.icon;
                return (
                  <motion.div
                    key={item.label}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ 
                      delay: 1.8 + index * 0.1,
                      type: "spring",
                      stiffness: 200
                    }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-gradient-primary/20 flex items-center justify-center mb-3 mx-auto shadow-glow">
                      <ItemIcon className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="text-lg font-bold">{item.value}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </Card3D>
      </motion.section>

      {/* Interactive Elements Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="mb-16"
      >
        <div className="grid md:grid-cols-2 gap-6">
          <Card3D intensity="medium" glow className="p-8">
            <motion.div
              className="flex items-center gap-4 mb-6"
              whileHover={{ x: 10 }}
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Zap className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Interatividade</h3>
                <p className="text-muted-foreground">Elementos que respondem ao movimento</p>
              </div>
            </motion.div>
            
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.1 }}
            >
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="h-3 bg-gradient-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 2.2 + i * 0.1, duration: 0.5 }}
                />
              ))}
            </motion.div>
          </Card3D>

          <Card3D intensity="medium" glow className="p-8">
            <motion.div
              className="flex items-center gap-4 mb-6"
              whileHover={{ x: 10 }}
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Animações</h3>
                <p className="text-muted-foreground">Transições suaves e elegantes</p>
              </div>
            </motion.div>

            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <motion.div
                  key={i}
                  className="aspect-square rounded-xl bg-gradient-primary/20 flex items-center justify-center"
                  whileHover={{ 
                    scale: 1.1,
                    rotate: 360,
                    boxShadow: "0 10px 30px rgba(74, 233, 189, 0.4)"
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <Star className="w-6 h-6 text-primary" />
                </motion.div>
              ))}
            </div>
          </Card3D>
        </div>
      </motion.section>

      {/* Final CTA */}
      <motion.section
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2.3, type: "spring" }}
      >
        <Card3D intensity="high" glow className="p-16 text-center relative overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-primary opacity-10"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />

          <div className="relative z-10">
            <motion.h2
              className="text-4xl md:text-6xl font-bold mb-6 gradient-text"
              animate={{
                filter: [
                  "drop-shadow(0 0 20px rgba(74, 233, 189, 0.3))",
                  "drop-shadow(0 0 40px rgba(74, 233, 189, 0.6))",
                  "drop-shadow(0 0 20px rgba(74, 233, 189, 0.3))"
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Pronto para Explorar?
            </motion.h2>

            <motion.p
              className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.4 }}
            >
              Descubra um novo nível de design e experiência visual
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5 }}
            >
              <Button3D 
                variant="gradient" 
                size="lg" 
                glow
                className="text-lg px-12 py-6"
              >
                <Rocket className="w-6 h-6 mr-2" />
                Começar Agora
              </Button3D>
            </motion.div>
          </div>
        </Card3D>
      </motion.section>
    </PageLayout>
  );
};

export default TestPage;

