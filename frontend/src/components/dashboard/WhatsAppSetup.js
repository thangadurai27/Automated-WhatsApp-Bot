import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import axios from 'axios';
import { API_URL } from '../../config';

const WhatsAppSetup = () => {
  const [whatsappNumbers, setWhatsappNumbers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const { register: registerAdd, handleSubmit: handleSubmitAdd, reset: resetAdd, formState: { errors: errorsAdd } } = useForm();
  const { register: registerVerify, handleSubmit: handleSubmitVerify, reset: resetVerify, formState: { errors: errorsVerify } } = useForm();

  // Fetch WhatsApp numbers on component mount
  useEffect(() => {
    fetchWhatsAppNumbers();
  }, []);

  const fetchWhatsAppNumbers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/whatsapp-numbers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWhatsappNumbers(response.data);
    } catch (error) {
      console.error('Error fetching WhatsApp numbers:', error);
      toast.error('Failed to load WhatsApp numbers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitAdd = async (data) => {
    setIsAdding(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/whatsapp-numbers`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('WhatsApp number added! Please verify it.');
      resetAdd();
      fetchWhatsAppNumbers();
      setSelectedNumber(response.data);
    } catch (error) {
      console.error('Error adding WhatsApp number:', error);
      toast.error(error.response?.data?.detail || 'Failed to add WhatsApp number. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const onSubmitVerify = async (data) => {
    if (!selectedNumber) return;
    
    setIsVerifying(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/whatsapp-numbers/verify/${selectedNumber.id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('WhatsApp number verified successfully!');
      resetVerify();
      setSelectedNumber(null);
      fetchWhatsAppNumbers();
    } catch (error) {
      console.error('Error verifying WhatsApp number:', error);
      toast.error(error.response?.data?.detail || 'Failed to verify WhatsApp number. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">WhatsApp Setup</h1>
      
      {/* Add WhatsApp Number Form */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Add WhatsApp Number</h2>
        <form onSubmit={handleSubmitAdd(onSubmitAdd)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="E.g., +1234567890 (with country code)"
                {...registerAdd('phone_number', { 
                  required: 'Phone number is required',
                  pattern: {
                    value: /^\+[1-9]\d{1,14}$/,
                    message: 'Please enter a valid phone number with country code (e.g., +1234567890)'
                  }
                })}
              />
              {errorsAdd.phone_number && <p className="text-red-500 text-xs mt-1">{errorsAdd.phone_number.message}</p>}
            </div>
          </div>
          
          <div className="mt-4">
            <button
              type="submit"
              disabled={isAdding}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isAdding ? 'Adding...' : 'Add Number'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Verify WhatsApp Number Form */}
      {selectedNumber && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Verify WhatsApp Number</h2>
          <p className="mb-4 text-gray-600">
            We've sent a verification code to your WhatsApp number. Please enter it below to complete verification.
          </p>
          <form onSubmit={handleSubmitVerify(onSubmitVerify)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter 6-digit code"
                  {...registerVerify('code', { 
                    required: 'Verification code is required',
                    pattern: {
                      value: /^\d{6}$/,
                      message: 'Please enter a valid 6-digit code'
                    }
                  })}
                />
                {errorsVerify.code && <p className="text-red-500 text-xs mt-1">{errorsVerify.code.message}</p>}
              </div>
            </div>
            
            <div className="mt-4">
              <button
                type="submit"
                disabled={isVerifying}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {isVerifying ? 'Verifying...' : 'Verify Number'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedNumber(null)}
                className="ml-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* WhatsApp Numbers List */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Your WhatsApp Numbers</h2>
        
        {isLoading ? (
          <p className="text-gray-500">Loading WhatsApp numbers...</p>
        ) : whatsappNumbers.length === 0 ? (
          <p className="text-gray-500">No WhatsApp numbers added yet. Add your first number above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {whatsappNumbers.map((number) => (
                  <tr key={number.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{number.phone_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {number.verified ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Verified
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending Verification
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {number.verified_at ? new Date(number.verified_at).toLocaleString() : 'Not verified yet'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {!number.verified && (
                        <button
                          onClick={() => setSelectedNumber(number)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppSetup;
