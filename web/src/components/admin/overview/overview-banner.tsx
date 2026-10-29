import Image from 'next/image';
import './overview-banner.css';

export function OverviewBanner({ schoolName }: { schoolName?: string | null }) {
  return (
    <section className="overview-banner" aria-labelledby="overview-title">
      <div className="overview-banner-art" aria-hidden="true">
        <Image
          src="/overview-banner.jpg"
          alt=""
          fill
          preload
          sizes="800px"
          className="overview-banner-image"
        />
      </div>
      <div className="overview-banner-copy">
        <h1 id="overview-title">Tổng quan</h1>
        {schoolName && <p title={schoolName}>{schoolName}</p>}
      </div>
    </section>
  );
}
