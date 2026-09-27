/* Sable Villas — site configuration (edit this file only)
   ------------------------------------------------------------------
   FORMS. Every form on the site posts to one Formspree form, which relays
   each submission by email to the recipient configured in Formspree
   (sales@sablevillas.ae). The form name and page are included
   in the email subject so the team can tell registrations apart.

     1. formspree.io → New form → recipient: sales@sablevillas.ae
        (Formspree emails that address a one-time verification link).
     2. Copy the form's endpoint, e.g. https://formspree.io/f/abcdwxyz, below.

   SPAM. Google reCAPTCHA v3 runs invisibly on every submit; Formspree
   verifies the token server-side and drops anything that scores as a bot.

     3. google.com/recaptcha/admin → Create → type: v3 → domains:
        sablevillas.ae, www.sablevillas.ae
        (add the GitHub Pages host if the preview stays live) → copy the SITE key below.
     4. In Formspree → the form → Settings → Spam protection → reCAPTCHA v3:
        paste the SECRET key there (never in this file).

   Leave either value empty and the site degrades gracefully: forms show
   the local "sent" state without sending (endpoint) or send without a
   captcha token (site key). A hidden honeypot field is always included. */
window.SABLE = {
  formEndpoint: "",          // e.g. "https://formspree.io/f/abcdwxyz"
  recaptchaSiteKey: "",      // e.g. "6Lc...-...-...."
  notifyEmail: "sales@sablevillas.ae",
};
