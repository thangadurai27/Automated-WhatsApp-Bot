import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { API_URL } from '../../config';

const PaymentMethods = ({ onPaymentSuccess, onPaymentError }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('gpay');

  // References to payment form elements
  const cardFormRef = useRef(null);
  const gpayFormRef = useRef(null);
  const phonepeFormRef = useRef(null);

  // Effect to handle payment method toggle
  useEffect(() => {
    const handlePaymentMethodChange = () => {
      if (cardFormRef.current && gpayFormRef.current && phonepeFormRef.current) {
        // Hide all forms first
        cardFormRef.current.style.display = 'none';
        gpayFormRef.current.style.display = 'none';
        phonepeFormRef.current.style.display = 'none';

        // Show the selected form
        if (paymentMethod === 'card') {
          cardFormRef.current.style.display = 'block';
        } else if (paymentMethod === 'gpay') {
          gpayFormRef.current.style.display = 'block';
        } else if (paymentMethod === 'phonepe') {
          phonepeFormRef.current.style.display = 'block';
        }
      }
    };

    handlePaymentMethodChange();

    // Set up event listeners for radio buttons
    const setupRadioListeners = () => {
      const cardRadio = document.getElementById('payment-card');
      const gpayRadio = document.getElementById('payment-gpay');
      const phonepeRadio = document.getElementById('payment-phonepe');

      if (cardRadio && gpayRadio && phonepeRadio) {
        cardRadio.addEventListener('change', () => setPaymentMethod('card'));
        gpayRadio.addEventListener('change', () => setPaymentMethod('gpay'));
        phonepeRadio.addEventListener('change', () => setPaymentMethod('phonepe'));

        return () => {
          cardRadio.removeEventListener('change', () => setPaymentMethod('card'));
          gpayRadio.removeEventListener('change', () => setPaymentMethod('gpay'));
          phonepeRadio.removeEventListener('change', () => setPaymentMethod('phonepe'));
        };
      }
    };

    const cleanup = setupRadioListeners();
    return cleanup;
  }, [paymentMethod]);

  const processPayment = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Validate payment information based on selected method
      if (paymentMethod === 'card') {
        // Validate card details
        const cardNumber = document.querySelector('#card-payment-form input[placeholder="1234 5678 9012 3456"]').value;
        const expDate = document.querySelector('#card-payment-form input[placeholder="MM/YY"]').value;
        const cvc = document.querySelector('#card-payment-form input[placeholder="123"]').value;

        if (!cardNumber || !expDate || !cvc) {
          toast.error('Please fill in all card details');
          setIsProcessing(false);
          return;
        }
      } else if (paymentMethod === 'gpay' || paymentMethod === 'phonepe') {
        // For Google Pay and PhonePe, we'll check if the user has confirmed payment
        // In a real app, you would validate the UPI reference ID
        const upiRefId = document.querySelector(`#${paymentMethod}-payment-form input[placeholder="UPI Reference ID"]`).value;

        if (!upiRefId) {
          // For direct payments, we'll allow proceeding without a reference ID
          // Just show a confirmation dialog
          if (!window.confirm(`Have you completed the payment of ₹1 to +91xxxxxxxxxx via ${paymentMethod === 'gpay' ? 'Google Pay' : 'PhonePe'}?`)) {
            setIsProcessing(false);
            return;
          }
        }
      }

      // For Google Pay, we'll open the Google Pay app directly if on mobile
      if (paymentMethod === 'gpay' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.open('upi://pay?pa=xxxxxxxxxx@xxxxxxx&pn=WhatsAppNewsBot&am=1&cu=INR&tn=Premium Subscription', '_blank');
        // Wait a moment before proceeding
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Show payment method specific success message
      let paymentMethodName = 'card';
      if (paymentMethod === 'gpay') paymentMethodName = 'Google Pay';
      if (paymentMethod === 'phonepe') paymentMethodName = 'PhonePe';

      // Update user subscription tier
      const response = await axios.put(`${API_URL}/users/subscription`,
        {
          subscription_tier: 'premium',
          payment_method: paymentMethod
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      toast.success(`Payment successful via ${paymentMethodName}! Subscription upgraded to Premium.`);

      // Call the success callback
      if (onPaymentSuccess) {
        onPaymentSuccess(response.data);
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error('Failed to process payment. Please try again.');

      // Call the error callback
      if (onPaymentError) {
        onPaymentError(error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="flex items-center">
            <input
              id="payment-card"
              name="payment-method"
              type="radio"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <label htmlFor="payment-card" className="ml-2 block text-sm text-gray-700">
              Credit/Debit Card
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="payment-gpay"
              name="payment-method"
              type="radio"
              defaultChecked
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <label htmlFor="payment-gpay" className="ml-2 block text-sm text-gray-700">
              Google Pay
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="payment-phonepe"
              name="payment-method"
              type="radio"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <label htmlFor="payment-phonepe" className="ml-2 block text-sm text-gray-700">
              PhonePe
            </label>
          </div>
        </div>

        {/* Credit Card Form */}
        <div id="card-payment-form" className="space-y-3" ref={cardFormRef}>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Card Number</label>
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Expiration Date</label>
              <input
                type="text"
                placeholder="MM/YY"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">CVC</label>
              <input
                type="text"
                placeholder="123"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Google Pay Form */}
        <div id="gpay-payment-form" className="space-y-3" ref={gpayFormRef}>
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex items-center mb-3">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Google_Pay_Logo_%282020%29.svg/1200px-Google_Pay_Logo_%282020%29.svg.png" alt="Google Pay" className="h-8 w-8 mr-2" />
              <span className="font-medium text-gray-700 text-lg">Pay with Google Pay</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-indigo-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="font-bold text-xl text-gray-800">₹1</p>
                  <p className="text-sm text-gray-500">WhatsApp News Bot Premium</p>
                </div>
                <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-medium">
                  Monthly
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3 mb-3">
                <p className="font-medium text-gray-700 mb-2">Pay directly to:</p>
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <div className="bg-green-100 rounded-full p-2 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">+91xxxxxxxxxx</p>
                      <p className="text-xs text-gray-500">UPI ID: xxxxxxxxxx@xxxxxxx</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="bg-indigo-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-indigo-700 transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText('+91xxxxxxxxxx');
                      toast.success('GPay number copied to clipboard!');
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center hover:bg-green-700 transition-colors"
                  onClick={() => {
                    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                      window.open('upi://pay?pa=xxxxxxxxxx@xxxxxxx&pn=WhatsAppNewsBot&am=1&cu=INR&tn=Premium Subscription', '_blank');
                    } else {
                      toast.info('Please use your Google Pay mobile app to send payment to +91xxxxxxxxxx');
                    }
                  }}
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Google_Pay_Logo_%282020%29.svg/1200px-Google_Pay_Logo_%282020%29.svg.png" alt="Google Pay" className="h-5 w-5 mr-2" />
                  Pay Now with Google Pay
                </button>
              </div>

              <p className="mt-3 text-xs text-gray-500">After payment, you can optionally enter the UPI reference ID below:</p>
              <input
                type="text"
                placeholder="UPI Reference ID (optional)"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* PhonePe Form */}
        <div id="phonepe-payment-form" className="hidden space-y-3" ref={phonepeFormRef}>
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex items-center mb-3">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/PhonePe_Logo.png/800px-PhonePe_Logo.png" alt="PhonePe" className="h-8 w-8 mr-2" />
              <span className="font-medium text-gray-700 text-lg">Pay with PhonePe</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-purple-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="font-bold text-xl text-gray-800">₹1</p>
                  <p className="text-sm text-gray-500">WhatsApp News Bot Premium</p>
                </div>
                <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">
                  Monthly
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3 mb-3">
                <p className="font-medium text-gray-700 mb-2">Pay directly to:</p>
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <div className="bg-purple-100 rounded-full p-2 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">+91xxxxxxxxxx</p>
                      <p className="text-xs text-gray-500">UPI ID: xxxxxxxxxx@xxxxxxx</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="bg-purple-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-purple-700 transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText('+91xxxxxxxxxx');
                      toast.success('PhonePe number copied to clipboard!');
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center hover:bg-purple-700 transition-colors"
                  onClick={() => {
                    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                      window.open('upi://pay?pa=xxxxxxxxxx@xxxxxxx&pn=WhatsAppNewsBot&am=1&cu=INR&tn=Premium Subscription', '_blank');
                    } else {
                      toast.info('Please use your PhonePe mobile app to send payment to +91xxxxxxxxxx');
                    }
                  }}
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/PhonePe_Logo.png/800px-PhonePe_Logo.png" alt="PhonePe" className="h-5 w-5 mr-2" />
                  Pay Now with PhonePe
                </button>
              </div>

              <p className="mt-3 text-xs text-gray-500">After payment, you can optionally enter the UPI reference ID below:</p>
              <input
                type="text"
                placeholder="UPI Reference ID (optional)"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center">
        <input
          id="save-payment"
          name="save-payment"
          type="checkbox"
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label htmlFor="save-payment" className="ml-2 block text-sm text-gray-900">
          Save payment method for future payments
        </label>
      </div>

      <button
        onClick={processPayment}
        disabled={isProcessing}
        className="w-full flex justify-center py-3 px-4 mt-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
      >
        {isProcessing ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Pay Now - ₹1/month
          </span>
        )}
      </button>
      <p className="mt-2 text-xs text-gray-500 text-center">
        Your payment of ₹1 will be processed immediately. You can cancel anytime.
      </p>
    </div>
  );
};

export default PaymentMethods;
