import { useState } from 'react';

interface Props extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  fallbackSrc?: string;
  alt: string;
}

/**
 * <SafeImage> — like <img>, but on error swaps to a placeholder so the
 * layout never collapses while the asset (or the network) is missing.
 * The fallback is also lazy-loaded.
 */
export function SafeImage({ src, fallbackSrc, alt, ...rest }: Props) {
  const [errored, setErrored] = useState(false);
  const finalSrc = errored && fallbackSrc ? fallbackSrc : src;
  return (
    <img
      {...rest}
      src={finalSrc}
      alt={alt}
      loading={rest.loading ?? 'lazy'}
      decoding={rest.decoding ?? 'async'}
      onError={() => {
        if (!errored && fallbackSrc) setErrored(true);
      }}
    />
  );
}
