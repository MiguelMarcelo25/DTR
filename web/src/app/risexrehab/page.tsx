import { BookingProvider } from './_components/booking/BookingProvider';
import { Nav } from './_components/Nav';
import { Hero } from './_components/Hero';
import { Marquee } from './_components/Marquee';
import { WhyUs } from './_components/WhyUs';
import { Services } from './_components/Services';
import { HowItWorks } from './_components/HowItWorks';
import { WhoItsFor } from './_components/WhoItsFor';
import { Founders } from './_components/Founders';
import { Endorsers } from './_components/Endorsers';
import { Gallery } from './_components/Gallery';
import { CtaBand } from './_components/CtaBand';
import { Contact } from './_components/Contact';
import { Footer } from './_components/Footer';

export default function RiseXRehabPage() {
  return (
    <BookingProvider>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <WhyUs />
        <Services />
        <HowItWorks />
        <WhoItsFor />
        <Founders />
        <Endorsers />
        <Gallery />
        <CtaBand />
        <Contact />
      </main>
      <Footer />
    </BookingProvider>
  );
}
