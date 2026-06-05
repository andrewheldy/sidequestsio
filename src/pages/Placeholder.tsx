import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';

/**
 * Clean "coming soon" screen for routes/features that aren't built yet, so no
 * link in the app is ever dead.
 */
const Placeholder = ({ title, description }: { title: string; description?: string }) => (
  <Layout>
    <section className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Construction className="h-8 w-8" />
      </div>
      <h1 className="mb-3 font-poppins text-3xl font-bold">{title}</h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        {description ?? 'We’re still building this page. Check back soon.'}
      </p>
      <Button asChild>
        <Link to="/">Back home</Link>
      </Button>
    </section>
  </Layout>
);

export default Placeholder;
