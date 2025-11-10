import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Building2, Users, Zap, Shield, Mail, Phone, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { Card3D } from "@/components/ui/Card3D";
import { Button3D } from "@/components/ui/Button3D";

const ContactBusiness = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    website: "",
    numberOfStores: "",
    monthlyCampaigns: "",
    currentTools: "",
    specificNeeds: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Aqui você pode adicionar a lógica para enviar o email ou salvar no banco
      // Por agora, vamos apenas simular o envio
      
      const emailBody = `
Nova solicitação de Business Plan

Nome: ${formData.name}
Email: ${formData.email}
Empresa: ${formData.company}
Telefone: ${formData.phone}
Website: ${formData.website}
Número de Lojas: ${formData.numberOfStores}
Campanhas Mensais: ${formData.monthlyCampaigns}
Ferramentas Atuais: ${formData.currentTools}
Necessidades Específicas: ${formData.specificNeeds}

Mensagem:
${formData.message}
      `;

      // Enviar email usando mailto como fallback
      window.location.href = `mailto:info@sheet-tools.com?subject=Business Plan Inquiry - ${formData.company}&body=${encodeURIComponent(emailBody)}`;

      toast({
        title: t('contactBusiness.success'),
        description: t('contactBusiness.successDesc'),
      });

      // Aguardar um pouco antes de redirecionar
      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (error) {
      toast({
        title: t('contactBusiness.error'),
        description: t('contactBusiness.errorDesc'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <Button3D
            variant="glass"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('contactBusiness.back')}
          </Button3D>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-block mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
                <Building2 className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 gradient-text">
              {t('contactBusiness.title')}
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {t('contactBusiness.subtitle')}
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left Column - Benefits */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <Card3D intensity="medium" glow className="p-8 mb-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <Zap className="w-6 h-6 text-primary" />
                  {t('contactBusiness.whyBusiness')}
                </h3>
                <ul className="space-y-4">
                  {[
                    { icon: Users, key: 'benefit1' },
                    { icon: Shield, key: 'benefit2' },
                    { icon: Zap, key: 'benefit3' },
                    { icon: Globe, key: 'benefit4' },
                  ].map((item, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">{t(`contactBusiness.${item.key}Title`)}</h4>
                        <p className="text-sm text-gray-400">{t(`contactBusiness.${item.key}Desc`)}</p>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </Card3D>

              <Card3D intensity="medium" className="p-8">
                <h3 className="text-xl font-bold mb-4">{t('contactBusiness.contactInfo')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-400">
                    <Mail className="w-5 h-5 text-primary" />
                    <a href="mailto:info@sheet-tools.com" className="hover:text-primary transition-colors">
                      info@sheet-tools.com
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400">
                    <Phone className="w-5 h-5 text-primary" />
                    <span>{t('contactBusiness.availableAfterContact')}</span>
                  </div>
                </div>
              </Card3D>
            </motion.div>

            {/* Right Column - Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <Card3D intensity="high" glow className="p-8">
                <h3 className="text-2xl font-bold mb-6">{t('contactBusiness.formTitle')}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">{t('contactBusiness.name')} *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="mt-1 bg-white/5 border-white/10"
                        placeholder={t('contactBusiness.namePlaceholder')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">{t('contactBusiness.email')} *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="mt-1 bg-white/5 border-white/10"
                        placeholder={t('contactBusiness.emailPlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="company">{t('contactBusiness.company')} *</Label>
                      <Input
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        required
                        className="mt-1 bg-white/5 border-white/10"
                        placeholder={t('contactBusiness.companyPlaceholder')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">{t('contactBusiness.phone')}</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        className="mt-1 bg-white/5 border-white/10"
                        placeholder={t('contactBusiness.phonePlaceholder')}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="website">{t('contactBusiness.website')}</Label>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      value={formData.website}
                      onChange={handleChange}
                      className="mt-1 bg-white/5 border-white/10"
                      placeholder={t('contactBusiness.websitePlaceholder')}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="numberOfStores">{t('contactBusiness.numberOfStores')}</Label>
                      <Input
                        id="numberOfStores"
                        name="numberOfStores"
                        value={formData.numberOfStores}
                        onChange={handleChange}
                        className="mt-1 bg-white/5 border-white/10"
                        placeholder="Ex: 5-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="monthlyCampaigns">{t('contactBusiness.monthlyCampaigns')}</Label>
                      <Input
                        id="monthlyCampaigns"
                        name="monthlyCampaigns"
                        value={formData.monthlyCampaigns}
                        onChange={handleChange}
                        className="mt-1 bg-white/5 border-white/10"
                        placeholder="Ex: 50+"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="currentTools">{t('contactBusiness.currentTools')}</Label>
                    <Input
                      id="currentTools"
                      name="currentTools"
                      value={formData.currentTools}
                      onChange={handleChange}
                      className="mt-1 bg-white/5 border-white/10"
                      placeholder={t('contactBusiness.currentToolsPlaceholder')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="specificNeeds">{t('contactBusiness.specificNeeds')}</Label>
                    <Input
                      id="specificNeeds"
                      name="specificNeeds"
                      value={formData.specificNeeds}
                      onChange={handleChange}
                      className="mt-1 bg-white/5 border-white/10"
                      placeholder={t('contactBusiness.specificNeedsPlaceholder')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">{t('contactBusiness.message')} *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="mt-1 bg-white/5 border-white/10 resize-none"
                      placeholder={t('contactBusiness.messagePlaceholder')}
                    />
                  </div>

                  <Button3D
                    type="submit"
                    variant="gradient"
                    size="lg"
                    glow
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      t('contactBusiness.sending')
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        {t('contactBusiness.submit')}
                      </>
                    )}
                  </Button3D>

                  <p className="text-xs text-gray-400 text-center">
                    {t('contactBusiness.responseTime')}
                  </p>
                </form>
              </Card3D>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactBusiness;

