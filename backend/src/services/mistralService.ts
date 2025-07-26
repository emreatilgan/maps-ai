import { Mistral } from '@mistralai/mistralai';
import { Coordinates, POI, AIResponse } from '@shared/types';

export class MistralService {
  private mistral: Mistral;

  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY environment variable is required');
    }
    
    this.mistral = new Mistral({
      apiKey: apiKey,
    });
  }

  async processTextQuery(
    query: string, 
    location: Coordinates, 
    nearbyPOIs: POI[],
    poiContext?: POI
  ): Promise<AIResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(location, nearbyPOIs, poiContext);
      const userPrompt = this.buildUserPrompt(query, location, poiContext);

      const response = await this.mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        maxTokens: 1000,
      });

      const responseContent = response.choices?.[0]?.message?.content;
      const responseText = typeof responseContent === 'string' 
        ? responseContent 
        : 'I apologize, but I could not process your request.';
      
      // Check if user is asking for recommendations
      const isAskingForRecommendations = this.isRecommendationRequest(query);
      
      return {
        text: responseText,
        recommendations: isAskingForRecommendations ? this.extractRecommendations(responseText, nearbyPOIs) : [],
        mapActions: {
          center: location,
          markers: isAskingForRecommendations ? nearbyPOIs.slice(0, 5) : [], // Only show markers if asking for recommendations
        }
      };
    } catch (error) {
      console.error('Mistral text processing error:', error);
      return {
        text: 'I apologize, but I encountered an error processing your request. Please try again.',
        recommendations: [],
      };
    }
  }

  async analyzePhoto(
    imageBase64: string, 
    location: Coordinates,
    nearbyPOIs: POI[]
  ): Promise<AIResponse> {
    try {
      const systemPrompt = `You are a knowledgeable city guide AI assistant. You can see images and identify landmarks, buildings, and locations. 
      
Current location: ${location.lat}, ${location.lon}
      
Your task is to:
1. Identify what's in the image
2. If it's a landmark or notable location, provide historical/cultural information
3. Focus on the specific building or location in the image
4. Be conversational, informative, and helpful

IMPORTANT: Do NOT provide recommendations for nearby places unless the user specifically asks for them. Focus only on analyzing what's visible in the image.`;

      const response = await this.mistral.chat.complete({
        model: 'pixtral-12b-2409',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: 'What can you tell me about this place? Focus on what you can see in the image.' },
              { type: 'image_url', imageUrl: `data:image/jpeg;base64,${imageBase64}` }
            ]
          }
        ],
        temperature: 0.7,
        maxTokens: 800,
      });

      const responseContent = response.choices?.[0]?.message?.content;
      const responseText = typeof responseContent === 'string' 
        ? responseContent 
        : 'I could not analyze this image. Please try again.';

      return {
        text: responseText,
        recommendations: [], // No automatic recommendations for photos
        mapActions: {
          center: location,
          markers: [], // No automatic markers for photos
        }
      };
    } catch (error) {
      console.error('Mistral image analysis error:', error);
      return {
        text: 'I apologize, but I could not analyze this image. Please try again with a different photo.',
        recommendations: [],
      };
    }
  }

  private buildSystemPrompt(location: Coordinates, nearbyPOIs: POI[], poiContext?: POI): string {
    let poiContextInfo = '';
    if (poiContext) {
      poiContextInfo = `

SPECIFIC ATTRACTION CONTEXT:
The user is asking about: ${poiContext.name}
Category: ${poiContext.category}${poiContext.subcategory ? ` - ${poiContext.subcategory}` : ''}
Address: ${poiContext.address || 'Not available'}
Description: ${poiContext.description || 'No description available'}
Tags: ${Object.entries(poiContext.tags).map(([k, v]) => `${k}=${v}`).join(', ')}

When responding about this specific attraction, provide:
- Historical background and significance
- What makes it special or worth visiting
- Any interesting facts or stories
- Practical visiting information if available
- Cultural or architectural significance`;
    }

    return `You are an expert AI city guide and local tourism assistant. You have deep knowledge about cities, attractions, restaurants, culture, and history.

Current user location: ${location.lat}, ${location.lon}

Nearby places of interest:
${nearbyPOIs.map(poi => 
  `- ${poi.name} (${poi.category}${poi.subcategory ? ` - ${poi.subcategory}` : ''}): ${poi.description || 'No description available'}
    Address: ${poi.address || 'Not available'}
    Tags: ${Object.entries(poi.tags).map(([k, v]) => `${k}=${v}`).join(', ')}`
).join('\n')}${poiContextInfo}

Your role:
1. Provide helpful, accurate information about locations, attractions, and services
2. Make personalized recommendations based on user queries
3. Share interesting historical, cultural, or local insights
4. Be conversational and engaging
5. Focus on information valuable to tourists and visitors
6. When suggesting places, prioritize those from the nearby POIs list
7. When discussing a specific attraction, provide detailed, engaging information

Always be helpful, informative, and friendly. Provide specific, actionable advice.`;
  }

  private buildUserPrompt(query: string, location: Coordinates, poiContext?: POI): string {
    let poiContextInfo = '';
    if (poiContext) {
      poiContextInfo = `

The user is specifically asking about: ${poiContext.name}
Please provide detailed, engaging information about this attraction.`;
    }

    return `User question: "${query}"

Current location: ${location.lat}, ${location.lon}${poiContextInfo}

Please provide a helpful response as a knowledgeable local guide. Include specific recommendations when relevant.`;
  }

  private extractRecommendations(responseText: string, nearbyPOIs: POI[]): POI[] {
    // Simple extraction logic - look for POI names mentioned in the response
    const recommendations: POI[] = [];
    const responseTextLower = responseText.toLowerCase();
    
    for (const poi of nearbyPOIs) {
      if (responseTextLower.includes(poi.name.toLowerCase())) {
        recommendations.push(poi);
      }
    }
    
    // If no specific mentions, return top 3 relevant POIs
    if (recommendations.length === 0) {
      return nearbyPOIs.slice(0, 3);
    }
    
    return recommendations.slice(0, 5);
  }

  // Add new method to detect recommendation requests
  private isRecommendationRequest(query: string): boolean {
    const recommendationKeywords = [
      'recommend', 'recommendation', 'suggestion', 'suggest',
      'nearby', 'around here', 'close by', 'in the area',
      'what to do', 'what to see', 'places to visit', 'attractions',
      'restaurants', 'cafes', 'shops', 'landmarks', 'points of interest',
      'tourist', 'visit', 'explore', 'discover', 'find'
    ];
    
    const queryLower = query.toLowerCase();
    return recommendationKeywords.some(keyword => queryLower.includes(keyword));
  }
} 