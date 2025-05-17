import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import axios from 'axios';
import { API_URL } from '../../config';

const Schedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [topics, setTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [userSubscription, setUserSubscription] = useState('free');
  
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const frequency = watch('frequency', 'daily');

  // Fetch schedules and topics on component mount
  useEffect(() => {
    fetchSchedules();
    fetchTopics();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserSubscription(response.data.subscription_tier);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/schedules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchedules(response.data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load schedules. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/topics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTopics(response.data);
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast.error('Failed to load topics. Please try again.');
    }
  };

  const onSubmit = async (data) => {
    setIsCreating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/schedules`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Schedule created successfully!');
      reset();
      fetchSchedules();
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast.error(error.response?.data?.detail || 'Failed to create schedule. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (scheduleId, currentActive) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/schedules/${scheduleId}`, {
        active: !currentActive
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Schedule ${currentActive ? 'paused' : 'activated'} successfully!`);
      fetchSchedules();
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Failed to update schedule. Please try again.');
    }
  };

  const handleTestRun = async (scheduleId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/trigger-update/${scheduleId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Test run triggered successfully!');
    } catch (error) {
      console.error('Error triggering test run:', error);
      toast.error('Failed to trigger test run. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Schedules</h1>
      
      {/* Create Schedule Form */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Schedule</h2>
        
        {topics.length === 0 ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  You need to create at least one topic before you can create a schedule.
                  <a href="/topics" className="font-medium underline text-yellow-700 hover:text-yellow-600"> Create a topic</a>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  {...register('topic_id', { required: 'Topic is required' })}
                >
                  <option value="">Select a topic</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>{topic.name}</option>
                  ))}
                </select>
                {errors.topic_id && <p className="text-red-500 text-xs mt-1">{errors.topic_id.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  {...register('frequency', { required: 'Frequency is required' })}
                  disabled={userSubscription === 'free'}
                >
                  <option value="daily">Daily</option>
                  {userSubscription === 'paid' && (
                    <option value="hourly">Hourly</option>
                  )}
                </select>
                {userSubscription === 'free' && (
                  <p className="text-xs text-gray-500 mt-1">Upgrade to paid plan for hourly updates</p>
                )}
              </div>
              
              {frequency === 'daily' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time of Day</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    {...register('time_of_day', { required: frequency === 'daily' ? 'Time of day is required' : false })}
                  >
                    {[...Array(24)].map((_, i) => (
                      <option key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                        {i.toString().padStart(2, '0')}:00 {i < 12 ? 'AM' : 'PM'}
                      </option>
                    ))}
                  </select>
                  {errors.time_of_day && <p className="text-red-500 text-xs mt-1">{errors.time_of_day.message}</p>}
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <button
                type="submit"
                disabled={isCreating || topics.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isCreating ? 'Creating...' : 'Create Schedule'}
              </button>
            </div>
          </form>
        )}
      </div>
      
      {/* Schedules List */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Your Schedules</h2>
        
        {isLoading ? (
          <p className="text-gray-500">Loading schedules...</p>
        ) : schedules.length === 0 ? (
          <p className="text-gray-500">No schedules created yet. Create your first schedule above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Run</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedules.map((schedule) => {
                  const topic = topics.find(t => t.id === schedule.topic_id);
                  return (
                    <tr key={schedule.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {topic ? topic.name : `Topic #${schedule.topic_id}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {schedule.frequency === 'daily' ? schedule.time_of_day : 'Every hour'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {schedule.active ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Paused
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {schedule.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleToggleActive(schedule.id, schedule.active)}
                          className="text-indigo-600 hover:text-indigo-900 mr-2"
                        >
                          {schedule.active ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleTestRun(schedule.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Test Run
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedules;
