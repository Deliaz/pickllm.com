"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Key, Play, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// List of OpenAI models available for comparison
const MODELS = [
  "gpt-4-turbo",
  "gpt-4o",
  "gpt-4o-2024-05-13",
  "gpt-3.5-turbo-0125",
] as const;

interface ModelResult {
  model: string;
  response: string;
  tokens: number;
  responseTime: number;
  error?: string;
}

interface ModelState {
  enabled: boolean;
  loading: boolean;
  result: ModelResult | null;
  startTime: number;
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [tempApiKey, setTempApiKey] = useState("");
  const [saveToLocalStorage, setSaveToLocalStorage] = useState(true);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [modelStates, setModelStates] = useState<Record<string, ModelState>>(
    () => {
      const initialStates: Record<string, ModelState> = {};
      MODELS.forEach((model) => {
        initialStates[model] = {
          enabled: true,
          loading: false,
          result: null,
          startTime: 0,
        };
      });
      return initialStates;
    },
  );

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("openai-api-key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  const handleSaveApiKey = () => {
    setApiKey(tempApiKey);
    if (saveToLocalStorage) {
      localStorage.setItem("openai-api-key", tempApiKey);
    } else {
      localStorage.removeItem("openai-api-key");
    }
    setIsApiKeyModalOpen(false);
    setTempApiKey("");
  };

  const handleOpenApiKeyModal = () => {
    setTempApiKey(apiKey);
    setIsApiKeyModalOpen(true);
  };

  const handleToggleModel = (model: string, enabled: boolean) => {
    setModelStates((prev) => ({
      ...prev,
      [model]: { ...prev[model], enabled },
    }));
  };

  const handleRun = async () => {
    if (!prompt.trim() || !apiKey) return;

    const enabledModels = MODELS.filter((model) => modelStates[model].enabled);
    if (enabledModels.length === 0) return;

    setIsRunning(true);

    // Initialize loading states
    const newStates = { ...modelStates };
    enabledModels.forEach((model) => {
      newStates[model] = {
        ...newStates[model],
        loading: true,
        result: null,
        startTime: Date.now(),
      };
    });
    setModelStates(newStates);

    // Run requests for all enabled models
    const promises = enabledModels.map(async (model) => {
      try {
        const response = await fetch("/api/openai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            model,
            apiKey,
          }),
        });

        const data = await response.json();
        const endTime = Date.now();
        const responseTime = (endTime - newStates[model].startTime) / 1000;

        if (response.ok) {
          setModelStates((prev) => ({
            ...prev,
            [model]: {
              ...prev[model],
              loading: false,
              result: {
                model,
                response: data.response,
                tokens: data.tokens,
                responseTime,
              },
            },
          }));
        } else {
          // Show detailed error toast
          const errorMessage = data.error || "Unknown error occurred";
          toast.error(`${model} Error`, {
            description: errorMessage,
            duration: 5000,
          });

          setModelStates((prev) => ({
            ...prev,
            [model]: {
              ...prev[model],
              loading: false,
              result: {
                model,
                response: "",
                tokens: 0,
                responseTime,
                error: errorMessage,
              },
            },
          }));
        }
      } catch (error) {
        const endTime = Date.now();
        const responseTime = (endTime - newStates[model].startTime) / 1000;
        const errorMessage = "Network error - please check your connection";

        toast.error(`${model} Network Error`, {
          description: errorMessage,
          duration: 5000,
        });

        setModelStates((prev) => ({
          ...prev,
          [model]: {
            ...prev[model],
            loading: false,
            result: {
              model,
              response: "",
              tokens: 0,
              responseTime,
              error: errorMessage,
            },
          },
        }));
      }
    });

    await Promise.all(promises);
    setIsRunning(false);
  };

  const LoadingTimer = ({ startTime }: { startTime: number }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setElapsed((Date.now() - startTime) / 1000);
      }, 100);

      return () => clearInterval(interval);
    }, [startTime]);

    return (
      <div className="flex items-center justify-center space-x-3 text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-2xl font-bold">{elapsed.toFixed(1)}s</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            OpenAI Model Comparison
          </h1>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto">
            Compare responses from different OpenAI models side by side. Enter
            your prompt and see how each model responds.
          </p>
        </div>

        {/* Input Section */}
        <div className="mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <Label
                    htmlFor="prompt"
                    className="text-sm font-medium mb-2 block"
                  >
                    Enter your prompt
                  </Label>
                  <Input
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="What would you like to ask the models?"
                    className="h-12 text-base"
                    disabled={isRunning}
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Dialog
                    open={isApiKeyModalOpen}
                    onOpenChange={setIsApiKeyModalOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant={apiKey ? "outline" : "destructive"}
                        onClick={handleOpenApiKeyModal}
                        className="h-12 px-6"
                      >
                        <Key className="h-4 w-4 mr-2" />
                        {apiKey ? "API Key Set" : "Set API Key"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>OpenAI API Key</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="apikey">API Key</Label>
                          <Input
                            id="apikey"
                            type="password"
                            value={tempApiKey}
                            onChange={(e) => setTempApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="save-localStorage"
                            checked={saveToLocalStorage}
                            onCheckedChange={(checked) =>
                              setSaveToLocalStorage(checked as boolean)
                            }
                          />
                          <Label
                            htmlFor="save-localStorage"
                            className="text-sm"
                          >
                            Save key to localStorage
                          </Label>
                        </div>
                        <Button onClick={handleSaveApiKey} className="w-full">
                          Save API Key
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    onClick={handleRun}
                    disabled={!prompt.trim() || !apiKey || isRunning}
                    className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isRunning ? "Running..." : "Run"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Grid */}
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {MODELS.map((model) => {
            const state = modelStates[model];
            return (
              <div key={model} className="break-inside-avoid mb-6">
                <Card className="relative transition-all duration-300 bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h3
                        className={`font-semibold text-lg ${!state.enabled ? "text-gray-400" : ""}`}
                      >
                        {model}{" "}
                        {!state.enabled && (
                          <span className="text-gray-400">(disabled)</span>
                        )}
                      </h3>
                      <Checkbox
                        checked={state.enabled}
                        onCheckedChange={(checked) =>
                          handleToggleModel(model, checked as boolean)
                        }
                        disabled={isRunning}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="min-h-[200px] flex flex-col">
                      {!state.loading && state.result && (
                        <div className="space-y-4">
                          {state.result.error ? (
                            <div className="text-red-600 text-sm bg-red-50 p-4 rounded-lg border border-red-200">
                              <div className="flex items-start space-x-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium">Error occurred</p>
                                  <p className="mt-1 text-xs text-red-500">
                                    {state.result.error}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="prose prose-sm max-w-none">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                  {state.result.response}
                                </p>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                                <span>{state.result.tokens} tokens</span>
                                <span>
                                  {state.result.responseTime.toFixed(2)}s
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {!state.loading && !state.result && state.enabled && (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                          <p className="text-sm">Ready to run</p>
                        </div>
                      )}

                      {!state.enabled && (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                          <p className="text-sm">Disabled</p>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  {/* Loading Overlay */}
                  {state.loading && (
                    <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center z-10">
                      <LoadingTimer startTime={state.startTime} />
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
