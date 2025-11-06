// Encryption utilities for sensitive data storage
// Uses AES-GCM encryption with a secret key stored in environment variables

const ENCRYPTION_KEY_HEX = Deno.env.get('ENCRYPTION_KEY');

if (!ENCRYPTION_KEY_HEX) {
  console.error('ENCRYPTION_KEY not set - token encryption disabled');
}

async function getEncryptionKey(): Promise<CryptoKey | null> {
  if (!ENCRYPTION_KEY_HEX) return null;
  
  const keyData = new Uint8Array(
    ENCRYPTION_KEY_HEX.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptToken(token: string): Promise<string> {
  const key = await getEncryptionKey();
  if (!key) {
    console.warn('Encryption key not available, storing token in plaintext');
    return token;
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedToken = new TextEncoder().encode(token);
  
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedToken
  );

  // Combine IV and encrypted data, then base64 encode
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

export async function decryptToken(encryptedToken: string): Promise<string> {
  const key = await getEncryptionKey();
  if (!key) {
    console.warn('Encryption key not available, assuming plaintext token');
    return encryptedToken;
  }

  try {
    // Base64 decode
    const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    console.error('Decryption failed, assuming plaintext token:', error);
    // Fallback for tokens stored before encryption was enabled
    return encryptedToken;
  }
}
