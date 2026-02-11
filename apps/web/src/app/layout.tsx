export const metadata = {
  title: 'WebhookPro - Reliable Webhook Infrastructure',
  description: 'Stress-free webhook delivery with retries, monitoring, and analytics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
