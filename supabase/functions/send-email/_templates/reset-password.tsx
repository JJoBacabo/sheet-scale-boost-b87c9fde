import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'https://esm.sh/@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface ResetPasswordEmailProps {
  confirmationUrl: string
}

export const ResetPasswordEmail = ({ confirmationUrl }: ResetPasswordEmailProps) => (
  <Html>
    <Head />
    <Preview>Recupera a tua password do Sheet-Tools</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoContainer}>
          <div style={glow} />
        </div>
        
        <Heading style={h1}>Recuperação de Password 🔐</Heading>
        
        <Text style={text}>
          Recebemos um pedido para redefinir a password da tua conta Sheet-Tools.
        </Text>
        
        <Text style={text}>
          Se foste tu, clica no botão abaixo para criar uma nova password:
        </Text>
        
        <Link
          href={confirmationUrl}
          target="_blank"
          style={button}
        >
          Redefinir Password
        </Link>
        
        <Text style={textSmall}>
          Ou copia e cola este link no teu navegador:
        </Text>
        <Text style={link}>{confirmationUrl}</Text>
        
        <div style={warningBox}>
          <Text style={warningText}>
            ⚠️ Este link expira em 1 hora por razões de segurança.
          </Text>
        </div>
        
        <Text style={footer}>
          Se não pediste para redefinir a tua password, podes ignorar este email com segurança. 
          A tua password não será alterada.
        </Text>
        
        <Text style={footerBrand}>
          <strong>Sheet-Tools</strong> - Automate your ROAS and maximize profits
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ResetPasswordEmail

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

const warningBox = {
  backgroundColor: 'rgba(234, 179, 8, 0.1)',
  border: '1px solid rgba(234, 179, 8, 0.3)',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
}

const warningText = {
  color: '#eab308',
  fontSize: '14px',
  margin: '0',
  textAlign: 'center' as const,
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
