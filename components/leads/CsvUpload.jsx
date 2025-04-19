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
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="mb-4 text-lg font-medium text-gray-900">Import Leads from CSV</h3>
      
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      
      {uploadStats && (
        <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-md">
          Successfully imported {uploadStats.uploaded} leads out of {uploadStats.total}.
        </div>
      )}
      
      <div className="mb-4">
        <label htmlFor="csv-file" className="block mb-2 text-sm font-medium text-gray-700">
          Upload CSV File
        </label>
        <input
          id="csv-file"
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
        <p className="mt-1 text-xs text-gray-500">
          The CSV file should include columns for name, email, phone, company_name, and designation (optional).
        </p>
      </div>
      
      {preview.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-gray-700">Preview (first 5 leads)</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Email
                  </th>
                  <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Phone
                  </th>
                  <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Company
                  </th>
                  <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Job Title
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.map((lead, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{lead.name}</td>
                    <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{lead.email}</td>
                    <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{lead.phone}</td>
                    <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{lead.company_name}</td>
                    <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{lead.designation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {parseResult?.valid && (
            <p className="mt-2 text-xs text-gray-600">
              {parseResult.message}
            </p>
          )}
        </div>
      )}
      
      <div className="flex space-x-3">
        <button
          onClick={handleUpload}
          disabled={!file || isUploading || !parseResult?.valid}
          className="flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
        >
          {isUploading ? 'Importing...' : 'Import Leads'}
        </button>
        
        <button
          onClick={handleReset}
          className="flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default CsvUpload; 