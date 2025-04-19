import { useState, useRef } from 'react';
import { parseLeadsFromCSV, validateCSVData } from '@/lib/csv-parser';
import { addLeadsFromCsv } from '@/lib/lead-utils';

const CsvUpload = ({ companyId, userId, onSuccess }) => {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState([]);
  const [parseResult, setParseResult] = useState(null);
  const [uploadStats, setUploadStats] = useState(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file.');
      setFile(null);
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    setPreview([]);
    setParseResult(null);
    setUploadStats(null);
    
    // Read and preview the file
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvContent = e.target.result;
        
        // Parse the CSV
        const parsedLeads = await parseLeadsFromCSV(csvContent);
        
        // Validate the data
        const validation = validateCSVData(parsedLeads);
        setParseResult(validation);
        
        if (validation.valid) {
          // Show preview of first 5 leads
          setPreview(parsedLeads.slice(0, 5));
        } else {
          setError(validation.message);
        }
      } catch (error) {
        console.error('Error previewing CSV:', error);
        setError('Could not read the CSV file. Please check the format and try again.');
      }
    };
    
    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !parseResult?.valid) return;
    
    try {
      setIsUploading(true);
      setError(null);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csvContent = e.target.result;
          
          // Parse the CSV
          const parsedLeads = await parseLeadsFromCSV(csvContent);
          
          // Upload leads to database
          const { success, leads, count, error: uploadError } = await addLeadsFromCsv(
            parsedLeads,
            companyId,
            userId
          );
          
          if (uploadError) throw new Error(uploadError);
          
          setUploadStats({
            total: parsedLeads.length,
            uploaded: count,
          });
          
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          setFile(null);
          setPreview([]);
          
          // Notify parent component
          if (onSuccess) onSuccess(leads);
        } catch (error) {
          console.error('Error uploading leads:', error);
          setError(error.message);
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error handling upload:', error);
      setError(error.message);
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFile(null);
    setError(null);
    setPreview([]);
    setParseResult(null);
    setUploadStats(null);
  };

  return (
    <div className="p-6 bg-gray-900 rounded-lg shadow-lg border border-gray-800">
      <h3 className="mb-4 text-lg font-medium text-white">Import Leads from CSV</h3>
      
      {error && (
        <div className="p-4 mb-4 text-sm text-red-400 bg-red-900/30 rounded-md border border-red-800">
          {error}
        </div>
      )}
      
      {uploadStats && (
        <div className="p-4 mb-4 text-sm text-green-400 bg-green-900/30 rounded-md border border-green-800">
          Successfully imported {uploadStats.uploaded} leads out of {uploadStats.total}.
        </div>
      )}
      
      <div className="mb-4">
        <label htmlFor="csv-file" className="block mb-2 text-sm font-medium text-gray-300">
          Upload CSV File
        </label>
        <input
          id="csv-file"
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-600/20 file:text-purple-300 hover:file:bg-purple-600/30 file:transition-colors border border-gray-800 rounded-md bg-gray-800/50"
        />
        <p className="mt-1 text-xs text-gray-500">
          The CSV file should include columns for name, email, phone, company_name, and designation (optional).
        </p>
      </div>
      
      {preview.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-gray-300">Preview (first 5 leads)</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-800/50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                    Email
                  </th>
                  <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                    Phone
                  </th>
                  <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                    Company
                  </th>
                  <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                    Job Title
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-900/50 divide-y divide-gray-800">
                {preview.map((lead, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-xs text-gray-300 whitespace-nowrap">{lead.name}</td>
                    <td className="px-3 py-2 text-xs text-gray-300 whitespace-nowrap">{lead.email}</td>
                    <td className="px-3 py-2 text-xs text-gray-300 whitespace-nowrap">{lead.phone}</td>
                    <td className="px-3 py-2 text-xs text-gray-300 whitespace-nowrap">{lead.company_name}</td>
                    <td className="px-3 py-2 text-xs text-gray-300 whitespace-nowrap">{lead.designation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {parseResult?.valid && (
            <p className="mt-2 text-xs text-gray-500">
              {parseResult.message}
            </p>
          )}
        </div>
      )}
      
      <div className="flex space-x-3">
        <button
          onClick={handleUpload}
          disabled={!file || isUploading || !parseResult?.valid}
          className="flex justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600/80 border border-purple-500/30 rounded-md shadow-sm hover:bg-purple-600/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500/50 disabled:bg-gray-800 disabled:border-gray-700 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? 'Importing...' : 'Import Leads'}
        </button>
        
        <button
          onClick={handleReset}
          className="flex justify-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800/80 border border-gray-700 rounded-md shadow-sm hover:bg-gray-800 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default CsvUpload;