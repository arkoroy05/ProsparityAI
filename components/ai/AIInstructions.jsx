import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function AIInstructions({ company }) {
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatedInstructions, setGeneratedInstructions] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchInstructions();
  }, [company]);

  const fetchInstructions = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('ai_instructions')
        .eq('company_id', company.id)
        .single();

      if (error) throw error;
      setInstructions(data?.ai_instructions || '');
    } catch (error) {
      console.error('Error fetching AI instructions:', error);
      toast.error('Failed to load AI instructions');
    } finally {
      setLoading(false);
    }
  };

  const saveInstructions = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('company_settings')
        .upsert({
          company_id: company.id,
          ai_instructions: instructions,
        });

      if (error) throw error;
      toast.success('AI instructions saved successfully');
    } catch (error) {
      console.error('Error saving AI instructions:', error);
      toast.error('Failed to save AI instructions');
    } finally {
      setSaving(false);
    }
  };

  const generateInstructions = async () => {
    try {
      setGenerating(true);
      const response = await fetch('/api/ai/generate-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company }),
      });

      if (!response.ok) throw new Error('Failed to generate instructions');
      const data = await response.json();
      setGeneratedInstructions(data.instructions);
    } catch (error) {
      console.error('Error generating AI instructions:', error);
      toast.error('Failed to generate AI instructions');
    } finally {
      setGenerating(false);
    }
  };

  const useGeneratedInstructions = () => {
    setInstructions(generatedInstructions);
    setGeneratedInstructions('');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">AI Agent Instructions</h2>
        <Button onClick={generateInstructions} disabled={generating}>
          {generating ? 'Generating...' : 'Generate Instructions'}
        </Button>
      </div>

      {generatedInstructions && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">Generated Instructions</h3>
            <p className="text-sm mb-4">{generatedInstructions}</p>
            <Button onClick={useGeneratedInstructions}>Use These Instructions</Button>
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
        <Button onClick={saveInstructions} disabled={saving}>
          {saving ? 'Saving...' : 'Save Instructions'}
        </Button>
      </div>

      <div className="text-sm text-gray-500">
        <h3 className="font-semibold mb-2">Tips for effective AI instructions:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Be specific about your company's tone and values</li>
          <li>Define how to handle common objections</li>
          <li>Specify any industry-specific terminology to use</li>
          <li>Include key qualifying questions to ask</li>
          <li>Set guidelines for follow-up scheduling</li>
        </ul>
      </div>
    </div>
  );
} 