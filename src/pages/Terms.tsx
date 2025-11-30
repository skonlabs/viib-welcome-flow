import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@/icons";
import { Link } from "react-router-dom";

const Terms = () => {
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
                  Terms of Service
                </span>
              </h1>
              <p className="text-muted-foreground text-lg">
                Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="space-y-8 text-muted-foreground">
              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Agreement to Terms</h2>
                <p>
                  By accessing or using ViiB, you agree to be bound by these Terms of Service and all applicable 
                  laws and regulations. If you do not agree with any of these terms, you are prohibited from using 
                  or accessing this application.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Use License</h2>
                <p>
                  Permission is granted to temporarily access ViiB for personal, non-commercial use only. 
                  This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Modify or copy the materials</li>
                  <li>Use the materials for any commercial purpose or for any public display</li>
                  <li>Attempt to reverse engineer any software contained in ViiB</li>
                  <li>Remove any copyright or other proprietary notations from the materials</li>
                  <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">User Account</h2>
                <p>
                  When you create an account with us, you must provide accurate, complete, and current information. 
                  Failure to do so constitutes a breach of the Terms, which may result in immediate termination of 
                  your account.
                </p>
                <p>
                  You are responsible for safeguarding the password that you use to access the service and for any 
                  activities or actions under your password.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Content</h2>
                <p>
                  Our service allows you to interact with and receive personalized content recommendations. You are 
                  responsible for the content that you share through the service, including its legality, reliability, 
                  and appropriateness.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Intellectual Property</h2>
                <p>
                  The service and its original content, features, and functionality are and will remain the exclusive 
                  property of ViiB and its licensors. The service is protected by copyright, trademark, and other laws 
                  of both the United States and foreign countries.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Limitation of Liability</h2>
                <p>
                  In no event shall ViiB, nor its directors, employees, partners, agents, suppliers, or affiliates, 
                  be liable for any indirect, incidental, special, consequential or punitive damages, including without 
                  limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your 
                  access to or use of or inability to access or use the service.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Changes to Terms</h2>
                <p>
                  We reserve the right, at our sole discretion, to modify or replace these Terms at any time. 
                  If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Contact Us</h2>
                <p>
                  If you have any questions about these Terms, please contact us at:{" "}
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

export default Terms;
