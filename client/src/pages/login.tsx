import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Code, Cpu, BarChart3 } from "lucide-react";

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
              Dev Team Platform
            </h1>
            <p className="text-xl text-gray-400">
              AI-powered development orchestration platform
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-surface rounded-lg border border-gray-700">
              <Users className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold text-gray-100 mb-1">AI Dev Agents</h3>
              <p className="text-sm text-gray-400">
                Specialized agents for frontend, backend, QA, and DevOps
              </p>
            </div>
            
            <div className="p-4 bg-surface rounded-lg border border-gray-700">
              <Code className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold text-gray-100 mb-1">Project Management</h3>
              <p className="text-sm text-gray-400">
                Coordinate development projects across multiple agents
              </p>
            </div>
            
            <div className="p-4 bg-surface rounded-lg border border-gray-700">
              <Cpu className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold text-gray-100 mb-1">Agent Orchestration</h3>
              <p className="text-sm text-gray-400">
                Automated workflow coordination between development agents
              </p>
            </div>
            
            <div className="p-4 bg-surface rounded-lg border border-gray-700">
              <BarChart3 className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold text-gray-100 mb-1">Development Analytics</h3>
              <p className="text-sm text-gray-400">
                Track progress, productivity, and code quality metrics
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Full-stack development with AI-powered code generation</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Project templates and automated deployment pipelines</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Real-time agent collaboration and task monitoring</span>
            </div>
          </div>
        </div>

        {/* Right side - Login Card */}
        <div className="flex justify-center lg:justify-end">
          <Card className="w-full max-w-md bg-surface border-gray-700">
            <CardHeader className="text-center">
              <CardTitle className="text-gray-100">Welcome Back</CardTitle>
              <CardDescription className="text-gray-400">
                Sign in to access your development command center
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