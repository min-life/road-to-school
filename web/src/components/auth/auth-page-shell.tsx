import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BrandLogo } from '@/components/common/brand-logo';

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-hero" aria-label="Road To School">
        <Link href="/login" aria-label="Road To School — Đăng nhập"><BrandLogo className="auth-hero-logo" /></Link>
        <div className="auth-hero-copy">
          <span className="auth-rule" aria-hidden="true" />
          <h2>An toàn hôm nay<br /><em>vững bước tương lai</em></h2>
        </div>
        <Image src="/login-hero.png" alt="" width={1821} height={864} priority aria-hidden="true" className="auth-illustration" />
      </section>
      <section className="auth-form-area" aria-label="Tài khoản quản trị">
        <Link href="/login" aria-label="Road To School — Đăng nhập" className="auth-mobile-brand"><BrandLogo /></Link>
        <span className="auth-ring" aria-hidden="true" />
        <span className="auth-arc" aria-hidden="true" />
        <span className="auth-dots" aria-hidden="true" />
        <div className="auth-content">{children}</div>
      </section>
    </main>
  );
}
