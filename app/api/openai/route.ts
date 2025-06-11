import { NextRequest, NextResponse } from 'next/server';
import { TOP_P_SUPPORTED_MODELS, TEMPERATURE_SUPPORTED_MODELS } from '@/constants/models';

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, apiKey, temperature = 0.7, topP = 1.0, maxTokens = 1024 } = await request.json();

    if (!prompt || !model || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, model, and apiKey are required' },
        { status: 400 }
      );
    }
    const params: Record<string, any> = {
        model,
        messages: [
            {
                role: 'user',
                content: prompt
            }
        ],
        max_completion_tokens: parseInt(maxTokens),
    }

    if (TOP_P_SUPPORTED_MODELS.includes(model)) {
      params.top_p = parseFloat(topP);
    }
    if (TEMPERATURE_SUPPORTED_MODELS.includes(model)) {
      params.temperature = parseFloat(temperature);
    }


    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      // Return detailed OpenAI error information
      const errorMessage = data.error?.message || 'OpenAI API error occurred';
      const errorType = data.error?.type || 'unknown_error';
      const errorCode = data.error?.code || null;
      
      let userFriendlyMessage = errorMessage;
      
      // Provide more user-friendly error messages for common issues
      if (errorType === 'invalid_api_key' || response.status === 401) {
        userFriendlyMessage = 'Invalid API key. Please check your OpenAI API key and try again.';
      } else if (errorType === 'insufficient_quota' || errorCode === 'insufficient_quota') {
        userFriendlyMessage = 'Insufficient quota. You have exceeded your OpenAI API usage limits.';
      } else if (errorType === 'model_not_found') {
        userFriendlyMessage = `Model "${model}" not found or not accessible with your API key.`;
      } else if (errorType === 'rate_limit_exceeded') {
        userFriendlyMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
      } else if (response.status >= 500) {
        userFriendlyMessage = 'OpenAI service is temporarily unavailable. Please try again later.';
      }

      return NextResponse.json(
        { 
          error: userFriendlyMessage,
          details: {
            type: errorType,
            code: errorCode,
            originalMessage: errorMessage
          }
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      response: data.choices[0].message.content,
      tokens: data.usage.total_tokens,
    });

  } catch (error) {
    console.error('API route error:', error);
    
    // Handle network errors and other exceptions
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to connect to OpenAI API. Please check your internet connection and try again.',
        details: {
          type: 'network_error',
          originalMessage: errorMessage
        }
      },
      { status: 500 }
    );
  }
}