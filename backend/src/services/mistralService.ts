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
    nearbyPOIs: POI[]
  ): Promise<AIResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(location, nearbyPOIs);
      const userPrompt = this.buildUserPrompt(query, location);

      const response = await this.mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        maxTokens: 1000,
      });

      const responseText = response.choices?.[0]?.message?.content || 'I apologize, but I could not process your request.';
      
      return {
        text: responseText,
        recommendations: this.extractRecommendations(responseText, nearbyPOIs),
        mapActions: {
          center: location,
          markers: nearbyPOIs.slice(0, 5), // Show top 5 relevant POIs
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
      
Nearby places of interest:
${nearbyPOIs.map(poi => `- ${poi.name} (${poi.category}): ${poi.description || 'No description'}`).join('\n')}

Your task is to:
1. Identify what's in the image
2. If it's a landmark or notable location, provide historical/cultural information
3. Connect it to nearby places if relevant
4. Provide tourist recommendations based on what you see

Be conversational, informative, and helpful. Focus on information that would be valuable to a tourist.`;

      const response = await this.mistral.chat.complete({
        model: 'pixtral-12b-2409',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: 'What can you tell me about this place? What should I know as a tourist?' },
              { type: 'image_url', image_url: `data:image/jpeg;base64,${imageBase64}` }
            ]
          }
        ],
        temperature: 0.7,
        maxTokens: 800,
      });

      const responseText = response.choices?.[0]?.message?.content || 'I could not analyze this image. Please try again.';

      return {
        text: responseText,
        recommendations: nearbyPOIs.slice(0, 3),
        mapActions: {
          center: location,
          markers: nearbyPOIs,
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

  private buildSystemPrompt(location: Coordinates, nearbyPOIs: POI[]): string {
    return `You are an expert AI city guide and local tourism assistant. You have deep knowledge about cities, attractions, restaurants, culture, and history.

Current user location: ${location.lat}, ${location.lon}

Nearby places of interest:
${nearbyPOIs.map(poi => 
  `- ${poi.name} (${poi.category}${poi.subcategory ? ` - ${poi.subcategory}` : ''}): ${poi.description || 'No description available'}
    Address: ${poi.address || 'Not available'}
    Tags: ${Object.entries(poi.tags).map(([k, v]) => `${k}=${v}`).join(', ')}`
).join('\n')}

Your role:
1. Provide helpful, accurate information about locations, attractions, and services
2. Make personalized recommendations based on user queries
3. Share interesting historical, cultural, or local insights
4. Be conversational and engaging
5. Focus on information valuable to tourists and visitors
6. When suggesting places, prioritize those from the nearby POIs list

Always be helpful, informative, and friendly. Provide specific, actionable advice.`;
  }

  private buildUserPrompt(query: string, location: Coordinates): string {
    return `User question: "${query}"

Current location: ${location.lat}, ${location.lon}

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
} 