import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function AIInstructions({ company }) {
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatedInstructions, setGeneratedInstructions] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (company?.id) {
      fetchInstructions();
    } else {
      setLoading(false);
    }
  }, [company?.id]);

  const fetchInstructions = async () => {
    if (!company?.id) {
      console.warn('No company ID provided');
      setLoading(false);
      return;
    }

    try {
      // Check if the settings record exists
      const { data, error } = await supabase
        .from('company_settings')
        .select('id, ai_instructions')
        .eq('company_id', company.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking company settings:', error);
        toast.error('Error loading settings');
        setLoading(false);
        return;
      }

      // If settings exist, use them
      if (data?.id) {
        setInstructions(data.ai_instructions || '');
        setLoading(false);
        return;
      }

      // Otherwise, create initial settings via API endpoint
      const initResponse = await fetch('/api/settings/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId: company.id }),
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        throw new Error(errorData.message || 'Failed to initialize settings');
      }

      setInstructions('');
    } catch (error) {
      console.error('Error fetching AI instructions:', error);
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
        
        // First check if the record exists
        console.log('Checking for existing company settings...');
        const { data, error: checkError } = await supabase
          .from('company_settings')
          .select('id')
          .eq('company_id', company.id)
          .maybeSingle();
        
        if (checkError) {
          console.error('Error checking company settings:', checkError);
          throw new Error('Failed to verify settings record');
        }

        // If no record exists, create it through the API
        if (!data?.id) {
          console.log('No settings record found, initializing...');
          const initResponse = await fetch('/api/settings/init', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ companyId: company.id }),
            cache: 'no-store',
          });

          if (!initResponse.ok) {
            console.error('Init API response status:', initResponse.status);
            const errorText = await initResponse.text();
            console.error('Init API error response:', errorText);
            try {
              const errorData = JSON.parse(errorText);
              throw new Error(errorData.message || 'Failed to initialize settings');
            } catch (parseError) {
              throw new Error(`Failed to initialize settings: ${initResponse.status}`);
            }
          }
          
          console.log('Settings initialized successfully');
        }

        // Add a short delay to ensure the database has processed the init request
        await new Promise(resolve => setTimeout(resolve, 300));

        // Now update the instructions
        console.log('Updating instructions...');
        const { error: updateError } = await supabase
          .from('company_settings')
          .update({ 
            ai_instructions: instructions,
            updated_at: new Date().toISOString()
          })
          .eq('company_id', company.id);

        if (updateError) {
          console.error('Error updating instructions:', updateError);
          throw new Error('Failed to save instructions');
        }

        console.log('Instructions saved successfully');
        toast.success('AI instructions saved successfully');
        return true;
      } catch (error) {
        console.error('Error in save attempt:', error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying save (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          return attemptSave();
        }
        
        toast.error(error.message || 'Failed to save AI instructions');
        return false;
      } finally {
        if (retryCount === maxRetries || retryCount === 0) {
          setSaving(false);
        }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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