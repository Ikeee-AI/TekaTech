import { useState } from 'react'
import PhoneGlyph from './PhoneGlyph'

/**
 * The one product-photo standard (14 Nov 2026): a neutral slate-100 frame in both themes,
 * a fixed aspect ratio set by the caller (`className`, e.g. "aspect-[4/3]"), and the photo
 * scaled with object-contain plus padding, so a phone is never cropped. A missing or broken
 * link shows the phone glyph in the same frame.
 * alt: "" when the phone's name is already next to the image. padding: smaller for thumbnails.
 */
export default function ProductImage({ src, alt = '', className = '', glyphClassName = 'w-1/3 h-2/3', padding = 'p-3', children }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const showImage = src && failedSrc !== src
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-100 flex items-center justify-center ${className}`}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-contain ${padding}`}
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <PhoneGlyph className={glyphClassName} />
      )}
      {children}
    </div>
  )
}
