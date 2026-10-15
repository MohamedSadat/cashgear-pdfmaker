import { notFound } from 'next/navigation';

// Any unknown path inside a locale renders that locale's not-found page.
export default function CatchAll() {
  notFound();
}
