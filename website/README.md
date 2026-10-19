# Neon Air Hockey website

Static site for the App Store's required URLs: a landing page plus
`/privacy`, `/terms` and `/support`. Plain HTML and CSS, so there's no build step.

## 1. Fill in your details

The support email (tend-us.support@proton.me) and the developer name (Tendus)
are filled in on every page.

Once the app is live, also replace the `href="#"` on the "Coming soon" button in
`index.html` with your App Store link and change its text.

## 2. Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the
   `VicArr786/HockeygameApple` GitHub repo.
2. Set **Root Directory** to `website`.
3. Leave **Framework Preset** as "Other" and leave the build and output settings empty.
4. Click **Deploy**.

From then on, every push to `main` redeploys automatically. To deploy from the
terminal instead: `cd website && npx vercel --prod`.

`vercel.json` turns on clean URLs, so `privacy.html` is served at `/privacy`.

## 3. Use the URLs in App Store Connect

| App Store Connect field | URL |
| --- | --- |
| Privacy Policy URL | `https://<your-project>.vercel.app/privacy` |
| Support URL | `https://<your-project>.vercel.app/support` |
| Marketing URL (optional) | `https://<your-project>.vercel.app/` |

The terms page is linked from the site. Apple's Standard EULA applies by
default, so you don't need to upload a custom licence agreement.
