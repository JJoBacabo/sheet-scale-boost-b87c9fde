import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22'
import { ConfirmSignupEmail } from './_templates/confirm-signup.tsx'
import { ResetPasswordEmail } from './_templates/reset-password.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('not allowed', { status: 400 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)
  const wh = new Webhook(hookSecret)
  
  try {
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const confirmationUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`

    let html: string
    let subject: string

    // Determine which email template to use based on the action type
    if (email_action_type === 'signup') {
      html = await renderAsync(
        React.createElement(ConfirmSignupEmail, {
          confirmationUrl,
        })
      )
      subject = 'Confirma o teu registo no Sheet-Tools 🚀'
    } else if (email_action_type === 'recovery' || email_action_type === 'magiclink') {
      html = await renderAsync(
        React.createElement(ResetPasswordEmail, {
          confirmationUrl,
        })
      )
      subject = 'Recupera a tua password do Sheet-Tools 🔐'
    } else {
      // Fallback for other email types
      html = await renderAsync(
        React.createElement(ConfirmSignupEmail, {
          confirmationUrl,
        })
      )
      subject = 'Email do Sheet-Tools'
    }

    const { error } = await resend.emails.send({
      from: 'Sheet-Tools <onboarding@resend.dev>',
      to: [user.email],
      subject,
      html,
    })

    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error sending email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = (error as any)?.code || 500
    
    return new Response(
      JSON.stringify({
        error: {
          http_code: errorCode,
          message: errorMessage,
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
