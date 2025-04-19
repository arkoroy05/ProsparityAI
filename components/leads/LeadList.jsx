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
      
      setLeads(prev => 
        prev.map(l => l.id === leadId ? { ...l, score: scoredLead.score, classification: scoredLead.classification } : l)
      );
      
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, score: scoredLead.score, classification: scoredLead.classification });
      }
    } catch (error) {
      console.error('Error scoring lead:', error);
    }
  };

  const handleUpdateStatus = async (leadId, status) => {
    try {
      const { lead: updatedLead, error: updateError } = await updateLeadStatus(
        leadId,
        status
      );
      
      if (updateError) throw new Error(updateError);
      
      setLeads(prev => 
        prev.map(l => l.id === leadId ? { ...l, status: updatedLead.status } : l)
      );
      
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status: updatedLead.status });
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const filteredLeads = leads
    .filter(lead => {
      if (filters.status !== 'all' && lead.status !== filters.status) {
        return false;
      }
      
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
        <div className="w-8 h-8 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
        <span className="ml-2 text-gray-400">Loading leads...</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg bg-gray-900/50 shadow-lg border border-gray-800">
      {error && (
        <div className="p-4 mb-4 text-sm text-red-400 bg-red-900/30 border border-red-800">
          {error}
        </div>
      )}
      
      <div className="flex flex-wrap items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center mb-3 space-x-3 sm:mb-0">
          <div>
            <label htmlFor="status-filter" className="block mb-1 text-xs font-medium text-gray-400">
              Status
            </label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="block w-full py-1 pl-3 pr-10 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
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
            <label htmlFor="sort-by" className="block mb-1 text-xs font-medium text-gray-400">
              Sort By
            </label>
            <select
              id="sort-by"
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="block w-full py-1 pl-3 pr-10 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            >
              <option value="updated_at">Last Updated</option>
              <option value="name">Name</option>
              <option value="score">Score</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="sort-dir" className="block mb-1 text-xs font-medium text-gray-400">
              Order
            </label>
            <select
              id="sort-dir"
              value={filters.sortDir}
              onChange={(e) => handleFilterChange('sortDir', e.target.value)}
              className="block w-full py-1 pl-3 pr-10 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select> 
          </div>
        </div>
        
        <div className="w-full sm:w-auto">
          <label htmlFor="search" className="block mb-1 text-xs font-medium text-gray-400">
            Search
          </label>
          <input
            type="text"
            id="search"
            placeholder="Search leads..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="block w-full py-1 pl-3 pr-3 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
          />
        </div>
      </div>
      
      {filteredLeads.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          {filters.searchTerm || filters.status !== 'all' ? 
            'No leads match your filters.' : 
            'No leads found. Add your first lead or import from CSV.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-800/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                  Contact
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                  Company
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-center text-gray-400 uppercase">
                  Score
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-right text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-900/50 divide-y divide-gray-800">
              {filteredLeads.map((lead) => (
                <tr 
                  key={lead.id} 
                  className="hover:bg-gray-800/50 cursor-pointer transition-colors"
                  onClick={() => handleLeadSelect(lead)}
                >
                  <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
                    {lead.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
                    <div>{lead.email}</div>
                    {lead.phone && <div className="text-gray-500">{lead.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
                    <div>{lead.company_name || '-'}</div>
                    {lead.designation && <div className="text-gray-500">{lead.designation}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      lead.status === 'new' ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50' :
                      lead.status === 'qualified' ? 'bg-green-900/50 text-green-300 border border-green-700/50' :
                      lead.status === 'unqualified' ? 'bg-gray-800 text-gray-300 border border-gray-700' :
                      lead.status === 'contacted' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50' :
                      lead.status === 'converted' ? 'bg-purple-900/50 text-purple-300 border border-purple-700/50' :
                      'bg-red-900/50 text-red-300 border border-red-700/50'
                    }`}>
                      {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                    {lead.score !== null && lead.score !== undefined ? (
                      <div 
                        className={`inline-block w-10 py-1 text-xs font-medium rounded ${
                          lead.score >= 70 ? 'bg-green-900/50 text-green-300 border border-green-700/50' : 
                          lead.score <= 30 ? 'bg-red-900/50 text-red-300 border border-red-700/50' : 
                          'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50'
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
                        className="px-2 py-1 text-xs font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 transition-colors"
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
                      className="px-2 py-1 text-xs text-gray-300 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
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
      
      {showDetails && selectedLead && (
        <LeadDetails
          lead={selectedLead}
          companyId={companyId}
          userId={userId}
          onClose={handleCloseDetails}
          onStatusChange={handleUpdateStatus}
          onScoreUpdate={handleScoreLead}
          onLeadUpdate={(updatedLead) => {
            setLeads(prev => 
              prev.map(l => l.id === updatedLead.id ? updatedLead : l)
            );
            setSelectedLead(updatedLead);
          }}
        />
      )}
    </div>
  );
};

export default LeadList;