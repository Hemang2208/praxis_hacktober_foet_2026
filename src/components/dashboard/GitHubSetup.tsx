import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Github, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface GitHubSetupProps {
  onUsernameSet: (username: string) => void;
  currentUsername?: string;
}

export function GitHubSetup({ currentUsername }: GitHubSetupProps) {
  const [username, setUsername] = useState(currentUsername || "");
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<
    "idle" | "validating" | "valid" | "invalid"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const validateUsername = async (githubUsername: string) => {
    if (!githubUsername.trim()) {
      setValidationStatus("idle");
      return;
    }

    setIsValidating(true);
    setValidationStatus("validating");
    setError(null);

    try {
      const response = await fetch(`/api/github/user?username=${githubUsername}`);
      
      if (response.ok) {
        setValidationStatus("valid");
        setError(null);
      } else {
        const errorData = await response.json();
        setValidationStatus("invalid");
        setError(errorData.error || "GitHub user not found");
      }
    } catch (err) {
      setValidationStatus("invalid");
      setError("Failed to validate GitHub username");
      console.error("Error validating username:", err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setValidationStatus("idle");
    setError(null);
    
    // Debounce validation
    if (value.trim()) {
      const timer = setTimeout(() => validateUsername(value), 500);
      return () => clearTimeout(timer);
    }
  };

  const handleSubmit = () => {
  // Always trigger OAuth flow, regardless of username validation
  window.location.href = "/api/github/oauth/start?redirect=/user/github/authorize";
  };

  const getStatusIcon = () => {
    switch (validationStatus) {
      case "validating":
        return <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />;
      case "valid":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "invalid":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (validationStatus) {
      case "valid":
        return "border-green-300 focus:border-green-500 focus:ring-green-500";
      case "invalid":
        return "border-red-300 focus:border-red-500 focus:ring-red-500";
      case "validating":
        return "border-blue-300 focus:border-blue-500 focus:ring-blue-500";
      default:
        return "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-md mx-auto"
    >
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
            <Github className="w-6 h-6 text-slate-600" />
          </div>
          <CardTitle>Connect GitHub Account</CardTitle>
          <CardDescription>
            Enter your GitHub username to sync your repositories and get insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="github-username">GitHub Username</Label>
            <div className="relative">
              <Input
                id="github-username"
                type="text"
                placeholder="Enter your GitHub username"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className={`pr-10 ${getStatusColor()}`}
                disabled={isValidating}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {getStatusIcon()}
              </div>
            </div>
            {validationStatus === "valid" && (
              <p className="text-sm text-green-600 flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" />
                GitHub user found
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleSubmit}
              className="w-full"
            >
              Connect GitHub
            </Button>
            
            <div className="text-center">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Don&apos;t have a GitHub account?
              </a>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-slate-900">What you&apos;ll get:</h4>
            <ul className="space-y-1 text-sm text-slate-600">
              <li className="flex items-center">
                <Badge variant="secondary" className="mr-2 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Stats
                </Badge>
                Repository and commit analytics
              </li>
              <li className="flex items-center">
                <Badge variant="secondary" className="mr-2 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  AI
                </Badge>
                AI-powered code feedback
              </li>
              <li className="flex items-center">
                <Badge variant="secondary" className="mr-2 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Track
                </Badge>
                Real-time activity tracking
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
