import React, { useState, useRef, useEffect } from 'react';
import { queryOpenAI, generateConversationStarter } from '../utils/api';

const ConversationPhase = ({ villageInfo, onConversationUpdate, conversations, topics, completedTopics }) => {
  const [activeTopic, setActiveTopic] = useState(topics[0]?.id || '');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations[activeTopic]]);
  
  useEffect(() => {
    // Initiate conversation if topic is selected but no conversation exists
    if (activeTopic && (!conversations[activeTopic] || conversations[activeTopic].length === 0)) {
      initiateConversation(activeTopic);
    }
  }, [activeTopic, conversations]);
  
  // Start conversation with initial question
  const initiateConversation = async (topic) => {
    setIsLoading(true);
    
    try {
      // Generate initial question
      const initialQuestion = generateConversationStarter(topic);
      
      // Add initial message to conversation
      const newConversation = [{
        role: 'assistant',
        content: initialQuestion
      }];
      
      // Update conversation state
      onConversationUpdate(topic, newConversation);
    } catch (error) {
      console.error("Error initiating conversation:", error);
      
      // Fallback
      const fallbackQuestion = `I'd like to learn more about ${topic} in ${villageInfo.name}. Could you share some information about this?`;
      
      const newConversation = [{
        role: 'assistant',
        content: fallbackQuestion
      }];
      
      onConversationUpdate(topic, newConversation);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Send user message and get AI response
  const handleSendMessage = async () => {
    if (!message.trim() || !activeTopic || isLoading) return;
    
    // Add user message to conversation
    const currentMessages = conversations[activeTopic] || [];
    const updatedMessages = [
      ...currentMessages,
      { role: 'user', content: message }
    ];
    
    // Update the conversation immediately with user message
    onConversationUpdate(activeTopic, updatedMessages);
    setMessage('');
    setIsLoading(true);
    
    try {
      // Generate AI response
      const response = await queryOpenAI("", {
        messages: [
          {
            role: 'system',
            content: `You are an empathetic conversation partner speaking with a leader from ${villageInfo.name}, ${villageInfo.country}. 
                    Your goal is to gather specific information about ${topics.find(t => t.id === activeTopic)?.title || activeTopic} in their community.
                    Ask thoughtful follow-up questions to get quantitative data where possible.
                    Be respectful, supportive, and a good listener. Do not tell the leader what their community needs.
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
        aiResponse = generateFallbackResponse(activeTopic, updatedMessages);
      }
      
      // Add AI response to conversation
      const messagesWithResponse = [
        ...updatedMessages,
        { role: 'assistant', content: aiResponse }
      ];
      
      onConversationUpdate(activeTopic, messagesWithResponse);
    } catch (error) {
      console.error("Error in conversation:", error);
      
      // Fallback response
      const fallbackResponse = generateFallbackResponse(activeTopic, updatedMessages);
      
      const messagesWithResponse = [
        ...updatedMessages,
        { role: 'assistant', content: fallbackResponse }
      ];
      
      onConversationUpdate(activeTopic, messagesWithResponse);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate fallback response based on conversation context
  const generateFallbackResponse = (topic, conversationHistory) => {
    const userMessages = conversationHistory.filter(msg => msg.role === 'user').length;
    const lastUserMessage = conversationHistory[conversationHistory.length - 1].content.toLowerCase();
    
    // Check if user indicates repetition or lack of new information
    if (
      lastUserMessage.includes("already answered") || 
      lastUserMessage.includes("just told you") || 
      lastUserMessage.includes("i said")
    ) {
      return `I apologize for any repetition. Thank you for that information. Would you like to tell me more about another aspect of ${topic} in ${villageInfo.name}?`;
    }
    
    // Demographics conversation flow
    if (topic === 'demographics') {
      if (userMessages === 1) {
        return `Thank you for sharing that information. Could you tell me about the age distribution in ${villageInfo.name}? For example, is there a large proportion of children, working-age adults, or elderly people?`;
      } else if (userMessages === 2) {
        return `That's helpful to understand. Have there been any significant changes in the population over the past few years? For example, are people moving away to cities or are new people moving in?`;
      } else {
        return `Thank you for sharing these details about ${villageInfo.name}. This helps me understand your community better. Is there anything else important about the people and families in your village that would be helpful for me to know?`;
      }
    }
    
    // Agriculture conversation flow
    if (topic === 'agriculture') {
      if (userMessages === 1) {
        return `Thank you for that information about agriculture. Do most families keep any livestock or animals? If so, what types and roughly what percentage of households have them?`;
      } else if (userMessages === 2) {
        return `I see. Have you noticed any changes in agricultural productivity over recent years? Are harvests getting better, worse, or staying about the same?`;
      } else {
        return `This information is very helpful. What would you say are the biggest challenges farmers in ${villageInfo.name} face today?`;
      }
    }
    
    // Default response when we don't have a specific follow-up
    return `Thank you for sharing that information about ${topic} in ${villageInfo.name}. Could you tell me more about how this affects daily life in your community?`;
  };
  
  return (
    <div className="flex gap-6">
      {/* Topic Navigation */}
      <div className="w-1/4">
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Conversation Topics</h2>
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
                    {completedTopics[topic.id] && (
                      <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Conversation guide panel */}
        <div className="bg-white shadow rounded-lg p-4 mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Conversation Guide</h3>
          <div className="text-xs text-gray-600">
            <p className="mb-2">• Ask one question at a time</p>
            <p className="mb-2">• Listen more than you speak</p>
            <p className="mb-2">• Seek specific details and examples</p>
            <p className="mb-2">• Respect local knowledge and expertise</p>
            <p>• Focus on strengths and opportunities</p>
          </div>
        </div>
      </div>
      
      {/* Conversation Area */}
      <div className="w-3/4">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Conversation: {topics.find(t => t.id === activeTopic)?.title || 'Select a topic'}
            </h2>
            
            <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-800">
              Speaking with: {villageInfo.role}
            </div>
          </div>
          
          {/* Context banner */}
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Conversation purpose:</span> Gathering local knowledge about {topics.find(t => t.id === activeTopic)?.title?.toLowerCase() || 'this topic'} in {villageInfo.name} directly from community leaders.
            </p>
          </div>
          
          {/* Conversation Messages */}
          <div className="h-96 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-md">
            {conversations[activeTopic]?.length > 0 ? (
              <div className="space-y-4">
                {conversations[activeTopic].map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-3/4 rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="text-xs text-gray-500 mb-1">AI Researcher:</div>
                      )}
                      {message.role === 'user' && (
                        <div className="text-xs text-blue-500 mb-1">{villageInfo.role}:</div>
                      )}
                      <p>{message.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-2">Starting conversation...</p>
                <p className="text-gray-400 text-sm max-w-md">
                  Preparing to discuss {activeTopic} in {villageInfo.name} with {villageInfo.role}.
                </p>
              </div>
            )}
          </div>
          
          {/* Message Input */}
          <div className="flex items-center">
            <input
              type="text"
              className="flex-1 border rounded-l-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Share information about ${topics.find(t => t.id === activeTopic)?.title || 'this topic'} in ${villageInfo.name}...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading}
              className="bg-blue-600 text-white p-3 rounded-r-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
          
          {/* How information will be used */}
          {conversations[activeTopic]?.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-700">How this information will be used:</h3>
              <p className="text-xs text-gray-600 mt-1">
                Insights from this conversation will be combined with web research to create a comprehensive understanding of {topics.find(t => t.id === activeTopic)?.title?.toLowerCase() || 'this topic'} in {villageInfo.name}. This helps ensure that any potential solutions are grounded in local reality and community priorities.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationPhase;