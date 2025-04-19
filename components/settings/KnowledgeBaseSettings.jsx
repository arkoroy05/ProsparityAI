import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  Textarea,
  FormControl,
  FormLabel,
  Stack,
  Divider,
  useToast,
  Card,
  CardHeader,
  CardBody,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Flex,
  IconButton,
  Input,
  Tag,
  HStack
} from '@/components/ui';
import { FiSave, FiPlus, FiTrash } from 'react-icons/fi';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/auth-hooks';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function KnowledgeBaseSettings({ companyId }) {
  const supabase = createClient();
  const { user } = useUser();
  const toast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState({
    products: [],
    services: [],
    company_info: '',
    sales_instructions: ''
  });
  
  const [newProduct, setNewProduct] = useState('');
  const [newService, setNewService] = useState('');
  
  // Fetch knowledge base data on component mount
  useEffect(() => {
    if (companyId) {
      fetchKnowledgeBase();
    }
  }, [companyId]);
  
  async function fetchKnowledgeBase() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_knowledge_base')
        .select('*')
        .eq('company_id', companyId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching knowledge base:', error);
        toast({
          title: 'Error fetching knowledge base',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
      
      if (data) {
        setKnowledgeBase({
          products: data.products || [],
          services: data.services || [],
          company_info: data.company_info || '',
          sales_instructions: data.sales_instructions || ''
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function saveKnowledgeBase() {
    setSaving(true);
    try {
      // Call API route to update knowledge base and AI model
      const response = await fetch('/api/ai/update-knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          knowledgeBase
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update knowledge base');
      }
      
      toast({
        title: 'Knowledge base updated',
        description: 'Your AI agent has been updated with the new information',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error saving knowledge base:', error);
      toast({
        title: 'Error saving knowledge base',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  }
  
  function addProduct() {
    if (!newProduct.trim()) return;
    
    setKnowledgeBase(prev => ({
      ...prev,
      products: [...prev.products, newProduct.trim()]
    }));
    setNewProduct('');
  }
  
  function removeProduct(index) {
    setKnowledgeBase(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  }
  
  function addService() {
    if (!newService.trim()) return;
    
    setKnowledgeBase(prev => ({
      ...prev,
      services: [...prev.services, newService.trim()]
    }));
    setNewService('');
  }
  
  function removeService(index) {
    setKnowledgeBase(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  }
  
  function handleCompanyInfoChange(e) {
    setKnowledgeBase(prev => ({
      ...prev,
      company_info: e.target.value
    }));
  }
  
  function handleSalesInstructionsChange(e) {
    setKnowledgeBase(prev => ({
      ...prev,
      sales_instructions: e.target.value
    }));
  }
  
  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading knowledge base...</Text>
      </Box>
    );
  }
  
  return (
    <Box>
      <Heading as="h2" size="lg" mb={6}>
        AI Knowledge Base
      </Heading>
      
      <Text mb={6}>
        Manage the information your AI agent uses to represent your business. This information helps the AI better understand your products, services, and sales approach.
      </Text>
      
      <Tabs variant="enclosed" mb={6}>
        <TabList>
          <Tab>Products</Tab>
          <Tab>Services</Tab>
          <Tab>Company Info</Tab>
          <Tab>Sales Instructions</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel>
            <Box mb={6}>
              <Heading as="h3" size="md" mb={4}>
                Products
              </Heading>
              <Text mb={4}>
                Add your products to help the AI accurately describe your offerings during calls.
              </Text>
              
              <HStack spacing={4} mb={4}>
                <Input
                  placeholder="Add a product (e.g. CRM Software - $99/mo)"
                  value={newProduct}
                  onChange={(e) => setNewProduct(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addProduct()}
                />
                <Button
                  leftIcon={<PlusIcon className="h-5 w-5" />}
                  onClick={addProduct}
                  colorScheme="blue"
                >
                  Add
                </Button>
              </HStack>
              
              <Box mb={4}>
                {knowledgeBase.products.length > 0 ? (
                  <Stack spacing={2}>
                    {knowledgeBase.products.map((product, index) => (
                      <Flex key={index} alignItems="center">
                        <Tag colorScheme="blue" size="lg" flex="1">
                          {product}
                        </Tag>
                        <IconButton
                          icon={<TrashIcon className="h-4 w-4" />}
                          onClick={() => removeProduct(index)}
                          aria-label="Remove product"
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          ml={2}
                        />
                      </Flex>
                    ))}
                  </Stack>
                ) : (
                  <Text color="gray.500">No products added yet</Text>
                )}
              </Box>
            </Box>
          </TabPanel>
          
          <TabPanel>
            <Box mb={6}>
              <Heading as="h3" size="md" mb={4}>
                Services
              </Heading>
              <Text mb={4}>
                Add your services to help the AI accurately describe what you offer during calls.
              </Text>
              
              <HStack spacing={4} mb={4}>
                <Input
                  placeholder="Add a service (e.g. Implementation Support - $150/hr)"
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addService()}
                />
                <Button
                  leftIcon={<PlusIcon className="h-5 w-5" />}
                  onClick={addService}
                  colorScheme="blue"
                >
                  Add
                </Button>
              </HStack>
              
              <Box mb={4}>
                {knowledgeBase.services.length > 0 ? (
                  <Stack spacing={2}>
                    {knowledgeBase.services.map((service, index) => (
                      <Flex key={index} alignItems="center">
                        <Tag colorScheme="green" size="lg" flex="1">
                          {service}
                        </Tag>
                        <IconButton
                          icon={<TrashIcon className="h-4 w-4" />}
                          onClick={() => removeService(index)}
                          aria-label="Remove service"
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          ml={2}
                        />
                      </Flex>
                    ))}
                  </Stack>
                ) : (
                  <Text color="gray.500">No services added yet</Text>
                )}
              </Box>
            </Box>
          </TabPanel>
          
          <TabPanel>
            <Box mb={6}>
              <Heading as="h3" size="md" mb={4}>
                Company Information
              </Heading>
              <Text mb={4}>
                Provide details about your company to help the AI represent your business accurately.
              </Text>
              
              <Textarea
                placeholder="Enter company information (e.g. company size, founded date, mission statement, target customers, etc.)"
                value={knowledgeBase.company_info}
                onChange={handleCompanyInfoChange}
                rows={6}
                mb={4}
              />
            </Box>
          </TabPanel>
          
          <TabPanel>
            <Box mb={6}>
              <Heading as="h3" size="md" mb={4}>
                Sales Instructions
              </Heading>
              <Text mb={4}>
                Provide specific instructions for how the AI should approach sales calls and lead qualification.
              </Text>
              
              <Textarea
                placeholder="Enter sales instructions (e.g. qualification criteria, specific questions to ask, objection handling approaches, etc.)"
                value={knowledgeBase.sales_instructions}
                onChange={handleSalesInstructionsChange}
                rows={6}
                mb={4}
              />
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
      
      <Flex justifyContent="flex-end">
        <Button
          onClick={saveKnowledgeBase}
          colorScheme="blue"
          isLoading={saving}
          loadingText="Saving..."
        >
          Save & Update AI Knowledge
        </Button>
      </Flex>
    </Box>
  );
} 