import { parse } from 'csv-parser';
import { Readable } from 'stream';

// Function to parse CSV file contents
export const parseCSV = async (fileContent) => {
  try {
    return new Promise((resolve, reject) => {
      const results = [];
      
      // Create a readable stream from the file content
      const readableStream = Readable.from([fileContent]);
      
      readableStream
        .pipe(parse({
          // CSV options
          trim: true,
          skipEmptyLines: true
        }))
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw error;
  }
};

// Function to parse leads from CSV
export const parseLeadsFromCSV = async (fileContent) => {
  try {
    const results = await parseCSV(fileContent);
    
    // Map CSV data to lead objects
    return results.map(row => {
      // Normalize field names (case-insensitive)
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        const normalizedKey = key.toLowerCase().trim();
        normalizedRow[normalizedKey] = row[key];
      });
      
      // Map to lead fields
      return {
        name: normalizedRow.name || normalizedRow.fullname || '',
        email: normalizedRow.email || '',
        phone: normalizedRow.phone || normalizedRow.phonenumber || normalizedRow.phone_number || '',
        company_name: normalizedRow.company || normalizedRow.company_name || normalizedRow.companyname || '',
        designation: normalizedRow.designation || normalizedRow.title || normalizedRow.position || normalizedRow.job_title || '',
      };
    }).filter(lead => lead.name && (lead.email || lead.phone)); // Filter out incomplete records
  } catch (error) {
    console.error('Error parsing leads from CSV:', error);
    throw error;
  }
};

// Function to validate CSV data
export const validateCSVData = (parsedData) => {
  // Check if we have any data
  if (!parsedData || !Array.isArray(parsedData) || parsedData.length === 0) {
    return {
      valid: false,
      message: 'No data found in the CSV file.'
    };
  }
  
  // Check if we have the required fields
  const firstRow = parsedData[0];
  const normalizedKeys = Object.keys(firstRow).map(key => key.toLowerCase());
  
  const hasName = normalizedKeys.some(key => ['name', 'fullname'].includes(key));
  const hasEmail = normalizedKeys.includes('email');
  const hasPhone = normalizedKeys.some(key => ['phone', 'phonenumber', 'phone_number'].includes(key));
  const hasCompany = normalizedKeys.some(key => ['company', 'company_name', 'companyname'].includes(key));
  
  if (!hasName) {
    return {
      valid: false,
      message: 'CSV file is missing a "Name" column.'
    };
  }
  
  if (!hasEmail && !hasPhone) {
    return {
      valid: false,
      message: 'CSV file is missing both "Email" and "Phone" columns. At least one is required.'
    };
  }
  
  // Check data quality
  const validLeads = parsedData.filter(row => {
    // Find name field
    const name = Object.keys(row).find(key => 
      ['name', 'fullname'].includes(key.toLowerCase()))
      ? row[Object.keys(row).find(key => 
        ['name', 'fullname'].includes(key.toLowerCase()))]
      : '';
    
    // Find email field
    const email = row[Object.keys(row).find(key => 
      key.toLowerCase() === 'email') || ''];
    
    // Find phone field
    const phone = Object.keys(row).find(key => 
      ['phone', 'phonenumber', 'phone_number'].includes(key.toLowerCase()))
      ? row[Object.keys(row).find(key => 
        ['phone', 'phonenumber', 'phone_number'].includes(key.toLowerCase()))]
      : '';
    
    return name && (email || phone);
  });
  
  if (validLeads.length === 0) {
    return {
      valid: false,
      message: 'No valid leads found in the CSV file. Each lead must have a name and either an email or phone number.'
    };
  }
  
  return {
    valid: true,
    message: `Found ${validLeads.length} valid leads out of ${parsedData.length} total rows.`
  };
}; 