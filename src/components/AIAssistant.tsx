import React, { useState } from 'react';
import { MessageCircle, Send, X, Mic, Plus, Trash2 } from 'lucide-react';
import { aiService } from '../services/aiService';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  isOpen: boolean;
  onToggle: () => void;
  onUpdateItinerary: (update: string) => void;
  tripPlan: any;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onToggle, onUpdateItinerary, tripPlan }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hi! I'm your AI travel assistant. I can help you modify your itinerary in real-time! Try asking me: 'Add a sunset viewpoint on Day 2', 'Change Day 1 lunch to local street food', or 'Make Day 3 more adventurous'. I'll automatically update your trip plan!",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUpdatingItinerary, setIsUpdatingItinerary] = useState(false);
  const [isAIConfigured] = useState(aiService.isAIConfigured());

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Check if this is a modification request
      const isModification = isModificationRequest(inputValue);
      
      if (isAIConfigured) {
        const response = await getAIResponse(inputValue, isModification);
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // If it's a modification request, trigger the itinerary update
        if (isModification) {
          setIsUpdatingItinerary(true);
          // Add a small delay to show the AI is processing
          setTimeout(() => {
            onUpdateItinerary(inputValue);
            setIsUpdatingItinerary(false);
          }, 1000);
        }
      } else {
        const response = generateSmartResponse(inputValue);
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Even in demo mode, trigger itinerary updates for modification requests
        if (isModification) {
          setIsUpdatingItinerary(true);
          setTimeout(() => {
            onUpdateItinerary(inputValue);
            setIsUpdatingItinerary(false);
          }, 1500);
        }
      }
    } catch (error) {
      console.error('AI Response Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again or ask me something else about your trip.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const getAIResponse = async (userInput: string, isModification: boolean): Promise<string> => {
    try {
      const contextPrompt = tripPlan ? `
Current trip context:
- Destination: ${tripPlan.travelInfo?.destination}
- Duration: ${tripPlan.travelInfo?.numberOfDays} days
- Budget: ${tripPlan.travelInfo?.budget}
- Travel Group: ${tripPlan.travelInfo?.travelGroup}
- Current activities: ${tripPlan.itinerary?.map((day: any) => 
  `Day ${day.day}: ${day.activities?.map((act: any) => act.title).join(', ')}`
).join('; ')}
` : '';

      const systemPrompt = isModification ? 
        `You are a helpful AI travel assistant. The user wants to modify their itinerary. Acknowledge their request enthusiastically and explain what changes you'll make. Be specific about which day and what type of activity you'll add/change/remove.

${contextPrompt}

User request: ${userInput}

Respond as if you're actively making the changes to their itinerary. Use phrases like "I'm updating your itinerary now..." or "Perfect! I'm adding that to Day X..." Keep it under 100 words.` :
        `You are a helpful AI travel assistant. Provide helpful, friendly advice about travel. Keep responses concise but informative.

${contextPrompt}

User question: ${userInput}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: systemPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200
          }
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('⚠️ Gemini API quota exhausted for AI assistant. Using smart response.');
        }
        throw new Error('AI API error');
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (content) {
        return content.trim();
      }
      
      throw new Error('No content received');
    } catch (error) {
      console.error('AI API Error:', error);
      return generateSmartResponse(userInput);
    }
  };

  const generateSmartResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    // Enhanced modification responses with trip context
    if (input.includes('add') || input.includes('include')) {
      const destination = tripPlan?.travelInfo?.destination || 'your destination';
      return `Perfect! I'm updating your ${destination} itinerary right now to include that activity. I'll find the best time slot and make sure it fits perfectly with your existing plans. Your itinerary will refresh automatically! ✨`;
    }
    
    if (input.includes('change') || input.includes('replace') || input.includes('modify')) {
      return `Great idea! I'm making those changes to your itinerary now. I'll update the activity and adjust the surrounding schedule to ensure everything flows smoothly. Watch your itinerary refresh with the new suggestions! 🔄`;
    }
    
    if (input.includes('remove') || input.includes('delete')) {
      return `No problem! I'm removing that from your itinerary and optimizing the remaining activities. This will give you more time to enjoy your other planned experiences. Your updated schedule is being generated now! ⚡`;
    }
    
    if (input.includes('restaurant') || input.includes('food') || input.includes('dining') || input.includes('eat')) {
      return `Excellent choice! I'm updating your dining recommendations with amazing local restaurants that match your preferences. I'll make sure they're perfectly located near your activities. Your meal plan is being refreshed! 🍽️`;
    }
    
    if (input.includes('day') && (input.includes('more') || input.includes('less') || input.includes('different'))) {
      const dayMatch = input.match(/day (\d+)/);
      const dayNum = dayMatch ? dayMatch[1] : 'that';
      return `I'm completely redesigning Day ${dayNum} based on your preferences! I'll create a fresh set of activities that better match what you're looking for. Your itinerary will update automatically with the new plan! 🎯`;
    }

    // Travel advice questions with context
    if (input.includes('what should i') || input.includes('what can i') || input.includes('recommend')) {
      const destination = tripPlan?.travelInfo?.destination || 'your destination';
      return `Based on your ${destination} itinerary, I'd recommend checking the weather forecast and booking popular restaurants in advance. I can also modify your current plan if you'd like to add specific activities - just ask me! 🌟`;
    }
    
    // Default intelligent response with trip context
    const destination = tripPlan?.travelInfo?.destination || 'your destination';
    const days = tripPlan?.travelInfo?.numberOfDays || 'your';
    return `I'm here to help customize your ${days}-day ${destination} adventure! I can add activities, change restaurants, modify any day's schedule, or answer travel questions. Just tell me what you'd like to change and I'll update your itinerary automatically! ✈️`;
  };

  const isModificationRequest = (input: string): boolean => {
    const modificationKeywords = [
      'add', 'remove', 'change', 'update', 'replace', 'modify', 'include', 'delete',
      'swap', 'switch', 'move', 'shift', 'make more', 'make less', 'different',
      'instead of', 'rather than', 'prefer', 'want to', 'can we', 'let\'s'
    ];
    const lowerInput = input.toLowerCase();
    return modificationKeywords.some(keyword => lowerInput.includes(keyword));
  };

  const quickSuggestions = [
    "Add a sunset viewpoint to Day 2",
    "Change Day 1 lunch to local street food",
    "Make Day 3 more adventurous",
    "Add a cooking class experience",
    "Include more cultural activities",
    "Replace museum with outdoor activity"
  ];

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 z-50"
      >
        <MessageCircle className="w-8 h-8 mx-auto" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold">AI Travel Assistant</span>
          {!isAIConfigured && (
            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
              Demo Mode
            </span>
          )}
        </div>
        <button onClick={onToggle} className="hover:bg-white/20 rounded-lg p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-2xl ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white ml-4'
                  : 'bg-gray-100 text-gray-800 mr-4'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-2xl mr-4">
              <p className="text-xs text-gray-500 mb-2">AI is thinking...</p>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        {isUpdatingItinerary && (
          <div className="flex justify-start">
            <div className="bg-blue-100 p-3 rounded-2xl mr-4 border border-blue-200">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-blue-700 font-medium">Updating your itinerary...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Suggestions */}
      {messages.length === 1 && (
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Try these to modify your itinerary:</p>
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.slice(0, 3).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setInputValue(suggestion)}
                className="text-xs px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full transition-colors border border-blue-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask me anything about your trip..."
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping || isUpdatingItinerary}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isUpdatingItinerary ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        
        <div className="flex justify-center gap-4 mt-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Mic className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;