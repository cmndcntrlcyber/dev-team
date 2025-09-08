import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Zap, Target, BarChart3 } from "lucide-react";

export default function Login() {
  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding and Features */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gray-100">
              Attack Node
            </h1>
            <p className="text-xl text-gray-400">
              Multi-agent security platform for penetration testing
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-surface rounded-lg border border-gray-700">
              <Shield className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold text-gray-100 mb-1">AI Agents</h3>
              <p className="text-sm text-gray-400">
                Automated vulnerability analysis with OpenAI and Anthropic
              </p>
            </div>
            
            <div className="p-4 bg-surface rounded-lg border border-gray-700">
              <Target className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold text-gray-100 mb-1">Program Tracking</h3>
              <p className="text-sm text-gray-400">
                Manage bug bounty programs from HackerOne, Bugcrowd, and more
              </p>
            </div>
            
            <div className="p-4 bg-surface rounded-lg border border-gray-700">
              <Zap className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold text-gray-100 mb-1">Agent Loops</h3>
              <p className="text-sm text-gray-400">
                Iterative payload refinement until POCs are functional
              </p>
            </div>
            
            <div className="p-4 bg-surface rounded-lg border border-gray-700">
              <BarChart3 className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold text-gray-100 mb-1">Analytics</h3>
              <p className="text-sm text-gray-400">
                Track earnings, response times, and vulnerability trends
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Docker integration with Burp Suite Professional and Kali Linux</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Personal file management at /home/{`{username}`}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Real-time agent loop monitoring and control</span>
            </div>
          </div>
        </div>

        {/* Right side - Login Card */}
        <div className="flex justify-center lg:justify-end">
          <Card className="w-full max-w-md bg-surface border-gray-700">
            <CardHeader className="text-center">
              <CardTitle className="text-gray-100">Welcome Back</CardTitle>
              <CardDescription className="text-gray-400">
                Sign in to access your security testing command center
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleGoogleLogin}
                className="w-full bg-primary hover:bg-primary/90 text-white"
                size="lg"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
              
              <div className="text-xs text-gray-500 text-center">
                Secure authentication powered by Google OAuth.
                Your data stays private and encrypted.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}