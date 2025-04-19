import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const AiInstructions = ({ companyId, initialInstructions = '' }) => {
  const [instructions, setInstructions] = useState(initialInstructions);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);
      
      // Update company record with AI instructions
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
      
      // Hide success message after 3 seconds
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

  // Get existing additional_details to preserve other fields
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

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-medium text-gray-900">AI Agent Instructions</h3>
        
        <div className="flex items-center mt-2 space-x-2 sm:mt-0">
          {saveSuccess && (
            <span className="text-sm text-green-600">
              Instructions saved!
            </span>
          )}
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          >
            {saving ? 'Saving...' : 'Save Instructions'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="p-4 mt-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      
      <div className="mt-4">
        <p className="mb-2 text-sm text-gray-500">
          Provide general instructions for your AI sales agent. These instructions will be used as a baseline for all AI interactions with your leads.
        </p>
        
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="block w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm resize-y focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Example: When contacting leads, always mention our company values of quality, reliability, and customer satisfaction. Ask about their current challenges related to [industry problem]. Highlight our [product feature] which addresses this issue. Don't be pushy, but suggest a follow-up demo if they show interest."
        />
        
        <div className="mt-2 text-xs text-gray-500">
          <p>Tips for effective instructions:</p>
          <ul className="pl-5 mt-1 list-disc">
            <li>Specify your company's tone and communication style</li>
            <li>Include key talking points about your products/services</li>
            <li>Mention any specific questions the AI should ask</li>
            <li>Add information about common objections and how to handle them</li>
            <li>Provide guidance on when to schedule follow-ups</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AiInstructions;