import csvParser from 'csv-parser';
import { Readable } from 'stream';

// Function to parse CSV file contents
export const parseCSV = async (fileContent) => {
  try {
    return new Promise((resolve, reject) => {
      const results = [];
      
      // Create a readable stream from the file content
      const readableStream = Readable.from([fileContent]);
      
      readableStream
        .pipe(csvParser({
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

      // Find phone number from various possible column names
      const phoneFields = ['phone', 'phonenumber', 'phone_number', 'telephone', 'mobile', 'contact', 'tel', 'cell', 'phone number'];
      let phone = phoneFields.reduce((found, field) => found || normalizedRow[field], '');
      
      // Clean and format the phone number
      if (phone) {
        // Keep + sign for international numbers
        if (!phone.startsWith('+') && phone.length > 10) {
          // For numbers that might be international format without + (e.g., 91XXXXXXXX)
          if (/^[0-9]{11,15}$/.test(phone.replace(/\D/g, ''))) {
            // Assume country code if number is longer than 10 digits
            const digitsOnly = phone.replace(/\D/g, '');
            if (digitsOnly.startsWith('91') || digitsOnly.startsWith('1')) {
              // Common country codes - preserve them
              phone = '+' + digitsOnly;
            }
          }
        }
        
        // Clean the phone number but preserve + for international format
        const hasPlus = phone.startsWith('+');
        // Remove all non-digit characters except the leading +
        phone = phone.replace(/\D/g, '');
        if (hasPlus) {
          phone = '+' + phone;
        }
      }
      
      return {
        name: normalizedRow.name || normalizedRow.fullname || '',
        email: normalizedRow.email || '',
        phone: phone ? phone.trim() : '',
        company_name: normalizedRow.company || normalizedRow.company_name || normalizedRow.companyname || '',
        designation: normalizedRow.designation || normalizedRow.title || normalizedRow.position || normalizedRow.job_title || '',
      };
    }).filter(lead => {
      // Ensure we have valid data
      const hasName = lead.name.trim().length > 0;
      const hasEmail = lead.email.trim().length > 0;
      const hasPhone = lead.phone.trim().length > 0;
      return hasName && (hasEmail || hasPhone);
    });
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
  const normalizedKeys = Object.keys(firstRow).map(key => key.toLowerCase().trim());
  
  const hasName = normalizedKeys.some(key => ['name', 'fullname'].includes(key));
  const hasEmail = normalizedKeys.includes('email');
  const hasPhone = normalizedKeys.some(key => 
    ['phone', 'phonenumber', 'phone_number', 'telephone', 'mobile', 'contact', 'tel', 'cell', 'phone number'].includes(key)
  );
  
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
      ['name', 'fullname'].includes(key.toLowerCase().trim()))
      ? row[Object.keys(row).find(key => 
        ['name', 'fullname'].includes(key.toLowerCase().trim()))].trim()
      : '';
    
    // Find email field
    const email = row[Object.keys(row).find(key => 
      key.toLowerCase().trim() === 'email') || '']?.trim() || '';
    
    // Find phone field
    const phoneFields = ['phone', 'phonenumber', 'phone_number', 'telephone', 'mobile', 'contact', 'tel', 'cell', 'phone number'];
    let phone = phoneFields.reduce((found, field) => {
      if (found) return found;
      const key = Object.keys(row).find(k => k.toLowerCase().trim() === field);
      return key ? row[key].trim() : '';
    }, '');
    
    // Basic phone validation - should have some digits
    const hasValidPhone = phone && phone.replace(/\D/g, '').length >= 7;
    
    // Basic email validation
    const hasValidEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    
    return name && (hasValidEmail || hasValidPhone);
  });
  
  if (validLeads.length === 0) {
    return {
      valid: false,
      message: 'No valid leads found in the CSV file. Each lead must have a name and either a valid email or phone number.'
    };
  }
  
  return {
    valid: true,
    message: `Found ${validLeads.length} valid leads out of ${parsedData.length} total rows.`
  };
}; 