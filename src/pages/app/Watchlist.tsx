import { AppLayout } from '@/components/app/AppLayout';

const Watchlist = () => {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">Watchlist</h1>
        <p className="text-foreground/80">Your personal watchlist of movies and shows to watch.</p>
      </div>
    </AppLayout>
  );
};

export default Watchlist;
