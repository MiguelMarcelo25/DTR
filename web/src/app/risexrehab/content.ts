/**
 * RISE X REHAB — single source of truth for the one-pager.
 * Content is grounded in public reporting (Manila Bulletin / Manila Standard /
 * Manila Times, Feb 2026) and the brand's Facebook/Instagram. Facts NOT publicly
 * available (phone, email, hours, pricing, client testimonials) are intentionally
 * omitted rather than invented.
 */

const u = (id: string, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const BRAND = {
  bg: '#0B0C0E',
  panel: '#111315',
  ink: '#F7F6F3',
  navy: '#1B2A4A',
  teal: '#2EE6D6',
  volt: '#C6FF00',
} as const;

export const CTA = {
  label: 'Book a Free Assessment',
  href: 'https://www.facebook.com/risexrehab/',
} as const;

export const RXR = {
  name: 'RISE X REHAB',
  shortName: 'Rise X Rehab',
  tagline: 'Rise. Rebuild. Restore.',
  heroHeadline: ['Rise.', 'Rebuild.', 'Restore.'],
  heroSubhead:
    'A premium physical therapy, sports rehabilitation & recovery clinic in Quezon City — where evidence-based care meets real performance training. For athletes, everyday people, seniors, and kids.',
  openedNote: 'Now open in Sta. Mesa Heights, Quezon City',

  nav: [
    { label: 'Services', href: '#services' },
    { label: 'How it works', href: '#how' },
    { label: 'Who it’s for', href: '#who' },
    { label: 'Team', href: '#team' },
    { label: 'Contact', href: '#contact' },
  ],

  summary:
    'RISE X REHAB is a premium physical therapy and sports rehabilitation & recovery clinic in Sta. Mesa Heights, Quezon City. We blend a clinical team of physiatrists, physiotherapists, and sports-science professionals with modern training and evidence-based recovery equipment — bridging rehabilitation and performance so you don’t just return to baseline, you come back stronger.',

  differentiators: [
    {
      title: 'Physio-led, science-driven',
      body: 'A clinical team of physiatrists, physiotherapists, and sports-science professionals — care built on assessment data, not guesswork.',
    },
    {
      title: 'Rehab → performance continuum',
      body: 'We don’t stop at pain relief. Programming continues past recovery so you return stronger and more capable than before.',
    },
    {
      title: 'Premium, but for everyone',
      body: 'A top-of-the-line center built for pro and amateur athletes — and equally for non-athletes, seniors, and children.',
    },
    {
      title: 'Personalized, end to end',
      body: 'Individualized plans from first assessment through reassessment, with continuity from the same expert team.',
    },
  ],

  // Honest, non-fabricated highlight tiles (no invented metrics).
  stats: [
    { value: '5-step', label: 'data-driven method' },
    { value: '1:1', label: 'expert-led care' },
    { value: 'All ages', label: 'kids to seniors' },
    { value: 'Feb 2026', label: 'now open in QC' },
  ],

  services: [
    {
      name: 'Science-Driven Rehabilitation',
      body: 'Evidence-based, advanced physical therapy that goes beyond pain relief to restore function and rebuild strength.',
      image: u('photo-1576678927484-cc907957088c'),
      tag: 'Rehab',
    },
    {
      name: 'Sports Recovery & Rehabilitation',
      body: 'Structured recovery programs targeting chronic soreness, long-standing muscle pain, and sports-related injuries.',
      image: u('photo-1546483875-ad9014c88eba'),
      tag: 'Recovery',
    },
    {
      name: 'Performance Programs',
      body: 'Performance-focused training that helps athletes and active clients return stronger and more capable than before.',
      image: u('photo-1599058917212-d750089bc07e'),
      tag: 'Performance',
    },
    {
      name: 'PRP (Platelet-Rich Plasma) Therapy',
      body: 'A minimally invasive treatment for pain relief and restoring function using the body’s own healing factors.',
      image: u('photo-1583454110551-21f2fa2afe61'),
      tag: 'Clinical',
    },
    {
      name: 'Advanced Diagnostic Imaging',
      body: 'In-house diagnostics that inform precise, individualized treatment and recovery plans.',
      image: u('photo-1581009146145-b5ef050c2e1e'),
      tag: 'Diagnostics',
    },
    {
      name: 'Noninvasive & Minimally Invasive Treatments',
      body: 'A range of modern therapeutic options matched to each client’s condition and recovery stage.',
      image: u('photo-1581122584612-713f89daa8eb'),
      tag: 'Treatment',
    },
  ],

  howItWorks: [
    {
      step: '01',
      title: 'Assessment & Movement Screen',
      body: 'A thorough intake of medical and injury history plus a professional movement screen — range of motion, strength balance, and capacity. Programming starts from objective baseline data.',
    },
    {
      step: '02',
      title: 'Diagnosis & Goal-Setting',
      body: 'We translate findings into a clear picture of the problem and specific, realistic goals — reduce pain, restore mobility, or return to your sport or activity.',
    },
    {
      step: '03',
      title: 'Personalized Recovery Roadmap',
      body: 'A tailored, multi-week plan built around your recovery stage that blends rehab science with progressive strength and conditioning, so every session is intentional.',
    },
    {
      step: '04',
      title: 'Coached Care & Training',
      body: 'Hands-on clinical treatment combined with real coaching from physiatrists, physiotherapists, and sports-science professionals — continuity from the same team throughout.',
    },
    {
      step: '05',
      title: 'Recovery & Reassessment',
      body: 'Evidence-based recovery systems support your training load, and you’re re-tested against your baseline to confirm progress, prevent re-injury, and advance toward full performance.',
    },
  ],

  audience: [
    'Professional & amateur athletes',
    'Active adults & everyday clients',
    'Post-injury & post-surgical recovery',
    'Chronic or recurring pain & soreness',
    'Seniors',
    'Children',
  ],

  founders: [
    { name: 'Geonina Co', role: 'Founder & CEO', initials: 'GC' },
    { name: 'Charlene Chua', role: 'Co-Owner · Physical Therapist', initials: 'CC' },
    { name: 'Andre Flores', role: 'Co-Owner · Former PBA Player', initials: 'AF' },
  ],

  // Press-reported launch supporters (NOT formal written endorsements, and NOT
  // owners). Framed honestly in the Endorsers section as launch recognition.
  endorsers: [
    'Chino Sy — SEA Games Champion',
    'Philippine Physical Therapy Association',
  ],

  press: ['Manila Bulletin', 'Manila Standard', 'The Manila Times'],

  gallery: [
    u('photo-1558611848-73f7eb4001a1'),
    u('photo-1593079831268-3381b0db4a77'),
    u('photo-1534438327276-14e5300c3a48'),
    u('photo-1517344368193-41552b6ad3f5'),
    u('photo-1605296867304-46d5465a13f1'),
    u('photo-1591258370814-01609b341790'),
  ],

  images: {
    hero: u('photo-1517836357463-d25dfeac3438', 2000),
    whyUs: u('photo-1571019613454-1cb2f99b2d8b'),
    whoItsFor: u('photo-1532384748853-8f54a8f476e2'),
    howItWorks: u('photo-1534258936925-c58bed479fcb'),
    contact: u('photo-1591258370814-01609b341790'),
  },

  booking: {
    // Disciplines / known clinician — no fabricated individual staff names.
    coaches: [
      'First available',
      'Charlene Chua — Physical Therapist',
      'Physiatrist',
      'Physiotherapist',
      'Sports-science coach',
    ],
    times: ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'],
  },

  contact: {
    location: 'D. Tuazon Street, Sta. Mesa Heights, Quezon City, Metro Manila, Philippines',
    mapsEmbed:
      'https://www.google.com/maps?q=Rise%20X%20Rehab%2C%20D.%20Tuazon%20Street%2C%20Sta.%20Mesa%20Heights%2C%20Quezon%20City&output=embed',
    facebook: 'https://www.facebook.com/risexrehab/',
    instagram: 'https://www.instagram.com/risexrehab/',
    // Note: no public phone/email/hours yet — booking routes to Messenger.
  },
} as const;

export type Service = (typeof RXR.services)[number];
export type Step = (typeof RXR.howItWorks)[number];
export type Founder = (typeof RXR.founders)[number];
