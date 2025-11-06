import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Lock, User, MapPin } from "lucide-react";

export function FormComponentsDemo() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Form Components</h2>
        <p className="text-muted-foreground mb-6">
          Inputs, textareas, selects e checkboxes com glass effect e focus verde
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column - Inputs */}
        <Card className="p-8 glass-card border-2 border-border/50">
          <h3 className="text-xl font-semibold mb-6">Inputs & Textareas</h3>
          <div className="space-y-6">
            {/* Regular Input */}
            <div className="space-y-3">
              <Label htmlFor="name" className="text-base font-semibold">
                Nome Completo
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="João Silva"
                  className="pl-12"
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base font-semibold">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@example.com"
                  className="pl-12"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-3">
              <Label htmlFor="password" className="text-base font-semibold">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-12"
                />
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-3">
              <Label htmlFor="message" className="text-base font-semibold">
                Mensagem
              </Label>
              <Textarea
                id="message"
                placeholder="Escreva a sua mensagem aqui..."
                rows={4}
              />
            </div>
          </div>
        </Card>

        {/* Right Column - Select & Checkbox */}
        <Card className="p-8 glass-card border-2 border-border/50">
          <h3 className="text-xl font-semibold mb-6">Selects & Checkboxes</h3>
          <div className="space-y-6">
            {/* Select */}
            <div className="space-y-3">
              <Label htmlFor="country" className="text-base font-semibold">
                País
              </Label>
              <Select>
                <SelectTrigger id="country">
                  <SelectValue placeholder="Selecione o país" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Portugal</SelectItem>
                  <SelectItem value="br">Brasil</SelectItem>
                  <SelectItem value="es">Espanha</SelectItem>
                  <SelectItem value="fr">França</SelectItem>
                  <SelectItem value="us">Estados Unidos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Select 2 */}
            <div className="space-y-3">
              <Label htmlFor="plan" className="text-base font-semibold">
                Plano
              </Label>
              <Select>
                <SelectTrigger id="plan">
                  <SelectValue placeholder="Escolha o seu plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial (Grátis)</SelectItem>
                  <SelectItem value="basic">Basic - €47/mês</SelectItem>
                  <SelectItem value="standard">Standard - €97/mês</SelectItem>
                  <SelectItem value="expert">Expert - €197/mês</SelectItem>
                  <SelectItem value="enterprise">Enterprise - €497/mês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Checkboxes */}
            <div className="space-y-4 pt-4">
              <Label className="text-base font-semibold">Preferências</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox id="newsletter" className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                  <label
                    htmlFor="newsletter"
                    className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Receber newsletter semanal
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox id="notifications" className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                  <label
                    htmlFor="notifications"
                    className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Notificações de campanhas
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox id="updates" className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                  <label
                    htmlFor="updates"
                    className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Atualizações de produto
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button className="w-full btn-gradient px-6 py-4 rounded-xl font-semibold text-base">
                Guardar Alterações
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Full Width Form Example */}
      <Card className="p-8 glass-card border-2 border-border/50">
        <h3 className="text-xl font-semibold mb-6">Formulário Completo</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="fullname" className="text-base font-semibold">
              Nome
            </Label>
            <Input id="fullname" placeholder="Nome completo" />
          </div>
          <div className="space-y-3">
            <Label htmlFor="company" className="text-base font-semibold">
              Empresa
            </Label>
            <Input id="company" placeholder="Nome da empresa" />
          </div>
          <div className="space-y-3">
            <Label htmlFor="email2" className="text-base font-semibold">
              Email
            </Label>
            <Input id="email2" type="email" placeholder="email@empresa.com" />
          </div>
          <div className="space-y-3">
            <Label htmlFor="phone" className="text-base font-semibold">
              Telefone
            </Label>
            <Input id="phone" type="tel" placeholder="+351 912 345 678" />
          </div>
          <div className="space-y-3 md:col-span-2">
            <Label htmlFor="address" className="text-base font-semibold">
              Morada
            </Label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input id="address" placeholder="Morada completa" className="pl-12" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
