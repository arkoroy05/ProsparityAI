import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, CheckCircle } from 'lucide-react';

export function AIInstructions({ company }) {
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatedInstructions, setGeneratedInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [usingLocalStorage, setUsingLocalStorage] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Debug company object
  useEffect(() => {
    console.log('Company object in AIInstructions:', company);
    // Check if company is valid
    if (company?.id) {
      console.log('Company ID:', company.id);
      setCompanyInfo({
        id: company.id,
        name: company.name || 'Unknown Company'
      });

      // We'll check localStorage later only if database fails
      // Don't set usingLocalStorage to true here anymore
    } else {
      console.error('Invalid company object:', company);
    }
  }, [company]);

  useEffect(() => {
    if (company?.id) {
      fetchInstructions();
    } else {
      setLoading(false);
      setError('No company information provided. Please refresh the page or contact support.');
    }
  }, [company?.id]);

  const fetchInstructions = async (forceDatabase = false) => {
    if (!company?.id) {
      console.warn('No company ID provided');
      setLoading(false);
      return;
    }

    // If we already have instructions from localStorage and not forcing database
    if (usingLocalStorage && !forceDatabase) {
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching instructions for company:', company.id);

      // First verify the company exists
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, owner_id')
        .eq('id', company.id)
        .single();

      if (companyError) {
        console.error('Company not found in database:', companyError);

        // For development mode, try to load instructions from localStorage
        if (typeof window !== 'undefined') {
          console.log('Checking localStorage for saved instructions');
          const savedInstructions = localStorage.getItem(`ai_instructions_${company.id}`);
          if (savedInstructions) {
            console.log('Found saved instructions in localStorage');
            setInstructions(savedInstructions);
            setLoading(false);
            setUsingLocalStorage(true);
            setError('Using locally saved instructions (database connection issue)');
            return;
          }
        }

        // If no localStorage and in development mode, use empty instructions
        setError('Company not found. Please make sure your company is properly set up.');
        setLoading(false);
        return;
      }

      // Check if the settings record exists
      const { data, error } = await supabase
        .from('company_settings')
        .select('id, ai_instructions')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking company settings:', error);
        // Check if error is related to RLS permissions
        if (error.code === 'PGRST301' || error.message.includes('permission')) {
          setError('You do not have permission to access company settings. This might be because you are not the company owner.');
        } else {
          setError('Error loading settings. Please try refreshing.');
        }
        setLoading(false);
        return;
      }

      // If settings exist, use them
      if (data?.id) {
        setInstructions(data.ai_instructions || '');
        // Save to localStorage as backup
        if (typeof window !== 'undefined') {
          localStorage.setItem(`ai_instructions_${company.id}`, data.ai_instructions || '');
        }
        setLoading(false);
        return;
      }

      // Otherwise, fallback to localStorage or use API endpoint
      const savedInstructions = typeof window !== 'undefined' ?
        localStorage.getItem(`ai_instructions_${company.id}`) : null;

      if (savedInstructions) {
        setInstructions(savedInstructions);
        setUsingLocalStorage(true);
        setLoading(false);
      } else {
        // Try using API endpoint
        try {
          console.log('Company exists but no settings found. Creating initial settings...');

          // Otherwise, create initial settings via API endpoint
          const initResponse = await fetch('/api/settings/init', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ companyId: company.id }),
          });

          if (!initResponse.ok) {
            const errorText = await initResponse.text();
            let errorMessage = 'Failed to initialize settings';
            let errorDetails = '';

            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.message || errorMessage;
              errorDetails = errorData.details || '';
            } catch (e) {
              // Use the raw text if not JSON
              if (errorText) errorMessage = errorText;
            }

            console.error('Init response error:', errorMessage, errorDetails);

            // Create a fallback for development
            if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
              console.log('Using local storage fallback in development mode');

              // Default instructions for development
              const defaultInstructions = `# Development Mode AI Instructions

You are an AI sales agent for ${company.name || 'our company'}.

This is a local development fallback. The settings could not be initialized in the database.
Error details: ${errorMessage}

In a real environment, you would use these instructions to guide your conversation with leads.`;

              setInstructions(defaultInstructions);
              localStorage.setItem(`ai_instructions_${company.id}`, defaultInstructions);
              setUsingLocalStorage(true);
              setError(`Using local fallback (${errorMessage})`);
              toast.info('Using local development mode for AI instructions');
            } else {
              setError(`Failed to initialize settings: ${errorMessage}`);
              toast.error(`Settings initialization failed: ${errorMessage}`);
            }

            setLoading(false);
            return;
          }

          const responseData = await initResponse.json();
          setInstructions(responseData.settings?.ai_instructions || '');
          // Save to localStorage as backup
          if (typeof window !== 'undefined') {
            localStorage.setItem(`ai_instructions_${company.id}`, responseData.settings?.ai_instructions || '');
          }
        } catch (apiError) {
          console.error('API error:', apiError);
          setError('API error: ' + apiError.message);
          setLoading(false);
          setUsingLocalStorage(true);
        }
      }
    } catch (error) {
      console.error('Error fetching AI instructions:', error);
      setError(error.message || 'Failed to load settings');
      toast.error('Failed to load settings. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const saveInstructions = async () => {
    let retryCount = 0;
    const maxRetries = 2;

    const attemptSave = async () => {
      try {
        setSaving(true);
        setError(null);

        // Always save to localStorage as a fallback
        if (typeof window !== 'undefined') {
          localStorage.setItem(`ai_instructions_${company.id}`, instructions);
        }

        // If we're using localStorage mode, don't try to save to the database
        if (usingLocalStorage) {
          toast.success('Instructions saved locally');
          setSaving(false);
          return;
        }

        // First verify the company exists
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('id, name, owner_id')
          .eq('id', company.id)
          .single();

        if (companyError) {
          console.error('Company verification failed:', companyError);

          // Just use localStorage as fallback
          setUsingLocalStorage(true);
          toast.success('Instructions saved locally (database connection issue)');
          setSaving(false);
          return;
        }

        // If company exists, try to initialize settings
        try {
          console.log('Initializing settings for company:', company.id);
          const initResponse = await fetch('/api/settings/init', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ companyId: company.id }),
            cache: 'no-store',
          });

          // Log detailed information about the response
          console.log('Init response status:', initResponse.status);

          if (!initResponse.ok) {
            const errorText = await initResponse.text();
            console.error('Init response error text:', errorText);

            let errorMessage = `Failed to initialize settings: ${initResponse.status}`;
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.message || errorMessage;
              console.error('Parsed error details:', errorData);
            } catch (e) {
              // Use the raw text if not JSON
              if (errorText) errorMessage = errorText;
            }

            // Fall back to localStorage
            setUsingLocalStorage(true);
            toast.success('Instructions saved locally');
            setSaving(false);
            return;
          }
        } catch (initError) {
          console.error('Settings initialization error:', initError);
          setUsingLocalStorage(true);
          toast.success('Instructions saved locally');
          setSaving(false);
          return;
        }

        // If initialization was successful, save the instructions
        const saveResponse = await fetch('/api/settings/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyId: company.id,
            instructions: instructions,
          }),
        });

        if (!saveResponse.ok) {
          const saveErrorText = await saveResponse.text();
          console.error('Save response error text:', saveErrorText);

          let errorMessage = `Failed to save instructions: ${saveResponse.status}`;
          try {
            const saveData = JSON.parse(saveErrorText);
            errorMessage = saveData.message || errorMessage;
          } catch (e) {
            // Use the raw text if not JSON
            if (saveErrorText) errorMessage = saveErrorText;
          }

          // Fall back to localStorage
          setUsingLocalStorage(true);
          toast.success('Instructions saved locally');
          setSaving(false);
          return;
        }

        // Try to parse the response
        try {
          const saveData = await saveResponse.json();
          setInstructions(saveData.instructions || instructions);

          // Add success state and message
          setSaveSuccess(true);
          setError(null);
          toast.success('Instructions saved successfully to database');

          // Reset success state after 3 seconds
          setTimeout(() => {
            setSaveSuccess(false);
          }, 3000);
        } catch (parseError) {
          // If parsing fails, but response was ok, assume success and keep current instructions
          console.warn('Could not parse save response, but request succeeded');
          toast.success('Instructions saved successfully');
        }

      } catch (error) {
        console.error('Error saving instructions:', error);
        setError(error.message);

        // Always fall back to localStorage
        setUsingLocalStorage(true);
        toast.success('Instructions saved locally');
      } finally {
        setSaving(false);
      }
    };

    return attemptSave();
  };

  const generateInstructions = async () => {
    try {
      setGenerating(true);

      // Check if company has required data
      if (!company?.name) {
        toast.error('Company name is required to generate instructions');
        setGenerating(false);
        return;
      }

      // Prepare payload - include current instructions if they exist
      const payload = {
        company: {
          name: company.name,
          industry: company.industry || 'Technology',
          description: company.description || `${company.name} is a company focused on growth and success.`
        },
        currentInstructions: instructions.trim() // Send current instructions for enhancement
      };

      console.log('Sending request with payload:', {
        ...payload,
        currentInstructionsLength: payload.currentInstructions.length
      });

      // Make the request
      try {
        const response = await fetch('/api/ai/generate-instructions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        console.log('Response status:', response.status);

        // Get the response text
        const text = await response.text();
        console.log('Response text preview:', text.substring(0, 100));

        // Try to parse the JSON
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.error('Raw response text:', text);
          throw new Error('Invalid response from server');
        }

        // Check for success
        if (!data || !data.success) {
          throw new Error(data?.message || 'Failed to generate instructions');
        }

        // Check for instructions
        if (!data.instructions) {
          throw new Error('No instructions received');
        }

        // Handle different generation methods
        if (data.generationMethod === 'enhanced') {
          toast.success('Enhanced your instructions with AI');
        } else if (data.generationMethod === 'generated') {
          toast.success('Generated new instructions with AI');
        } else if (data.usingFallback) {
          toast.info('Using template instructions (AI service unavailable)');
        }

        // Set the instructions
        setGeneratedInstructions(data.instructions);
      } catch (requestError) {
        console.error('Request error:', requestError);
        throw requestError;
      }
    } catch (error) {
      console.error('Error generating instructions:', error);
      toast.error(error.message || 'Failed to generate instructions');
    } finally {
      setGenerating(false);
    }
  };

  const useGeneratedInstructions = () => {
    setInstructions(generatedInstructions);
    setGeneratedInstructions('');
    toast.success('Generated instructions applied');
  };

  // Add function to switch from local to database mode
  const switchToDatabaseMode = async () => {
    if (usingLocalStorage) {
      try {
        setLoading(true);
        setUsingLocalStorage(false);
        console.log('Switching from local storage to database mode');

        // First, try to initialize the company settings
        console.log('Initializing settings for company:', company.id);
        const initResponse = await fetch('/api/settings/init', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ companyId: company.id }),
          cache: 'no-store',
        });

        if (!initResponse.ok) {
          const errorText = await initResponse.text();
          console.error('Init response error text:', errorText);
          throw new Error(`Failed to initialize settings: ${initResponse.status}`);
        }

        const initData = await initResponse.json();
        console.log('Settings initialization response:', initData);

        if (!initData.success) {
          throw new Error(initData.message || 'Failed to initialize settings');
        }

        // Now try to save the current instructions to the database
        const saveResponse = await fetch('/api/settings/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyId: company.id,
            instructions: instructions,
          }),
        });

        if (!saveResponse.ok) {
          const saveErrorText = await saveResponse.text();
          console.error('Save response error text:', saveErrorText);
          throw new Error(`Failed to save instructions: ${saveResponse.status}`);
        }

        const saveData = await saveResponse.json();
        console.log('Save response:', saveData);

        if (!saveData.success) {
          throw new Error(saveData.message || 'Failed to save instructions');
        }

        // Successfully switched to database mode
        toast.success('Successfully switched to database mode');
        setError(null);

        // Fetch the instructions from the database to confirm
        await fetchInstructions(true);
      } catch (error) {
        console.error('Error switching to database mode:', error);
        setUsingLocalStorage(true); // Switch back to local storage mode
        setError(`Failed to switch to database mode: ${error.message}`);
        toast.error(`Failed to switch to database mode: ${error.message}`);
        setLoading(false);
      }
    }
  };

  // Add function to clear localStorage
  const clearLocalStorage = () => {
    if (typeof window !== 'undefined' && company?.id) {
      if (confirm('Are you sure you want to clear local data? This will remove your saved instructions from this browser.')) {
        localStorage.removeItem(`ai_instructions_${company.id}`);
        console.log('Cleared local storage for company', company.id);
        toast.success('Local storage cleared');

        // Ask if user wants to switch to database mode
        if (confirm('Would you like to try switching to database mode?')) {
          switchToDatabaseMode();
        } else {
          // Reload with empty instructions
          setInstructions('');
          setError('Local data cleared. You are still in local storage mode.');
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && error.includes("Company not found")) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>AI Agent Instructions</CardTitle>
            <CardDescription className="text-amber-500">
              Company Configuration Issue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4">
              <h3 className="text-lg font-semibold text-amber-500 mb-2">Company Not Found</h3>
              <p className="mb-4">
                We encountered an issue with your company configuration. This could happen if:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Your company record hasn't been fully set up in the database</li>
                <li>Your current session is using an invalid company ID</li>
                <li>There's a temporary database connection issue</li>
              </ul>
              <p>
                Try refreshing the page or contact support if this issue persists.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <p className="mt-4 text-sm text-amber-600">
                  Development mode: You can still edit and save instructions locally.
                </p>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="space-y-4">
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Enter instructions for your AI sales agent..."
                  className="min-h-[200px]"
                />
                <Button
                  onClick={saveInstructions}
                  className="w-full"
                >
                  Save Instructions Locally
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Agent Instructions</CardTitle>
          <CardDescription>
            Customize how your AI sales agent interacts with leads
            {usingLocalStorage && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Local Mode
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {usingLocalStorage && (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 mb-3">
              <p className="text-sm text-amber-500">
                <strong>Note:</strong> You are currently using local storage mode.
                Changes will be saved to your browser only and not to the database.
                <Button
                  variant="link"
                  className="text-amber-600 p-0 h-auto font-medium text-sm ml-2"
                  onClick={switchToDatabaseMode}>
                  Try switching to database mode
                </Button>
                <Button
                  variant="link"
                  className="text-amber-600 p-0 h-auto font-medium text-sm ml-2"
                  onClick={clearLocalStorage}>
                  Clear local data
                </Button>
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={generateInstructions}
              disabled={generating || !company?.name}
              variant="outline"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Instructions'
              )}
            </Button>
          </div>

          {generatedInstructions && (
            <Card className="bg-muted">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Generated Instructions</h3>
                <p className="text-sm mb-4 whitespace-pre-wrap">{generatedInstructions}</p>
                <Button
                  onClick={useGeneratedInstructions}
                  variant="secondary"
                >
                  Use These Instructions
                </Button>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3 mb-3">
              <p className="text-sm text-red-500">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {saveSuccess && (
            <div className="rounded-md border border-green-500/50 bg-green-500/10 p-3 mb-3 flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <p className="text-sm text-green-500">
                <strong>Success!</strong> Instructions saved successfully to database.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Enter instructions for your AI sales agent..."
              className="min-h-[200px]"
            />
            <Button
              onClick={saveInstructions}
              disabled={saving || !company?.id}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Instructions'
              )}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <h3 className="font-semibold mb-2">Tips for effective AI instructions:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Be specific about your company's tone and values</li>
              <li>Define how to handle common objections</li>
              <li>Specify any industry-specific terminology to use</li>
              <li>Include key qualifying questions to ask</li>
              <li>Set guidelines for follow-up scheduling</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}