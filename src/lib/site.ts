export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function reviewUrl(slug: string): string {
  return `${getSiteUrl()}/r/${slug}`;
}
