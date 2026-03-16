'use client';

interface AdUnitProps {
  slot: string;
  format?: 'horizontal' | 'vertical' | 'square' | 'auto';
  className?: string;
}

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

/**
 * Google AdSense ad unit.
 * Renders nothing when ADSENSE_CLIENT_ID is not configured.
 */
export function AdUnit({ slot, format = 'auto', className = '' }: AdUnitProps) {
  // Don't render anything until AdSense is actually set up
  if (!ADSENSE_CLIENT) return null;

  const sizeClass = {
    horizontal: 'w-full h-[90px]',
    vertical: 'w-[160px] h-[600px]',
    square: 'w-[300px] h-[250px]',
    auto: 'w-full h-[90px]',
  }[format];

  return (
    <div className={`${sizeClass} ${className}`} aria-label="Advertisement">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format === 'auto' ? 'auto' : undefined}
        data-full-width-responsive={format === 'horizontal' ? 'true' : undefined}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: '(adsbygoogle = window.adsbygoogle || []).push({});',
        }}
      />
    </div>
  );
}
