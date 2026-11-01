import { Backends } from '@/components/home/Backends';
import { Band } from '@/components/home/Band';
import { BuiltOn } from '@/components/home/BuiltOn';
import { Hero } from '@/components/home/Hero';
import { Intro } from '@/components/home/Intro';
import { LumenSection } from '@/components/home/LumenSection';
import { Packages } from '@/components/home/Packages';
import { Start } from '@/components/home/Start';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Intro />
      <Backends />
      <Band />
      <LumenSection />
      <BuiltOn />
      <Packages />
      <Start />
    </>
  );
}
