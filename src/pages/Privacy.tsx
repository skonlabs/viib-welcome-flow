import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@/icons";
import { Link } from "react-router-dom";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-black text-foreground">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 gradient-ocean opacity-30" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/5 backdrop-blur-xl">
          <div className="container mx-auto px-4 lg:px-8 py-6">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 lg:px-8 py-16 max-w-4xl">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Privacy Policy
                </span>
              </h1>
              <p className="text-muted-foreground text-lg">
                Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="space-y-8 text-muted-foreground">
              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Introduction</h2>
                <p>
                  Welcome to ViiB. We respect your privacy and are committed to protecting your personal data. 
                  This privacy policy will inform you about how we look after your personal data when you visit 
                  our application and tell you about your privacy rights and how the law protects you.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Information We Collect</h2>
                <p>We may collect, use, store and transfer different kinds of personal data about you:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Identity Data including name, username, or similar identifier</li>
                  <li>Contact Data including email address and phone number</li>
                  <li>Technical Data including device type, operating system, and browser type</li>
                  <li>Usage Data including how you use our application and services</li>
                  <li>Preference Data including your viewing preferences and emotional states</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">How We Use Your Information</h2>
                <p>We use your personal data for the following purposes:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>To provide and maintain our service</li>
                  <li>To personalize your content recommendations</li>
                  <li>To communicate with you about updates and features</li>
                  <li>To improve our application and user experience</li>
                  <li>To ensure the security of our service</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Data Security</h2>
                <p>
                  We have implemented appropriate security measures to prevent your personal data from being 
                  accidentally lost, used, or accessed in an unauthorized way. We limit access to your personal 
                  data to those employees, agents, contractors, and other third parties who have a business need to know.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Your Rights</h2>
                <p>Under certain circumstances, you have rights under data protection laws in relation to your personal data:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Request access to your personal data</li>
                  <li>Request correction of your personal data</li>
                  <li>Request erasure of your personal data</li>
                  <li>Object to processing of your personal data</li>
                  <li>Request restriction of processing your personal data</li>
                  <li>Request transfer of your personal data</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Contact Us</h2>
                <p>
                  If you have any questions about this privacy policy or our privacy practices, please contact us at:{" "}
                  <a href="mailto:skonlabs@gmail.com" className="text-primary hover:text-primary/80 transition-colors">
                    skonlabs@gmail.com
                  </a>
                </p>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Privacy;
