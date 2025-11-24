import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-black relative overflow-hidden">
      <div className="absolute inset-0 gradient-ocean opacity-70" />
      <div className="relative z-10 text-center space-y-8">
        <h1 className="text-6xl font-bold">
          <span className="text-gradient">ViiB</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          Experience the cinematic onboarding
        </p>
        <Button
          onClick={() => navigate("/onboarding")}
          size="lg"
          className="px-12 h-14 text-lg font-medium bg-gradient-to-r from-primary to-accent hover:shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-105"
        >
          Start Onboarding
        </Button>
      </div>
    </div>
  );
};

export default Index;
