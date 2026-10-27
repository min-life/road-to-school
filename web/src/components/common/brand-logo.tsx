import Image from 'next/image';

export function BrandLogo({ className = '', icon = false }: { className?: string; icon?: boolean }) {
  return (
    <Image
      src={icon ? '/road-to-school-icon.svg' : '/road-to-school-variant-navy.svg'}
      alt="Road To School"
      width={icon ? 176 : 470}
      height={icon ? 109 : 150}
      unoptimized
      className={`brand-logo ${icon ? 'brand-logo-icon' : ''} ${className}`}
    />
  );
}
