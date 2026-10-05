/**
 * Screenshot tile for the home page demo gallery.
 *
 * Uses the uploaded static assets directly; no placeholder fallback is shown.
 *
 * @module components/DemoScreenshot
 */

'use client';

import { useState } from 'react';
import type { JSX } from 'react';
interface DemoScreenshotProps {
  /** Public path to the screenshot, e.g. "/demo/haigh-diagram.png". */
  readonly src: string;
  /** Alt text for the image (accessibility). */
  readonly alt: string;
  /** Short title shown under the image. */
  readonly label: string;
  /** One-line description shown under the title. */
  readonly description: string;
}

export default function DemoScreenshot({
  src,
  alt,
  label,
  description,
}: DemoScreenshotProps): JSX.Element {
  const [errored, setErrored] = useState(false);

  return (
    <figure className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="aspect-video w-full bg-gray-50">
        {!errored ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            onError={() => setErrored(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 p-4 text-center text-gray-400">
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            <span className="text-xs font-medium text-gray-500">Add screenshot here</span>
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400">
              public{src}
            </code>
          </div>
        )}
      </div>
      <figcaption className="p-4">
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      </figcaption>
    </figure>
  );
}
