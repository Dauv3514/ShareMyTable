import { Html, Head, Body, Container, Text, Button } from '@react-email/components';

type ResetPasswordProps = {
  resetUrl: string;
};

export function ResetPassword({ resetUrl }: ResetPasswordProps) {
  return (
    <Html lang="fr">
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f6f7fb' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px' }}>
          <Text style={{ fontSize: '18px', fontWeight: 700 }}>RamèneTaPoire - Réinitialiser le mot de passe</Text>
          <Text style={{ fontSize: '14px' }}>
            Tu as demandé une réinitialisation de mot de passe. Clique sur le bouton ci-dessous pour continuer.
          </Text>
          <Button
            href={resetUrl}
            style={{
              backgroundColor: '#2a5bd7',
              color: '#ffffff',
              padding: '10px 16px',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Réinitialiser mon mot de passe
          </Button>
          <Text style={{ fontSize: '12px', color: '#667085' }}>
            Si tu n'es pas à l'origine de cette demande, ignore cet email.
          </Text>
          <Text style={{ fontSize: '12px', color: '#667085' }}>
            Support : contact@ramenetapoire.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
