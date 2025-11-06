import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const Privacy = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-white hover:text-primary"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t('common.back')}
        </Button>
        
        <h1 className="text-4xl font-bold mb-8">{t('footer.privacyPolicy')}</h1>
        
        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Introduction</h2>
            <p>
              This Privacy Policy describes how we collect, use, store and protect your personal information when you use our Facebook Ads campaign management platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold mb-3 mt-4 text-white">2.1 Information Provided by You</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name, email and contact information</li>
              <li>Authentication credentials</li>
              <li>Profile information and preferences</li>
              <li>Payment data (processed by secure third parties)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4 text-white">2.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>IP address and device information</li>
              <li>Browser type and operating system</li>
              <li>Pages visited and usage time</li>
              <li>Cookies and similar technologies</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4 text-white">2.3 Facebook Ads Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Advertising campaign information</li>
              <li>Performance metrics and statistics</li>
              <li>Audience and targeting data</li>
              <li>Ad history and budgets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, operate and improve our services</li>
              <li>Create and manage your user account</li>
              <li>Process transactions and send notifications</li>
              <li>Personalize your platform experience</li>
              <li>Analyze usage and trends to improve features</li>
              <li>Communicate updates, offers and support</li>
              <li>Prevent fraud and ensure security</li>
              <li>Comply with legal and regulatory obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Information Sharing</h2>
            <p className="mb-2">
              We do not sell your personal information. We may share data in the following situations:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Service Providers:</strong> With partners who help us operate the platform (hosting, analytics, payments)</li>
              <li><strong className="text-white">Meta/Facebook:</strong> To access and manage your Facebook Ads campaigns</li>
              <li><strong className="text-white">Legal Requirements:</strong> When required by law or to protect legal rights</li>
              <li><strong className="text-white">Business Transfers:</strong> In case of merger, acquisition or asset sale</li>
              <li><strong className="text-white">With Your Consent:</strong> When you expressly authorize</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Data Security</h2>
            <p>
              We implement technical and organizational security measures to protect your information against unauthorized access, alteration, disclosure or destruction, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>SSL/TLS encryption for data transmission</li>
              <li>Secure storage on protected servers</li>
              <li>Strict access controls</li>
              <li>Continuous security monitoring</li>
              <li>Regular security audits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Your Rights</h2>
            <p className="mb-2">
              According to data protection regulations (GDPR), you have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Access:</strong> Request copies of your personal information</li>
              <li><strong className="text-white">Rectification:</strong> Correct inaccurate or incomplete information</li>
              <li><strong className="text-white">Deletion:</strong> Request deletion of your information</li>
              <li><strong className="text-white">Portability:</strong> Receive your data in structured format</li>
              <li><strong className="text-white">Object:</strong> Object to processing of your data</li>
              <li><strong className="text-white">Restriction:</strong> Limit how we process your information</li>
              <li><strong className="text-white">Withdraw Consent:</strong> Withdraw granted authorizations</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us via support email.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar technologies to improve your experience, analyze platform usage and personalize content. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">8. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to fulfill the purposes described in this policy, unless a longer retention period is required or permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">9. International Transfers</h2>
            <p>
              Your data may be transferred and processed in countries outside the European Union. We ensure that such transfers comply with applicable legal requirements and that adequate protection measures are in place.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">10. Children's Privacy</h2>
            <p>
              Our platform is not intended for minors under 18 years of age. We do not intentionally collect information from children. If we discover that we have collected data from a minor, we will take steps to delete that information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of significant changes through the platform or by email. Continued use after changes constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">12. Contact</h2>
            <p>
              For questions about this Privacy Policy or how we process your personal data, please contact us at info@sheet-tools.com
            </p>
          </section>

          <p className="text-sm text-gray-400 mt-8">
            Last updated: {new Date().toLocaleDateString('en-US')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
