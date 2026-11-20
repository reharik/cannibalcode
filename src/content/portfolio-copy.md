Portfolio Copy
Nov 20, 2026 · @raif harik
The text for cannibalcode.com's front page. First person, no adjectives, facts carry the weight.
Header
Raif Harik
I take products from nothing to shipped. Twenty years of writing software, the last eight in TypeScript.
Austin, TX · email · GitHub · npm · Writing
Landing cards
The front page is the header plus these four cards, each with one image, each linking to its own page. The sections below this one are the detail pages.
Homeroll — A private photo stream for my family, because group texts lose photos and nobody wants their aunts on a social feed. In production; built end to end in TypeScript. → /homeroll
MethodFitness — Scheduling and payments for my brother's training studio. Fifteen years in production and still my test bed for anything new. → /methodfitness
smart-enums & ioc-manifest — Two npm libraries that exist because I needed them: one place for every constant, and build-time dependency injection for TypeScript. → /libraries
The shop — I built my woodshop myself, slab up. Cabinetry, turning, and the occasional rig that lets a wooden vase hold live flowers. → /shop
Homeroll — homeroll.app
My extended family is spread across every platform, and some are on none. So photos get shared by text, and fifteen minutes later they're lost in the thread. I wanted a place we could share them without putting the family on a social feed, and without confusing the heck out of my aunts in the old country.
Homeroll is a private family photo stream. Anyone can sign up and upload, and nobody sees anything that hasn't been shared with them directly. It's built against the threats that actually matter for family photos: nothing indexed or crawlable, nothing sold or trained on, no feed. Share links exist because people need them, but they're unguessable, you can see who has one, and you can revoke it. It is not locked down like a bank, because then nobody's aunt would use it. And it has every feature I ever wanted.
How it's built
• TypeScript end to end
• Domain-driven design: domain events, repositories, async services
• Dependency injection via ioc-manifest and typed enums via smart-enums, both battle-tested here before publishing
• React, Node, Postgres, S3; Nx monorepo, Vite, Playwright e2e
• Installable on phones as a PWA
• Self-hosted on AWS behind Caddy, containers deployed via GitHub Actions
The hard part: the photo pipeline. An upload kicks off optimization, storage, and notifications, each async and each able to fail on its own. Keeping that lifecycle coherent while surfacing it to the user, then deep-linking in-app notifications back into it: that's where most of the real engineering went.
MethodFitness
My brother owns a personal training studio and needed scheduling and payments that fit how trainers actually work. I needed to learn how to write enterprise-level software and a place to sharpen my skills. So I built it; that was fifteen years ago and it's still running.
Trainers book their own sessions, clients prepay for packages with per-client and per-trainer pricing, and the system works out commissions and payouts. It runs the business: the schedule, the money, and the weekly reports come out of it.
How it's built
• Originally C# / ASP.NET MVC with a custom JavaScript front end; still in production
• Extended today with TypeScript/Node on AWS Lambda for scheduled email reporting
• It's also been my test bed for fifteen years: when something new comes out, this is where I try it for real
Libraries — npm
Two packages I use in production. smart-enums is older than Homeroll; ioc-manifest came out of it.
smart-enums — One declarative place for every constant in a codebase, with derived values and behavior attached to each. I've been sneaking this idea into every job since my C# days, usually failing or regretting it. Homeroll is where I finally used it to the breaking point and got it right. [npm] [post]
ioc-manifest — Build-time dependency injection for TypeScript. It reads your factories and classes, checks the wiring, and generates a typed Awilix container, so nothing is registered by hand and nothing is scanned at runtime. Loosely inspired by StructureMap's conventions, which I'd used in C# and missed. [npm] [post]
Posts live at cannibalcode.com and also run on Medium and dev.to. The ioc-manifest piece was picked up by JavaScript in Plain English.
The shop
I also build things that aren't software. I put up my woodshop myself, every stick of it, from the slab up: framing, electrical, roof, no contractors except the concrete truck. In it I do cabinetry and turning.
Latest build: a rotisserie rig that slowly turns a vase while the epoxy inside cures, so a turned wooden vase can hold live flowers. Watch it. One more build is in progress.
Still to fill in
[ ] Email address and GitHub / npm profile URLs for the header
[ ] Blog post URLs on cannibalcode.com for smart-enums and ioc-manifest
[ ] Homeroll repo link (or decide it stays private)
[ ] 3–4 Homeroll screenshots; optional 3-minute screen walkthrough
[ ] One MethodFitness screenshot, names blurred
[ ] Decide: work page becomes cannibalcode.com's front page, blog moves to a link
[ ] Delete or unlist the duplicate YouTube upload
