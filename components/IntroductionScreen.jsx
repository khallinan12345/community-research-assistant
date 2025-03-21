import React, { useState } from 'react';

const IntroductionScreen = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [villageInfo, setVillageInfo] = useState({
    name: '',
    country: '',
    role: ''
  });
  const [input, setInput] = useState('');
  
  // Introduction steps
  const steps = [
    {
      question: "Welcome to the Community Researcher. To begin, what is the name of your village or town?",
      field: "name",
      placeholder: "Enter village or town name...",
      buttonText: "Next"
    },
    {
      question: "Thank you. In which country is your village located?",
      field: "country",
      placeholder: "Enter country name...",
      buttonText: "Next"
    },
    {
      question: "What is your role in the community?",
      field: "role",
      placeholder: "E.g., Village elder, School teacher, Health worker...",
      buttonText: "Begin Research"
    },
    {
      complete: true,
      message: "Thank you! We're ready to start researching and learning about your community."
    }
  ];
  
  const handleNextStep = () => {
    if (!input.trim()) return;
    
    // Update village info with current input
    const updatedInfo = {
      ...villageInfo,
      [steps[step].field]: input
    };
    
    setVillageInfo(updatedInfo);
    setInput('');
    
    if (step < steps.length - 2) {
      setStep(step + 1);
    } else {
      // Move to final step, then complete introduction
      setStep(step + 1);
      setTimeout(() => onComplete(updatedInfo), 2000);
    }
  };
  
  return (
    <div className="p-6 flex items-center justify-center min-h-screen">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 bg-blue-600 text-white">
          <h1 className="text-2xl font-bold">Community Researcher</h1>
          <p className="mt-2 opacity-90">Empowering communities through collaborative research and dialogue</p>
        </div>
        
        <div className="p-8">
          {/* Progress indicator */}
          <div className="flex mb-8">
            {steps.map((_, index) => (
              <div 
                key={index} 
                className={`h-2 ${index === steps.length - 1 ? 'rounded-r-full' : ''} ${index === 0 ? 'rounded-l-full' : ''} flex-1 mx-1 ${
                  index <= step ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          
          {step < steps.length - 1 ? (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">{steps[step].question}</h2>
              
              <div className="flex items-center">
                <input 
                  type="text"
                  className="flex-1 border rounded-l-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={steps[step].placeholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                />
                <button
                  onClick={handleNextStep}
                  className="bg-blue-600 text-white p-3 rounded-r-md hover:bg-blue-700"
                >
                  {steps[step].buttonText}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mt-4 mb-2">{steps[step].message}</h2>
              <p className="text-gray-600 mb-6">We'll be focusing on information about {villageInfo.name}, {villageInfo.country}.</p>
              <div className="animate-pulse">
                <p className="text-blue-600">Setting up your research assistant...</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Show entered information as it's collected */}
        {villageInfo.name && (
          <div className="px-8 pb-6">
            <div className="p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Community Information:</h3>
              <ul className="space-y-1">
                {villageInfo.name && (
                  <li className="text-sm">
                    <span className="text-gray-500">Village/Town:</span>
                    <span className="ml-2 text-gray-900">{villageInfo.name}</span>
                  </li>
                )}
                {villageInfo.country && (
                  <li className="text-sm">
                    <span className="text-gray-500">Country:</span>
                    <span className="ml-2 text-gray-900">{villageInfo.country}</span>
                  </li>
                )}
                {villageInfo.role && (
                  <li className="text-sm">
                    <span className="text-gray-500">Your Role:</span>
                    <span className="ml-2 text-gray-900">{villageInfo.role}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntroductionScreen;
