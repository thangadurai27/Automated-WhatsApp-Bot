import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { API_URL } from '../../config';

const Dashboard = () => {
  const [topics, setTopics] = useState([]);
  const [whatsappNumbers, setWhatsappNumbers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTopic, setNewTopic] = useState({ name: '', keywords: '', country_code: 'us', language: 'en' });
  const [newNumber, setNewNumber] = useState({ phone_number: '' });
  const [newSchedule, setNewSchedule] = useState({ topic_id: '', frequency: 'daily', time_of_day: '08:00', active: true });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Fetch topics
        const topicsResponse = await axios.get(`${API_URL}/topics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTopics(topicsResponse.data);

        // Fetch WhatsApp numbers
        try {
          const numbersResponse = await axios.get(`${API_URL}/whatsapp-numbers`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setWhatsappNumbers(numbersResponse.data);
        } catch (error) {
          console.error('Error fetching WhatsApp numbers:', error);
          setWhatsappNumbers([]);
        }

        // Fetch schedules
        try {
          const schedulesResponse = await axios.get(`${API_URL}/schedules`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSchedules(schedulesResponse.data);
        } catch (error) {
          console.error('Error fetching schedules:', error);
          setSchedules([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddTopic = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/topics`, newTopic, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTopics([...topics, response.data]);
      setNewTopic({ name: '', keywords: '', country_code: 'us', language: 'en' });
      toast.success('Topic added successfully');
    } catch (error) {
      console.error('Error adding topic:', error);
      toast.error(error.response?.data?.detail || 'Failed to add topic');
    }
  };

  const handleAddNumber = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/whatsapp-numbers`, newNumber, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWhatsappNumbers([...whatsappNumbers, response.data]);
      setNewNumber({ phone_number: '' });
      toast.success('WhatsApp number added successfully. Please verify it.');
    } catch (error) {
      console.error('Error adding WhatsApp number:', error);
      toast.error(error.response?.data?.detail || 'Failed to add WhatsApp number');
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/schedules`, newSchedule, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchedules([...schedules, response.data]);
      setNewSchedule({ topic_id: '', frequency: 'daily', time_of_day: '08:00', active: true });
      toast.success('Schedule added successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add schedule');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="mt-4 md:mt-0 flex items-center">
          <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {topics.length} Topics
          </span>
          <span className="ml-3 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
            {whatsappNumbers.length} WhatsApp Numbers
          </span>
          <span className="ml-3 bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            {schedules.length} Schedules
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Topics Section */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">Your Topics</h2>
          </div>

          {topics.length === 0 ? (
            <p className="text-gray-500">No topics added yet.</p>
          ) : (
            <ul className="space-y-2 mb-6">
              {topics.map((topic) => (
                <li key={topic.id} className="p-3 bg-gray-50 rounded">
                  <h3 className="font-medium">{topic.name}</h3>
                  <p className="text-sm text-gray-600">Keywords: {topic.keywords}</p>
                  <p className="text-xs text-gray-500">Country: {topic.country_code.toUpperCase()}, Language: {topic.language}</p>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddTopic} className="space-y-4">
            <h3 className="font-medium">Add New Topic</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={newTopic.name}
                onChange={(e) => setNewTopic({...newTopic, name: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Keywords</label>
              <input
                type="text"
                value={newTopic.keywords}
                onChange={(e) => setNewTopic({...newTopic, keywords: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Country</label>
                <select
                  value={newTopic.country_code}
                  onChange={(e) => setNewTopic({...newTopic, country_code: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="us">United States</option>
                  <option value="gb">United Kingdom</option>
                  <option value="in">India</option>
                  <option value="ca">Canada</option>
                  <option value="au">Australia</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Language</label>
                <select
                  value={newTopic.language}
                  onChange={(e) => setNewTopic({...newTopic, language: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Topic
            </button>
          </form>
        </div>

        {/* WhatsApp Numbers Section */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">Your WhatsApp Numbers</h2>
          </div>

          {whatsappNumbers.length === 0 ? (
            <p className="text-gray-500">No WhatsApp numbers added yet.</p>
          ) : (
            <ul className="space-y-2 mb-6">
              {whatsappNumbers.map((number) => (
                <li key={number.id} className="p-3 bg-gray-50 rounded">
                  <p className="font-medium">{number.phone_number}</p>
                  <p className="text-xs text-gray-500">
                    Status: {number.verified ?
                      <span className="text-green-500">Verified</span> :
                      <span className="text-red-500">Not Verified</span>
                    }
                  </p>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddNumber} className="space-y-4">
            <h3 className="font-medium">Add New WhatsApp Number</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number (with country code)</label>
              <input
                type="text"
                value={newNumber.phone_number}
                onChange={(e) => setNewNumber({...newNumber, phone_number: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="+1234567890"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Number
            </button>
          </form>
        </div>
      </div>

      {/* Schedules Section */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300">
        <div className="flex items-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900">Your Schedules</h2>
        </div>

        {schedules.length === 0 ? (
          <p className="text-gray-500">No schedules added yet.</p>
        ) : (
          <ul className="space-y-2 mb-6">
            {schedules.map((schedule) => {
              const topic = topics.find(t => t.id === schedule.topic_id);
              return (
                <li key={schedule.id} className="p-3 bg-gray-50 rounded">
                  <h3 className="font-medium">{topic ? topic.name : 'Unknown Topic'}</h3>
                  <p className="text-sm text-gray-600">
                    Frequency: {schedule.frequency === 'daily' ? 'Daily' : 'Hourly'}
                    {schedule.frequency === 'daily' && schedule.time_of_day && ` at ${schedule.time_of_day}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    Status: {schedule.active ?
                      <span className="text-green-500">Active</span> :
                      <span className="text-red-500">Inactive</span>
                    }
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={handleAddSchedule} className="space-y-4">
          <h3 className="font-medium">Add New Schedule</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Topic</label>
            <select
              value={newSchedule.topic_id}
              onChange={(e) => setNewSchedule({...newSchedule, topic_id: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            >
              <option value="">Select a topic</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>{topic.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Frequency</label>
            <select
              value={newSchedule.frequency}
              onChange={(e) => setNewSchedule({...newSchedule, frequency: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="daily">Daily</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>
          {newSchedule.frequency === 'daily' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Time of Day</label>
              <input
                type="time"
                value={newSchedule.time_of_day}
                onChange={(e) => setNewSchedule({...newSchedule, time_of_day: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          )}
          <div className="flex items-center">
            <input
              id="active"
              type="checkbox"
              checked={newSchedule.active}
              onChange={(e) => setNewSchedule({...newSchedule, active: e.target.checked})}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Schedule
          </button>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;
