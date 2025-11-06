import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Img,
} from 'https://esm.sh/@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface ConfirmSignupEmailProps {
  confirmationUrl: string
}

export const ConfirmSignupEmail = ({ confirmationUrl }: ConfirmSignupEmailProps) => (
  <Html>
    <Head />
    <Preview>Confirme o seu registo no Sheet-Tools</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoContainer}>
          <div style={glow} />
        </div>
        
        <Heading style={h1}>Bem-vindo ao Sheet-Tools! 🚀</Heading>
        
        <Text style={text}>
          Estamos muito felizes por teres escolhido automatizar o teu ROAS e maximizar os teus lucros connosco.
        </Text>
        
        <Text style={text}>
          Para começar a usar a plataforma, confirma o teu email clicando no botão abaixo:
        </Text>
        
        <Link
          href={confirmationUrl}
          target="_blank"
          style={button}
        >
          Confirmar Email
        </Link>
        
        <Text style={textSmall}>
          Ou copia e cola este link no teu navegador:
        </Text>
        <Text style={link}>{confirmationUrl}</Text>
        
        <Text style={footer}>
          Se não criaste esta conta, podes ignorar este email com segurança.
        </Text>
        
        <Text style={footerBrand}>
          <strong>Sheet-Tools</strong> - Automate your ROAS and maximize profits
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ConfirmSignupEmail

const main = {
  backgroundColor: '#0a0a0a',
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
}

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
}

const logoContainer = {
  textAlign: 'center' as const,
  marginBottom: '32px',
  position: 'relative' as const,
}

const glow = {
  width: '80px',
  height: '80px',
  margin: '0 auto',
  background: 'linear-gradient(135deg, #2d9f84 0%, #4ae9bd 100%)',
  borderRadius: '20px',
  boxShadow: '0 8px 30px rgba(74, 233, 189, 0.3)',
}

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '32px 0 24px',
  textAlign: 'center' as const,
  lineHeight: '1.3',
}

const text = {
  color: '#b3b3b3',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const textSmall = {
  color: '#808080',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '24px 0 8px',
}

const button = {
  backgroundColor: '#4ae9bd',
  borderRadius: '12px',
  color: '#0a0a0a',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '16px 32px',
  margin: '32px 0',
  boxShadow: '0 8px 25px rgba(74, 233, 189, 0.3)',
}

const link = {
  color: '#4ae9bd',
  fontSize: '14px',
  wordBreak: 'break-all' as const,
  margin: '8px 0 24px',
}

const footer = {
  color: '#666666',
  fontSize: '14px',
  lineHeight: '22px',
  marginTop: '32px',
  paddingTop: '24px',
  borderTop: '1px solid #1a1a1a',
  textAlign: 'center' as const,
}

const footerBrand = {
  color: '#4ae9bd',
  fontSize: '14px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  marginTop: '16px',
}
