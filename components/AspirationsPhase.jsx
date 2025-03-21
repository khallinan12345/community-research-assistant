import React, { useState, useRef, useEffect } from 'react';
import { queryOpenAI, generateAspirationQuestion } from '../utils/api';

const AspirationsPhase = ({ villageInfo, onAspirationsUpdate, conversations, topics, completedTopics, aspirationsData }) => {
  const [activeTopic, setActiveTopic] = useState(topics[0]?.id || '');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Get the actual conversation key for this topic's aspirations
  const getConversationKey = (topicId) => `${topicId}_aspirations`;
  
  // Get current active conversation
  const activeConversationKey = getConversationKey(activeTopic);
  const activeConversation = conversations[activeConversationKey] || [];
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation]);
  
  useEffect(() => {
    // Initiate conversation if topic is selected but no conversation exists
    if (activeTopic && (!conversations[activeConversationKey] || conversations[activeConversationKey].length === 0)) {
      initiateAspirationConversation(activeTopic);
    }
  }, [activeTopic, conversations, activeConversationKey]);
  
  // Start aspiration conversation with initial question
  const initiateAspirationConversation = async (topic) => {
    setIsLoading(true);
    
    try {
      // Generate initial question about aspirations
      const initialQuestion = generateAspirationQuestion(topic);
      
      // Add initial message to conversation
      const newConversation = [{
        role: 'assistant',
        content: initialQuestion
      }];
      
      // Update conversation state - use the key with _aspirations suffix
      onAspirationsUpdate(getConversationKey(topic), newConversation);
    } catch (error) {
      console.error("Error initiating aspiration conversation:", error);
      
      // Fallback
      const fallbackQuestion = `What are your community's hopes and aspirations regarding ${topic}? What prevents these aspirations from being realized?`;
      
      const newConversation = [{
        role: 'assistant',
        content: fallbackQuestion
      }];
      
      onAspirationsUpdate(getConversationKey(topic), newConversation);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Send user message and get AI response
  const handleSendMessage = async () => {
    if (!message.trim() || !activeTopic || isLoading) return;
    
    // Add user message to conversation
    const updatedMessages = [
      ...activeConversation,
      { role: 'user', content: message }
    ];
    
    // Update the conversation immediately with user message
    onAspirationsUpdate(activeConversationKey, updatedMessages);
    setMessage('');
    setIsLoading(true);
    
    try {
      // Generate AI response
      const response = await queryOpenAI("", {
        messages: [
          {
            role: 'system',
            content: `You are an empathetic conversation partner speaking with a leader from ${villageInfo.name}, ${villageInfo.country}. 
                    Your goal is to understand the community's hopes, aspirations, and the challenges they face regarding ${topics.find(t => t.id === activeTopic)?.title || activeTopic}.
                    Ask thoughtful questions about what they want for their community's future and what prevents them from achieving these goals.
                    Be supportive and educational about possibilities without being prescriptive.
                    Keep your responses fairly concise, focused on one specific question at a time.`
          },
          ...updatedMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ]
      });
      
      // Process response
      let aiResponse = '';
      if (response && response[0] && response[0].generated_text) {
        aiResponse = response[0].generated_text;
      } else if (typeof response === 'string') {
        aiResponse = response;
      } else {
        // Fallback response
        aiResponse = generateFallbackAspirationResponse(activeTopic, updatedMessages);
      }
      
      // Add AI response to conversation
      const messagesWithResponse = [
        ...updatedMessages,
        { role: 'assistant', content: aiResponse }
      ];
      
      // Update conversation with AI response
      onAspirationsUpdate(activeConversationKey, messagesWithResponse);
      
      // If we have at least 2 responses from the user, consider this topic complete
      // and extract the aspirations and challenges
      if (messagesWithResponse.filter(m => m.role === 'user').length >= 1) {
        const userResponses = messagesWithResponse
          .filter(m => m.role === 'user')
          .map(m => m.content)
          .join(" ");
        
        // Update aspirations data for this topic
        onAspirationsUpdate(activeTopic, userResponses);
        
        // Mark as completed
        if (!completedTopics[activeConversationKey]) {
          const updatedCompletedTopics = { ...completedTopics };
          updatedCompletedTopics[activeConversationKey] = true;
          // You'll need to add this function parameter and implement it in the parent component
          // Uncomment this when you add the function to the parent:
          // onCompletedTopicsUpdate(updatedCompletedTopics);
        }
      }
    } catch (error) {
      console.error("Error in aspiration conversation:", error);
      
      // Fallback response
      const fallbackResponse = generateFallbackAspirationResponse(activeTopic, updatedMessages);
      
      const messagesWithResponse = [
        ...updatedMessages,
        { role: 'assistant', content: fallbackResponse }
      ];
      
      onAspirationsUpdate(activeConversationKey, messagesWithResponse);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate fallback aspiration response
  const generateFallbackAspirationResponse = (topic, conversationHistory) => {
    const userMessages = conversationHistory.filter(msg => msg.role === 'user').length;
    
    if (userMessages === 1) {
      return `Thank you for sharing those aspirations. What would you say are the main obstacles or challenges that prevent your community from achieving these goals related to ${topic}?`;
    } else if (userMessages === 2) {
      return `I appreciate your insights about both the aspirations and challenges. Have there been any previous attempts to address these challenges? What worked or didn't work?`;
    } else {
      return `Thank you for sharing these valuable perspectives. In your view, what would be the most important first step toward realizing your community's aspirations for ${topic}?`;
    }
  };
  
  return (
    <div className="flex gap-6">
      {/* Topic Navigation */}
      <div className="w-1/4">
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Aspiration Areas</h2>
          <ul className="space-y-2">
            {topics.map((topic) => (
              <li key={topic.id}>
                <button
                  onClick={() => setActiveTopic(topic.id)}
                  className={`w-full text-left px-3 py-2 rounded-md ${
                    activeTopic === topic.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{topic.title}</span>
                    {completedTopics[getConversationKey(topic.id)] && (
                      <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Aspirations guide panel */}
        <div className="bg-white shadow rounded-lg p-4 mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Aspirations Guide</h3>
          <div className="text-xs text-gray-600">
            <p className="mb-2">• Focus on community hopes and dreams</p>
            <p className="mb-2">• Identify obstacles to progress</p>
            <p className="mb-2">• Understand previous attempts</p>
            <p className="mb-2">• Respect local priorities</p>
            <p>• Be supportive without being prescriptive</p>
          </div>
        </div>
      </div>
      
      {/* Conversation Area */}
      <div className="w-3/4">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Aspirations: {topics.find(t => t.id === activeTopic)?.title || 'Select a topic'}
            </h2>
            
            <div className="px-3 py-1 rounded-full bg-purple-100 text-purple-800">
              Speaking with: {villageInfo.role}
            </div>
          </div>
          
          {/* Context banner */}
          <div className="mb-4 p-3 bg-purple-50 rounded-md">
            <p className="text-sm text-purple-800">
              <span className="font-medium">Aspirations purpose:</span> Understanding community hopes, aspirations, and obstacles related to {topics.find(t => t.id === activeTopic)?.title?.toLowerCase() || 'this area'} in {villageInfo.name}.
            </p>
          </div>
          
          {/* Conversation Messages */}
          <div className="h-96 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-md">
            {activeConversation?.length > 0 ? (
              <div className="space-y-4">
                {activeConversation.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-3/4 rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-purple-100 text-purple-900'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="text-xs text-gray-500 mb-1">AI Researcher:</div>
                      )}
                      {message.role === 'user' && (
                        <div className="text-xs text-purple-500 mb-1">{villageInfo.role}:</div>
                      )}
                      <p>{message.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-2">Starting aspirations conversation...</p>
                <p className="text-gray-400 text-sm max-w-md">
                  Preparing to discuss community hopes and aspirations for {topics.find(t => t.id === activeTopic)?.title?.toLowerCase() || 'this area'} in {villageInfo.name}.
                </p>
              </div>
            )}
          </div>
          
          {/* Message Input */}
          <div className="flex items-center">
            <input
              type="text"
              className="flex-1 border rounded-l-md p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder={`Share aspirations or challenges about ${topics.find(t => t.id === activeTopic)?.title?.toLowerCase() || 'this area'} in ${villageInfo.name}...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading}
              className="bg-purple-600 text-white p-3 rounded-r-md hover:bg-purple-700 disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
          
          {/* How aspirations will be used */}
          {activeConversation?.length > 0 && (
            <div className="mt-4 p-3 bg-purple-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-700">How aspirations will be used:</h3>
              <p className="text-xs text-gray-600 mt-1">
                Understanding community aspirations and obstacles helps ensure that potential solutions align with local priorities and address the real challenges faced by {villageInfo.name}. This information will be included in the final report to guide any development initiatives.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AspirationsPhase;