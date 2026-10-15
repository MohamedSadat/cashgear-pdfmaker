import Link from 'next/link';

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <Link href="/" className="text-primary underline">
          See all tools
        </Link>
      </body>
    </html>
  );
}
