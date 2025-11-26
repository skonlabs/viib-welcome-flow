import { AppLayout } from '@/components/app/AppLayout';

const Home = () => {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">Welcome to ViiB</h1>
        <p className="text-foreground/80">Your personalized content discovery experience.</p>
      </div>
    </AppLayout>
  );
};

export default Home;
