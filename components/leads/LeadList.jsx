import { useState, useEffect } from 'react';
import { getLeadsByCompany, updateLeadStatus } from '@/lib/lead-utils';
import { getLeadScoringModel, scoreLeadWithModel } from '@/lib/lead-utils';
import LeadDetails from './LeadDetails';

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  qualified: 'bg-green-100 text-green-800',
  unqualified: 'bg-gray-100 text-gray-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  converted: 'bg-indigo-100 text-indigo-800',
  dead: 'bg-red-100 text-red-800',
};

const LeadList = ({ companyId, userId, onLeadSelect }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [scoringModel, setScoringModel] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    sortBy: 'updated_at',
    sortDir: 'desc',
    searchTerm: '',
  });

  // Fetch leads on component mount or when companyId changes
  useEffect(() => {
    fetchLeads();
    fetchScoringModel();
  }, [companyId]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { leads, error: leadsError } = await getLeadsByCompany(companyId);
      
      if (leadsError) throw new Error(leadsError);
      
      setLeads(leads || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      setError('Failed to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchScoringModel = async () => {
    try {
      const { model, error: modelError } = await getLeadScoringModel(companyId);
      
      if (modelError) throw new Error(modelError);
      
      setScoringModel(model);
    } catch (error) {
      console.error('Error fetching scoring model:', error);
    }
  };

  const handleLeadSelect = (lead) => {
    setSelectedLead(lead);
    setShowDetails(true);
    
    if (onLeadSelect) {
      onLeadSelect(lead);
    }
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
  };

  const handleScoreLead = async (leadId) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      
      if (!lead || !scoringModel) return;
      
      const { lead: scoredLead, error: scoreError } = await scoreLeadWithModel(
        leadId,
        lead,
        scoringModel
      );
      
      if (scoreError) throw new Error(scoreError);
      
      // Update lead in state
      setLeads(prev => 
        prev.map(l => l.id === leadId ? { ...l, score: scoredLead.score, classification: scoredLead.classification } : l)
      );
      
      // Update selected lead if it's the one being scored
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, score: scoredLead.score, classification: scoredLead.classification });
      }
    } catch (error) {
      console.error('Error scoring lead:', error);
      // Could add a toast message here
    }
  };

  const handleUpdateStatus = async (leadId, status) => {
    try {
      const { lead: updatedLead, error: updateError } = await updateLeadStatus(
        leadId,
        status
      );
      
      if (updateError) throw new Error(updateError);
      
      // Update lead in state
      setLeads(prev => 
        prev.map(l => l.id === leadId ? { ...l, status: updatedLead.status } : l)
      );
      
      // Update selected lead if it's the one being updated
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status: updatedLead.status });
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
      // Could add a toast message here
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  // Apply filters and sorting
  const filteredLeads = leads
    .filter(lead => {
      // Status filter
      if (filters.status !== 'all' && lead.status !== filters.status) {
        return false;
      }
      
      // Search filter
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        return (
          lead.name?.toLowerCase().includes(searchTerm) ||
          lead.email?.toLowerCase().includes(searchTerm) ||
          lead.phone?.toLowerCase().includes(searchTerm) ||
          lead.company_name?.toLowerCase().includes(searchTerm)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      const sortField = filters.sortBy;
      const sortDir = filters.sortDir === 'asc' ? 1 : -1;
      
      if (sortField === 'score') {
        return sortDir * ((a.score || 0) - (b.score || 0));
      } else if (sortField === 'name') {
        return sortDir * (a.name || '').localeCompare(b.name || '');
      } else if (sortField === 'updated_at') {
        return sortDir * new Date(a.updated_at || 0) - new Date(b.updated_at || 0);
      }
      
      return 0;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
        <span className="ml-2 text-gray-600">Loading leads...</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white rounded-lg shadow">
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100">
          {error}
        </div>
      )}
      
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center mb-3 space-x-3 sm:mb-0">
          <div>
            <label htmlFor="status-filter" className="block mb-1 text-xs font-medium text-gray-700">
              Status
            </label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="block w-full py-1 pl-3 pr-10 text-sm border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="qualified">Qualified</option>
              <option value="unqualified">Unqualified</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
              <option value="dead">Dead</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="sort-by" className="block mb-1 text-xs font-medium text-gray-700">
              Sort By
            </label>
            <select
              id="sort-by"
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="block w-full py-1 pl-3 pr-10 text-sm border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="updated_at">Last Updated</option>
              <option value="name">Name</option>
              <option value="score">Score</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="sort-dir" className="block mb-1 text-xs font-medium text-gray-700">
              Order
            </label>
            <select
              id="sort-dir"
              value={filters.sortDir}
              onChange={(e) => handleFilterChange('sortDir', e.target.value)}
              className="block w-full py-1 pl-3 pr-10 text-sm border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
        
        <div className="w-full sm:w-auto">
          <label htmlFor="search" className="block mb-1 text-xs font-medium text-gray-700">
            Search
          </label>
          <input
            type="text"
            id="search"
            placeholder="Search leads..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="block w-full py-1 pl-3 pr-3 text-sm border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>
      
      {/* Lead list */}
      {filteredLeads.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          {filters.searchTerm || filters.status !== 'all' ? 
            'No leads match your filters.' : 
            'No leads found. Add your first lead or import from CSV.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Contact
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Company
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">
                  Score
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.map((lead) => (
                <tr 
                  key={lead.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleLeadSelect(lead)}
                >
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {lead.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    <div>{lead.email}</div>
                    {lead.phone && <div className="text-gray-500">{lead.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    <div>{lead.company_name || '-'}</div>
                    {lead.designation && <div className="text-gray-500">{lead.designation}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[lead.status] || 'bg-gray-100'}`}>
                      {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                    {lead.score !== null && lead.score !== undefined ? (
                      <div 
                        className={`inline-block w-10 py-1 text-xs font-medium rounded ${
                          lead.score >= 70 ? 'bg-green-100 text-green-800' : 
                          lead.score <= 30 ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {lead.score}
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleScoreLead(lead.id);
                        }}
                        className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                      >
                        Score
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    <select
                      value={lead.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(lead.id, e.target.value);
                      }}
                      className="px-2 py-1 text-xs border-gray-300 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="new">New</option>
                      <option value="qualified">Qualified</option>
                      <option value="unqualified">Unqualified</option>
                      <option value="contacted">Contacted</option>
                      <option value="converted">Converted</option>
                      <option value="dead">Dead</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Lead details modal */}
      {showDetails && selectedLead && (
        <LeadDetails
          lead={selectedLead}
          companyId={companyId}
          userId={userId}
          onClose={handleCloseDetails}
          onStatusChange={handleUpdateStatus}
          onScoreUpdate={handleScoreLead}
          onLeadUpdate={(updatedLead) => {
            // Update lead in the list
            setLeads(prev => 
              prev.map(l => l.id === updatedLead.id ? updatedLead : l)
            );
            // Update selected lead
            setSelectedLead(updatedLead);
          }}
        />
      )}
    </div>
  );
};

export default LeadList; 