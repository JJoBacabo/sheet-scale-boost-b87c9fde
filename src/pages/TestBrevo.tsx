import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, CheckCircle } from 'lucide-react';

const TestBrevo = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email obrigatório',
        description: 'Por favor, insira um endereço de email válido.',
      });
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const { data, error } = await supabase.functions.invoke('test-brevo-email', {
        body: { email, name: name || 'Cliente Teste' },
      });

      if (error) throw error;

      if (data.success) {
        setSuccess(true);
        toast({
          title: '✅ Email enviado!',
          description: `Email de teste enviado para ${email}. Verifique a sua caixa de entrada.`,
        });
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar',
        description: error.message || 'Não foi possível enviar o email de teste.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Teste de Integração Brevo</h1>
        <p className="text-muted-foreground">
          Envie um email de teste para confirmar que a integração com Brevo está a funcionar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email de Teste
          </CardTitle>
          <CardDescription>
            Insira o seu email para receber um email de teste via Brevo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendTest} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome (opcional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="O seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Email enviado com sucesso!</p>
                  <p className="text-sm text-green-700 mt-1">
                    Verifique a sua caixa de entrada. O email pode demorar alguns minutos a chegar.
                  </p>
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Enviando...' : 'Enviar Email de Teste'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2 text-sm">ℹ️ Informação</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Este email é enviado através da API do Brevo</li>
              <li>• Confirma que a integração está funcional</li>
              <li>• Não afeta o sistema de emails de retenção</li>
              <li>• Pode ser enviado quantas vezes necessário</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestBrevo;
