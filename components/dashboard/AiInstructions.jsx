import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Sparkles } from "lucide-react";

const AiInstructions = ({ companyId, initialInstructions = '' }) => {
  const [instructions, setInstructions] = useState(initialInstructions);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);
      
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          additional_details: {
            ...await getExistingDetails(),
            ai_instructions: instructions,
          },
        })
        .eq('id', companyId);
      
      if (updateError) throw updateError;
      
      setSaveSuccess(true);
      
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving AI instructions:', error);
      setError('Failed to save instructions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getExistingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('additional_details')
        .eq('id', companyId)
        .single();
      
      if (error) throw error;
      
      return data.additional_details || {};
    } catch (error) {
      console.error('Error fetching company details:', error);
      return {};
    }
  };

  const generateInstructions = async () => {
    setGenerating(true);
    try {
      // This is a placeholder. In a real app, you would call an AI service
      // to generate instructions based on the company's industry, products, etc.
      setTimeout(() => {
        const sampleInstructions =
          "You are an AI sales assistant for our company. When interacting with potential customers:\n\n" +
          "1. Introduce yourself as an AI assistant for [Company Name]\n" +
          "2. Be friendly, professional, and helpful at all times\n" +
          "3. Ask qualifying questions to understand customer needs\n" +
          "4. Highlight our key product benefits based on their responses\n" +
          "5. Offer to schedule a demo with a human sales representative\n" +
          "6. Collect contact information for follow-up\n\n" +
          "Avoid being pushy or using hard-sell tactics. Focus on providing value and building trust."

        setInstructions(sampleInstructions);
        setGenerating(false);
      }, 1500);
    } catch (error) {
      console.error("Error generating AI instructions:", error);
      setGenerating(false);
    }
  };

  return (
    <Tabs defaultValue="edit" className="w-full">
      <TabsList className="bg-gray-800 border-gray-700">
        <TabsTrigger value="edit" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
          Edit Instructions
        </TabsTrigger>
        <TabsTrigger value="preview" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
          Preview
        </TabsTrigger>
      </TabsList>

      <TabsContent value="edit" className="mt-4">
        <div className="flex justify-between mb-4">
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
            onClick={generateInstructions}
            disabled={generating}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {generating ? "Generating..." : "Generate with AI"}
          </Button>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Instructions"}
          </Button>
        </div>

        {error && (
          <div className="p-4 mb-4 text-sm text-red-400 bg-red-900/50 rounded-md border border-red-700">
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="p-4 mb-4 text-sm text-green-400 bg-green-900/50 rounded-md border border-green-700">
            Instructions saved successfully!
          </div>
        )}

        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Enter instructions for your AI sales agent..."
          className="min-h-[200px] bg-gray-800 border-gray-700 text-white"
        />

        <p className="text-sm text-gray-400 mt-2">
          These instructions will guide how your AI agent interacts with potential customers. Be specific about your
          company's tone, values, and sales approach.
        </p>
      </TabsContent>

      <TabsContent value="preview" className="mt-4">
        <div className="rounded-lg bg-gray-800 border border-gray-700 p-6">
          {instructions ? (
            <div className="whitespace-pre-wrap text-gray-300">{instructions}</div>
          ) : (
            <p className="text-gray-400 italic">
              No instructions provided yet. Switch to the Edit tab to add instructions.
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default AiInstructions;