class ImageService {
  private imagenApiKey: string;
  private isConfigured: boolean;
  private imageGenBaseUrl: string;

  constructor() {
    // Ensure you have VITE_IMAGEN_API_KEY in your .env file
    this.imagenApiKey = import.meta.env.VITE_IMAGEN_API_KEY || '';
    this.imageGenBaseUrl = 'https://us-central1-aiplatform.googleapis.com/v1/projects/your-gcp-project-id/locations/us-central1/publishers/google/models/imagen-3.0-generate-002:predict';
    
    this.isConfigured = !!this.imagenApiKey && this.imagenApiKey !== 'your_imagen_api_key_here';

    if (!this.isConfigured) {
      console.warn('⚠️ Google Imagen API key not configured. Image generation will be disabled.');
    } else {
      console.log('✅ Image Service ready with Google Imagen API');
    }
  }

  // This is the function the error message is looking for.
  isImagenConfigured(): boolean {
    return this.isConfigured;
  }

  async generateImage(prompt: string): Promise<string> {
    if (!this.isConfigured) {
      return `https://placehold.co/600x400/333/FFF?text=Image+Gen+Disabled`;
    }

    try {
      const response = await fetch(this.imageGenBaseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.imagenApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instances: [{
            prompt: prompt
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
            safetyFilterLevel: "block_some",
            personGeneration: "dont_allow"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Imagen API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.predictions && data.predictions.length > 0) {
        const imageData = data.predictions[0];
        return `data:${imageData.mimeType};base64,${imageData.bytesBase64Encoded}`;
      }

      throw new Error('No image generated from Imagen API');
    } catch (error) {
      console.error('Image generation error:', error);
      return `https://placehold.co/600x400/333/FFF?text=Image+Gen+Error`;
    }
  }
}

// Export a single instance of the service for the whole app to use
export const imageService = new ImageService();