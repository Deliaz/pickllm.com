'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Key, Play, AlertCircle, Settings, ChevronDown, ChevronUp, List, RotateCcw, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_MODELS } from '@/constants/models';
import { cn } from '@/lib/utils';

interface ModelResult {
  model: string;
  response: string;
  tokens: number;
  promptTokens: number;
  completionTokens: number;
  price: number;
  inputPrice: number;
  outputPrice: number;
  responseTime: number;
  error?: string;
}

interface ModelState {
  enabled: boolean;
  loading: boolean;
  result: ModelResult | null;
  startTime: number;
}

interface AdvancedSettings {
  temperature: number;
  topP: number;
  maxTokens: number;
  useDefaultTemperature: boolean;
  useDefaultTopP: boolean;
  useDefaultMaxTokens: boolean;
}

const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  temperature: 0.7,
  topP: 1.0,
  maxTokens: 1024,
  useDefaultTemperature: true,
  useDefaultTopP: true,
  useDefaultMaxTokens: true
};

// Structured Data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "PickLLM",
  "description": "Compare responses from different OpenAI models side by side with PickLLM. Test GPT-4, GPT-3.5, and other models to find the best AI for your needs.",
  "url": "https://pickllm.com",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Web Browser",
  "author": {
    "@type": "Person",
    "name": "Denis Leonov",
    "url": "https://x.com/d3liaz"
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "featureList": [
    "Compare multiple OpenAI models simultaneously",
    "Side-by-side response comparison",
    "Advanced model configuration",
    "Real-time response timing",
    "Custom model selection"
  ]
};

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is PickLLM?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "PickLLM is a single-page app that lets you compare responses from multiple OpenAI models side by side. You enter a prompt, and the selected models generate responses in parallel. To use the tool, you must provide your own OpenAI API key."
      }
    },
    {
      "@type": "Question", 
      "name": "What models are supported?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "By default, PickLLM loads 9 OpenAI models including gpt-4o, gpt-4o-mini, gpt-3.5-turbo, and others. You can fully customize the list in Advanced Settings to add or remove models as needed."
      }
    },
    {
      "@type": "Question",
      "name": "Can I compare multiple models at once?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. There is no hardcoded limit. The default setup compares 9 models, but you can freely add or remove any number of models depending on your needs."
      }
    },
    {
      "@type": "Question",
      "name": "Is my API key safe?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Your API key is stored only in your browser's local storage and is never saved on any server. All requests are proxied through Next.js API routes for security, but your key is only used to make direct requests to OpenAI servers."
      }
    }
  ]
};

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');
  const [saveToLocalStorage, setSaveToLocalStorage] = useState(true);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isModelsModalOpen, setIsModelsModalOpen] = useState(false);
  const [customModels, setCustomModels] = useState<string[]>(DEFAULT_MODELS);
  const [tempModelsText, setTempModelsText] = useState('');
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>(DEFAULT_ADVANCED_SETTINGS);
  const [modelPrices, setModelPrices] = useState<Record<string, any>>({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalInputPrice, setTotalInputPrice] = useState(0);
  const [totalOutputPrice, setTotalOutputPrice] = useState(0);

  const [sortBy, setSortBy] = useState<'default' | 'time' | 'price' | 'tokens'>('default');
  
  const [modelStates, setModelStates] = useState<Record<string, ModelState>>(() => {
    const initialStates: Record<string, ModelState> = {};
    DEFAULT_MODELS.forEach(model => {
      initialStates[model] = {
        enabled: true,
        loading: false,
        result: null,
        startTime: 0
      };
    });
    return initialStates;
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openai-api-key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }

    const savedModels = localStorage.getItem('custom-models');
    if (savedModels) {
      try {
        const models = JSON.parse(savedModels);
        setCustomModels(models);
        
        // Update model states for custom models
        const newStates: Record<string, ModelState> = {};
        models.forEach((model: string) => {
          newStates[model] = {
            enabled: true,
            loading: false,
            result: null,
            startTime: 0
          };
        });
        setModelStates(newStates);
      } catch (error) {
        console.error('Failed to parse saved models:', error);
      }
    }

    const savedAdvancedSettings = localStorage.getItem('advanced-settings');
    if (savedAdvancedSettings) {
      try {
        const settings = JSON.parse(savedAdvancedSettings);
        setAdvancedSettings({ ...DEFAULT_ADVANCED_SETTINGS, ...settings });
      } catch (error) {
        console.error('Failed to parse saved advanced settings:', error);
      }
    }
  }, []);

  // Fetch model prices once on mount
  useEffect(() => {
    const loadPrices = async () => {
      try {
        const res = await fetch('/api/model-prices');
        const data = await res.json();
        setModelPrices(data);
      } catch (e) {
        console.error('Failed to load model prices', e);
      }
    };
    loadPrices();
  }, []);

  // Save advanced settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('advanced-settings', JSON.stringify(advancedSettings));
  }, [advancedSettings]);

  const handleSaveApiKey = () => {
    setApiKey(tempApiKey);
    if (saveToLocalStorage) {
      localStorage.setItem('openai-api-key', tempApiKey);
    } else {
      localStorage.removeItem('openai-api-key');
    }
    setIsApiKeyModalOpen(false);
    setTempApiKey('');
  };

  const handleOpenApiKeyModal = () => {
    setTempApiKey(apiKey);
    setIsApiKeyModalOpen(true);
  };

  const handleOpenModelsModal = () => {
    setTempModelsText(customModels.join('\n'));
    setIsModelsModalOpen(true);
  };

  const handleSaveModels = () => {
    const models = tempModelsText
      .split('\n')
      .map(model => model.trim())
      .filter(model => model.length > 0);
    
    if (models.length === 0) {
      toast.error('Please enter at least one model');
      return;
    }

    setCustomModels(models);
    localStorage.setItem('custom-models', JSON.stringify(models));
    
    // Update model states for new models
    const newStates: Record<string, ModelState> = {};
    models.forEach(model => {
      newStates[model] = modelStates[model] || {
        enabled: true,
        loading: false,
        result: null,
        startTime: 0
      };
    });
    setModelStates(newStates);
    
    setIsModelsModalOpen(false);
    toast.success(`Updated to ${models.length} models`);
  };

  const handleResetModels = () => {
    setTempModelsText(DEFAULT_MODELS.join('\n'));
  };

  const handleResetToDefaults = () => {
    setCustomModels(DEFAULT_MODELS);
    localStorage.removeItem('custom-models');
    
    // Reset model states to defaults
    const newStates: Record<string, ModelState> = {};
    DEFAULT_MODELS.forEach(model => {
      newStates[model] = {
        enabled: true,
        loading: false,
        result: null,
        startTime: 0
      };
    });
    setModelStates(newStates);
    
    setIsModelsModalOpen(false);
    toast.success('Reset to default models');
  };

  const handleToggleModel = (model: string, enabled: boolean) => {
    setModelStates(prev => ({
      ...prev,
      [model]: { ...prev[model], enabled }
    }));
  };

  const handleAdvancedSettingChange = (key: keyof AdvancedSettings, value: number | boolean) => {
    setAdvancedSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleUseDefaultChange = (paramKey: 'temperature' | 'topP' | 'maxTokens', useDefault: boolean) => {
    const defaultKey = `useDefault${paramKey.charAt(0).toUpperCase() + paramKey.slice(1)}` as keyof AdvancedSettings;
    
    setAdvancedSettings(prev => ({
      ...prev,
      [defaultKey]: useDefault,
      // Reset to default value when "Use Default" is checked
      ...(useDefault && { [paramKey]: DEFAULT_ADVANCED_SETTINGS[paramKey] })
    }));
  };

  const handleRun = async () => {
    if (!prompt.trim() || !apiKey) return;

    const enabledModels = customModels.filter(model => modelStates[model]?.enabled);
    if (enabledModels.length === 0) return;

    setIsRunning(true);
    setTotalPrice(0);
    setTotalInputPrice(0);
    setTotalOutputPrice(0);
    let runTotalPrice = 0;
    let runInputPrice = 0;
    let runOutputPrice = 0;

    // Initialize loading states
    const newStates = { ...modelStates };
    enabledModels.forEach(model => {
      newStates[model] = {
        ...newStates[model],
        loading: true,
        result: null,
        startTime: Date.now()
      };
    });
    setModelStates(newStates);

    // Prepare API parameters - only include non-default values
    const apiParams: any = {
      prompt,
      model: '', // Will be set per model
      apiKey
    };

    if (!advancedSettings.useDefaultTemperature) {
      apiParams.temperature = advancedSettings.temperature;
    }
    if (!advancedSettings.useDefaultTopP) {
      apiParams.topP = advancedSettings.topP;
    }
    if (!advancedSettings.useDefaultMaxTokens) {
      apiParams.maxTokens = advancedSettings.maxTokens;
    }

    // Run requests for all enabled models
    const promises = enabledModels.map(async (model) => {
      try {
        const response = await fetch('/api/openai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...apiParams,
            model
          }),
        });

        const data = await response.json();
        const endTime = Date.now();
        const responseTime = (endTime - newStates[model].startTime) / 1000;

        if (response.ok) {
          const priceInfo = modelPrices[model];
          const inputPrice = priceInfo
            ? data.promptTokens * priceInfo.input_cost_per_token
            : 0;
          const outputPrice = priceInfo
            ? data.completionTokens * priceInfo.output_cost_per_token
            : 0;
          const price = inputPrice + outputPrice;
          runTotalPrice += price;
          runInputPrice += inputPrice;
          runOutputPrice += outputPrice;
          setModelStates(prev => ({
            ...prev,
            [model]: {
              ...prev[model],
              loading: false,
              result: {
                model,
                response: data.response,
                tokens: data.totalTokens,
                promptTokens: data.promptTokens,
                completionTokens: data.completionTokens,
                price,
                inputPrice,
                outputPrice,
                responseTime
              }
            }
          }));
        } else {
          // Show detailed error toast
          const errorMessage = data.error || 'Unknown error occurred';
          toast.error(`${model} Error`, {
            description: errorMessage,
            duration: 5000,
          });

          setModelStates(prev => ({
            ...prev,
            [model]: {
              ...prev[model],
              loading: false,
              result: {
                model,
                response: '',
                tokens: 0,
                promptTokens: 0,
                completionTokens: 0,
                price: 0,
                inputPrice: 0,
                outputPrice: 0,
                responseTime,
                error: errorMessage
              }
            }
          }));
        }
      } catch (error) {
        const endTime = Date.now();
        const responseTime = (endTime - newStates[model].startTime) / 1000;
        const errorMessage = 'Network error - please check your connection';
        
        toast.error(`${model} Network Error`, {
          description: errorMessage,
          duration: 5000,
        });
        
        setModelStates(prev => ({
          ...prev,
          [model]: {
            ...prev[model],
            loading: false,
            result: {
              model,
              response: '',
              tokens: 0,
              promptTokens: 0,
              completionTokens: 0,
              price: 0,
              inputPrice: 0,
              outputPrice: 0,
              responseTime,
              error: errorMessage
            }
          }
        }));
      }
    });

    await Promise.all(promises);
    setTotalPrice(runTotalPrice);
    setTotalInputPrice(runInputPrice);
    setTotalOutputPrice(runOutputPrice);
    setIsRunning(false);
  };

  const LoadingTimer = ({ startTime }: { startTime: number }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
      // Don't start the timer if startTime is not properly set (0 or invalid)
      if (!startTime || startTime <= 0) {
        setElapsed(0);
        return;
      }

      const interval = setInterval(() => {
        const now = Date.now();
        const elapsedTime = Math.max(0, (now - startTime) / 1000);
        setElapsed(elapsedTime);
      }, 100);

      return () => clearInterval(interval);
    }, [startTime]);

    return (
      <div className="flex items-center justify-center space-x-3 text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-3xl font-bold">{elapsed.toFixed(1)}s</span>
      </div>
    );
  };

  const RunButton = () => {
    const isDisabled = !apiKey || isRunning;
    
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <span className="inline-block">
              <Button
                onClick={handleRun}
                disabled={isDisabled}
                className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Play className="h-4 w-4 mr-2" />
                {isRunning ? 'Running...' : 'Run'}
              </Button>
            </span>
          </TooltipTrigger>
          {isDisabled && <TooltipContent className="max-w-sm p-4">
            <p className="text-sm">
              Your OpenAI API key is required to run model comparison. The key is not being shared with anyone nor stored on the backend. Learn more where to find your key{' '}
              <a 
                href="https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 underline"
              >
                here
              </a>
            </p>
          </TooltipContent>}
        </Tooltip>
      </TooltipProvider>
    );
  
  };

  const sortedModels = (() => {
    const models = [...customModels];
    if (sortBy === 'default') return models;
    const getValue = (model: string) => {
      const result = modelStates[model]?.result;
      if (!result) return Number.POSITIVE_INFINITY;
      switch (sortBy) {
        case 'time':
          return result.responseTime;
        case 'price':
          return result.price;
        case 'tokens':
          return result.tokens;
        default:
          return Number.POSITIVE_INFINITY;
      }
    };
    return models.sort((a, b) => getValue(a) - getValue(b));
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Head>
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(faqStructuredData)}
        </script>
      </Head>
      {/* Hero Header with Background */}
      <header 
        className="relative bg-cover bg-center bg-no-repeat"
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-purple-900/70 to-blue-900/80"></div>
        
        {/* Header Content */}
        <div className="relative z-10 px-4 py-10">
          <div className="max-w-7xl mx-auto text-center">
            <div className="mb-4">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
                <span className="bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                  PickLLM
                </span>
                <span className="block text-2xl md:text-3xl mt-1">
                  OpenAI Model Results Comparison Tool
                </span>
              </h1>
              <div className="w-20 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto rounded-full"></div>
            </div>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
              Compare responses from different OpenAI models side by side. Enter your prompt and see how each model responds.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {/* Input Section */}
        <section className="mb-8 -mt-8 relative z-20" aria-labelledby="prompt-section">
          <h2 id="prompt-section" className="sr-only">Prompt Input Section</h2>
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="prompt" className="text-sm font-medium mb-2 block">
                    Enter your prompt
                  </Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="What would you like to ask the models?"
                    className="text-base"
                    rows={3}
                    disabled={isRunning}
                    aria-describedby="prompt-help"
                  />
                  <div id="prompt-help" className="sr-only">
                    Enter a prompt to compare responses across multiple OpenAI models
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <RunButton />
                  <Dialog open={isApiKeyModalOpen} onOpenChange={setIsApiKeyModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant={apiKey ? "outline" : "destructive"}
                        onClick={handleOpenApiKeyModal}
                        className={cn("h-12 px-6", !apiKey && "animate-pulse-border")}
                        aria-describedby="api-key-help"
                      >
                        <Key className="h-4 w-4 mr-2" />
                        {apiKey ? 'Change API Key' : 'Set API Key'}
                      </Button>
                    </DialogTrigger>
                    <div id="api-key-help" className="sr-only">
                      OpenAI API key required to use the comparison tool
                    </div>
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
                            onCheckedChange={(checked) => setSaveToLocalStorage(checked as boolean)}
                          />
                          <Label htmlFor="save-localStorage" className="text-sm">
                            Save key to localStorage
                          </Label>
                        </div>
                        <Button onClick={handleSaveApiKey} className="w-full">
                          Save API Key
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
            <div className="px-6 pb-4 text-sm text-muted-foreground">
              {totalPrice > 0
                ? `Total price: $${totalPrice.toFixed(6)} (input ${totalInputPrice.toFixed(6)} + output ${totalOutputPrice.toFixed(6)})`
                : 'Run your prompt to evaluate the total cost'}
            </div>
          </Card>
        </section>

        {/* Advanced Settings */}
        <section className="mb-8" aria-labelledby="advanced-settings">
          <h2 id="advanced-settings" className="sr-only">Advanced Settings</h2>
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <Settings className="h-4 w-4" />
                Advanced Settings
                {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Set Models Button */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Models Configuration</Label>
                      <Dialog open={isModelsModalOpen} onOpenChange={setIsModelsModalOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" onClick={handleOpenModelsModal} className="w-full">
                            <List className="h-4 w-4 mr-2" />
                            Set Models ({customModels.length})
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Configure Models</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="models">Models (one per line)</Label>
                              <Textarea
                                id="models"
                                value={tempModelsText}
                                onChange={(e) => setTempModelsText(e.target.value)}
                                placeholder="gpt-4o&#10;gpt-4o-mini&#10;gpt-3.5-turbo"
                                className="mt-1 min-h-[200px] font-mono text-sm"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={handleResetModels} variant="outline" className="flex-1">
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reset
                              </Button>
                              <Button onClick={handleResetToDefaults} variant="outline" className="flex-1">
                                Defaults
                              </Button>
                            </div>
                            <Button onClick={handleSaveModels} className="w-full">
                              Save Models
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Temperature */}
                    <div className="space-y-2">
                      <Label htmlFor="temperature" className="text-sm font-medium">
                        Temperature
                      </Label>
                      <div className="space-y-2">
                        <Input
                          id="temperature"
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          value={advancedSettings.temperature}
                          onChange={(e) => handleAdvancedSettingChange('temperature', parseFloat(e.target.value) || 0)}
                          className="w-full"
                          disabled={advancedSettings.useDefaultTemperature}
                        />
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="use-default-temperature"
                            checked={advancedSettings.useDefaultTemperature}
                            onCheckedChange={(checked) => handleUseDefaultChange('temperature', checked as boolean)}
                          />
                          <Label htmlFor="use-default-temperature" className="text-xs text-muted-foreground">
                            Use Default
                          </Label>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Controls randomness (0-2)</p>
                    </div>

                    {/* Top P */}
                    <div className="space-y-2">
                      <Label htmlFor="topP" className="text-sm font-medium">
                        Top P
                      </Label>
                      <div className="space-y-2">
                        <Input
                          id="topP"
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={advancedSettings.topP}
                          onChange={(e) => handleAdvancedSettingChange('topP', parseFloat(e.target.value) || 0)}
                          className="w-full"
                          disabled={advancedSettings.useDefaultTopP}
                        />
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="use-default-topP"
                            checked={advancedSettings.useDefaultTopP}
                            onCheckedChange={(checked) => handleUseDefaultChange('topP', checked as boolean)}
                          />
                          <Label htmlFor="use-default-topP" className="text-xs text-muted-foreground">
                            Use Default
                          </Label>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Nucleus sampling (0-1)</p>
                    </div>

                    {/* Max Tokens */}
                    <div className="space-y-2">
                      <Label htmlFor="maxTokens" className="text-sm font-medium">
                        Max Tokens
                      </Label>
                      <div className="space-y-2">
                        <Input
                          id="maxTokens"
                          type="number"
                          min="1"
                          max="4096"
                          value={advancedSettings.maxTokens}
                          onChange={(e) => handleAdvancedSettingChange('maxTokens', parseInt(e.target.value) || 1)}
                          className="w-full"
                          disabled={advancedSettings.useDefaultMaxTokens}
                        />
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="use-default-maxTokens"
                            checked={advancedSettings.useDefaultMaxTokens}
                            onCheckedChange={(checked) => handleUseDefaultChange('maxTokens', checked as boolean)}
                          />
                          <Label htmlFor="use-default-maxTokens" className="text-xs text-muted-foreground">
                            Use Default
                          </Label>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Maximum response length</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </section>

        <div className="flex justify-end mb-4 items-center gap-2">
          <Label htmlFor="sortBy" className="text-sm">Sort results by</Label>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <SelectTrigger id="sortBy" className="w-[150px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Model</SelectItem>
              <SelectItem value="time">Time</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="tokens">Tokens</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Grid - Masonry Style */}
        <h2 id="results-section" className="sr-only">Model Comparison Results</h2>
        <section className="columns-1 md:columns-2 lg:columns-3 xl:columns-3 gap-6 space-y-6" aria-labelledby="results-section">
          {sortedModels.map((model: string) => {
            const state = modelStates[model];
            if (!state) return null;
            
            return (
              <Card key={model} className={cn("relative break-inside-avoid transition-all duration-300 bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl", {'opacity-50': !state.enabled})}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">
                      {model}
                      {!state.enabled && <span className="text-gray-500 text-sm ml-2 font-normal">disabled</span>}
                    </h3>
                    <Checkbox
                      checked={state.enabled}
                      onCheckedChange={(checked) => handleToggleModel(model, checked as boolean)}
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
                                <p className="mt-1 text-xs text-red-500">{state.result.error}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="prose prose-sm max-w-none max-h-[200px] overflow-y-auto ">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {state.result.response}
                              </p>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                              <span>{state.result.tokens} tokens</span>
                              <span>${state.result.price.toFixed(6)}</span>
                              <span>{state.result.responseTime.toFixed(2)}s</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    
                    {!state.loading && !state.result && state.enabled && (
                      <div className="flex-1 flex items-center justify-center text-muted-foreground py-8">
                        <p className="text-sm">Ready to run</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                
                {/* Loading Overlay */}
                {state.loading && (
                  <div className="absolute inset-0 bg-black/80 rounded-lg flex items-center justify-center z-10">
                    <LoadingTimer startTime={state.startTime} />
                  </div>
                )}
              </Card>
            );
          })}
        </section>

        {/* FAQ Section */}
        <section className="mt-16" aria-labelledby="faq-heading">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <h2 id="faq-heading" className="text-2xl font-bold flex items-center gap-2">
                🧠 FAQ: PickLLM OpenAI Model Results Comparison
              </h2>
            </CardHeader>
            <CardContent>
              <dl className="space-y-8">
                {/* What is this tool */}
                <div itemScope itemType="https://schema.org/Question">
                  <dt>
                    <h3 className="text-lg font-semibold mb-2" itemProp="name">What is PickLLM?</h3>
                  </dt>
                  <dd itemScope itemType="https://schema.org/Answer" itemProp="acceptedAnswer">
                    <div itemProp="text">
                      <p className="text-muted-foreground leading-relaxed">
                        PickLLM is a single-page app that lets you <strong>compare responses from multiple OpenAI models side by side</strong>. You enter a prompt, and the selected models generate responses in parallel.
                      </p>
                      <p className="text-muted-foreground leading-relaxed mt-2">
                        To use the tool, you must provide your <strong>own OpenAI API key</strong>. Your key is stored only in your browser&apos;s local storage and is never saved on any server. Requests are proxied through Next.js API routes for security, but your key is only used to make direct requests to OpenAI servers.
                      </p>
                    </div>
                  </dd>
                </div>

                {/* What models are supported */}
                <div itemScope itemType="https://schema.org/Question">
                  <dt>
                    <h3 className="text-lg font-semibold mb-2" itemProp="name">What models are supported?</h3>
                  </dt>
                  <dd itemScope itemType="https://schema.org/Answer" itemProp="acceptedAnswer">
                    <div itemProp="text">
                      <p className="text-muted-foreground leading-relaxed mb-2">
                        By default, PickLLM loads the following 9 models:
                      </p>
                      <div className="bg-muted p-3 rounded-lg font-mono text-xs" role="list" aria-label="Default OpenAI models">
                        {DEFAULT_MODELS.map((model, index) => (
                          <div key={model} role="listitem">&apos;{model}&apos;{index < DEFAULT_MODELS.length - 1 ? ',' : ''}</div>
                        ))}
                      </div>
                      <p className="text-muted-foreground leading-relaxed mt-2">
                        However, you can fully customize the list in <strong>Advanced Settings</strong> — add or remove models as needed.
                      </p>
                    </div>
                  </dd>
                </div>

                {/* Can I compare multiple models */}
                <div itemScope itemType="https://schema.org/Question">
                  <dt>
                    <h3 className="text-lg font-semibold mb-2" itemProp="name">Can I compare multiple models at once?</h3>
                  </dt>
                  <dd itemScope itemType="https://schema.org/Answer" itemProp="acceptedAnswer">
                    <p className="text-muted-foreground leading-relaxed" itemProp="text">
                      Yes. There is <strong>no hardcoded limit</strong>. The default setup compares 9 models, but you can freely add or remove any number of models depending on your needs.
                    </p>
                  </dd>
                </div>

                {/* Advanced settings */}
                <div itemScope itemType="https://schema.org/Question">
                  <dt>
                    <h3 className="text-lg font-semibold mb-2" itemProp="name">What advanced settings are available?</h3>
                  </dt>
                  <dd itemScope itemType="https://schema.org/Answer" itemProp="acceptedAnswer">
                    <div itemProp="text">
                      <p className="text-muted-foreground leading-relaxed mb-2">
                        You can optionally set per-model configuration:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4" role="list">
                        <li role="listitem"><strong>Temperature</strong> (0–2): Controls response randomness.</li>
                        <li role="listitem"><strong>Top P</strong> (0–1): Controls nucleus sampling.</li>
                        <li role="listitem"><strong>Max Tokens</strong> (default 1024): Caps the response length.</li>
                      </ul>
                      <p className="text-muted-foreground leading-relaxed mt-2">
                        Only some models support temperature and top_p — others will ignore those values.
                      </p>
                    </div>
                  </dd>
                </div>

                {/* Which models support advanced settings */}
                <div itemScope itemType="https://schema.org/Question">
                  <dt>
                    <h3 className="text-lg font-semibold mb-2" itemProp="name">Which models support advanced settings?</h3>
                  </dt>
                  <dd itemScope itemType="https://schema.org/Answer" itemProp="acceptedAnswer">
                    <div itemProp="text">
                      <p className="text-muted-foreground leading-relaxed mb-2">
                        The following models support both <code className="bg-muted px-1 rounded">temperature</code> and <code className="bg-muted px-1 rounded">top_p</code>:
                      </p>
                      <div className="bg-muted p-3 rounded-lg font-mono text-xs">
                        [&apos;gpt-4.1&apos;, &apos;gpt-4.1-mini&apos;, &apos;gpt-4.1-nano&apos;, &apos;gpt-4o&apos;, &apos;gpt-4o-mini&apos;]
                      </div>
                      <p className="text-muted-foreground leading-relaxed mt-2">
                        Other models (e.g., <code className="bg-muted px-1 rounded">o1</code>, <code className="bg-muted px-1 rounded">o3-mini</code>, <code className="bg-muted px-1 rounded">o4-mini</code>) only support <code className="bg-muted px-1 rounded">max_completion_tokens</code>.
                      </p>
                    </div>
                  </dd>
                </div>

                {/* API key safety */}
                <div itemScope itemType="https://schema.org/Question">
                  <dt>
                    <h3 className="text-lg font-semibold mb-2" itemProp="name">Is my API key safe?</h3>
                  </dt>
                  <dd itemScope itemType="https://schema.org/Answer" itemProp="acceptedAnswer">
                    <p className="text-muted-foreground leading-relaxed" itemProp="text">
                      Yes. Your API key is stored only in your browser&apos;s local storage and is never saved on any server. All requests are proxied through Next.js API routes for security, but your key is only used to make direct requests to OpenAI servers.
                    </p>
                  </dd>
                </div>

                {/* Who is this for */}
                <div itemScope itemType="https://schema.org/Question">
                  <dt>
                    <h3 className="text-lg font-semibold mb-2" itemProp="name">Who is PickLLM for?</h3>
                  </dt>
                  <dd itemScope itemType="https://schema.org/Answer" itemProp="acceptedAnswer">
                    <div itemProp="text">
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4" role="list">
                        <li role="listitem">Prompt engineers testing variations</li>
                        <li role="listitem">AI product teams benchmarking models</li>
                        <li role="listitem">Developers exploring behavior differences</li>
                        <li role="listitem">Hobbyists experimenting with prompt design</li>
                      </ul>
                    </div>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="mt-16 pb-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Made by{' '}
              <a 
                href="https://x.com/d3liaz" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline font-medium transition-colors"
                aria-label="Denis Leonov on X (Twitter)"
              >
                Denis L
              </a>
              {' • '}
              <a 
                href="https://github.com/Deliaz/pickllm.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline font-medium transition-colors"
                aria-label="PickLLM source code on GitHub"
              >
                Source Code
              </a>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}