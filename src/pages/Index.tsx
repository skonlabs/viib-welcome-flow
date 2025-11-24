import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background gradient-hero animate-gradient">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-light text-foreground tracking-wide">
          ViiB Demo
        </h1>
        <p className="text-xl text-muted-foreground">
          Experience the onboarding flow
        </p>
        <Button
          onClick={() => navigate("/onboarding")}
          size="lg"
          className="px-8 py-6 text-lg font-light bg-primary hover:bg-primary/90 glow-primary transition-all duration-300 hover:scale-105"
        >
          Start Onboarding
        </Button>
      </div>
    </div>
  );
};

export default Index;
