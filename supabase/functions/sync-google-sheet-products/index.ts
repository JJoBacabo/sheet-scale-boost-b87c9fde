import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { action, sheetId, sheetName = 'Cotação' } = await req.json();

    // Get Google Sheets credentials from secrets
    const clientEmail = Deno.env.get('GOOGLE_SHEETS_CLIENT_EMAIL');
    const privateKey = Deno.env.get('GOOGLE_SHEETS_PRIVATE_KEY');
    
    console.log('Checking credentials:', {
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
      privateKeyLength: privateKey?.length || 0,
      privateKeyStart: privateKey?.substring(0, 50) || 'missing'
    });
    
    if (!clientEmail || !privateKey) {
      throw new Error('Google Sheets credentials not configured. Please set GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY secrets.');
    }
    
    // Validate private key format
    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      throw new Error('GOOGLE_SHEETS_PRIVATE_KEY must be a valid PEM-formatted private key. It should start with -----BEGIN PRIVATE KEY-----');
    }

    // Create JWT for Google Sheets API
    const jwtToken = await createJWT(clientEmail, privateKey);
    
    if (action === 'sync') {
      // Sync data FROM Google Sheet TO database
      if (!sheetId) {
        throw new Error('Sheet ID is required for sync');
      }

      console.log('📊 Syncing from Google Sheet:', sheetId);

      // Read data from Google Sheet
      const sheetData = await readGoogleSheet(sheetId, sheetName, jwtToken);
      
      let productsUpdated = 0;
      const errors: string[] = [];

      // Update products in database
      for (const row of sheetData) {
        const [productName, costPrice] = row;
        
        if (!productName) continue;

        try {
          // Find product by name
          const { data: products } = await supabase
            .from('products')
            .select('id')
            .eq('user_id', user.id)
            .ilike('product_name', productName)
            .limit(1);

          if (products && products.length > 0) {
            const productId = products[0].id;
            const parsedCost = parseFloat(String(costPrice).replace(',', '.'));

            if (!isNaN(parsedCost)) {
              await supabase
                .from('products')
                .update({ cost_price: parsedCost })
                .eq('id', productId)
                .eq('user_id', user.id);

              productsUpdated++;
            }
          }
        } catch (error: any) {
          errors.push(`Error updating ${productName}: ${error?.message || 'Unknown error'}`);
        }
      }

      // Log sync result
      await supabase
        .from('sheets_sync_log')
        .insert({
          user_id: user.id,
          sheet_id: sheetId,
          sheet_name: sheetName,
          sync_status: errors.length > 0 ? 'partial_success' : 'success',
          products_updated: productsUpdated,
          error_message: errors.length > 0 ? errors.join('; ') : null,
        });

      return new Response(
        JSON.stringify({
          success: true,
          productsUpdated,
          totalRows: sheetData.length,
          errors: errors.length > 0 ? errors : undefined,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'create') {
      // Create new Google Sheet with current products
      console.log('📝 Creating new Google Sheet');

      // Get user's products
      const { data: products } = await supabase
        .from('products')
        .select('product_name, cost_price')
        .eq('user_id', user.id)
        .order('product_name');

      if (!products || products.length === 0) {
        throw new Error('No products found to export');
      }

      // Create new spreadsheet
      const newSheetId = await createGoogleSheet(sheetName, products, jwtToken, clientEmail);

      // Log creation
      await supabase
        .from('sheets_sync_log')
        .insert({
          user_id: user.id,
          sheet_id: newSheetId,
          sheet_name: sheetName,
          sync_status: 'success',
          products_created: products.length,
        });

      return new Response(
        JSON.stringify({
          success: true,
          sheetId: newSheetId,
          sheetUrl: `https://docs.google.com/spreadsheets/d/${newSheetId}/edit`,
          productsExported: products.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      throw new Error('Invalid action. Use "sync" or "create"');
    }

  } catch (error: any) {
    console.error('Error in sync-google-sheet-products:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function createJWT(clientEmail: string, privateKey: string): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedClaim = btoa(JSON.stringify(claim)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const signatureInput = `${encodedHeader}.${encodedClaim}`;
  
  try {
    // Import private key - handle both escaped newlines and actual newlines
    let pemKey = privateKey.trim();
    
    // Replace escaped newlines with actual newlines
    if (pemKey.includes('\\n')) {
      pemKey = pemKey.split('\\n').join('\n');
    }
    
    // Ensure proper PEM format
    if (!pemKey.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('Invalid private key format: missing BEGIN header');
    }
    
    // Extract the base64 content between headers
    const pemContents = pemKey
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/\s+/g, '');
    
    if (!pemContents) {
      throw new Error('Invalid private key: no content found');
    }
    
    // Decode base64 to binary
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    // Import the key
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );
    
    // Sign the JWT
    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      encoder.encode(signatureInput)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const jwt = `${signatureInput}.${encodedSignature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error('Token exchange failed:', tokenData);
      throw new Error(`Failed to get access token: ${tokenData.error_description || tokenData.error || 'Unknown error'}`);
    }

    return tokenData.access_token;
  } catch (error: any) {
    console.error('Failed to create JWT:', error);
    throw new Error(`JWT creation failed: ${error.message}. Please ensure GOOGLE_SHEETS_PRIVATE_KEY is a valid PEM-formatted RSA private key.`);
  }
}

async function readGoogleSheet(sheetId: string, sheetName: string, accessToken: string): Promise<string[][]> {
  const range = `${sheetName}!A2:B1000`; // Skip header row
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to read Google Sheet: ${error}`);
  }

  const data = await response.json();
  return data.values || [];
}

async function createGoogleSheet(
  title: string,
  products: Array<{ product_name: string; cost_price: number | null }>,
  accessToken: string,
  serviceEmail: string
): Promise<string> {
  // Create spreadsheet
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title,
      },
      sheets: [{
        properties: {
          title: title,
        }
      }]
    })
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to create Google Sheet: ${error}`);
  }

  const createData = await createResponse.json();
  const spreadsheetId = createData.spreadsheetId;

  // Prepare data with header
  const values = [
    ['Nome do Produto', 'Cotação (€)'],
    ...products.map(p => [p.product_name, p.cost_price || 0])
  ];

  // Write data to sheet
  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(title)}!A1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values })
    }
  );

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    throw new Error(`Failed to write data to sheet: ${error}`);
  }

  // Share with service account to allow future edits
  await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'user',
      role: 'writer',
      emailAddress: serviceEmail
    })
  });

  return spreadsheetId;
}
