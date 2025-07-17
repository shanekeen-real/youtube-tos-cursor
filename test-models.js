const { GoogleGenerativeAI } = require('@google/generative-ai');

async function checkModels() {
  try {
    console.log('Testing Gemini API access...');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    
    console.log('Listing available models...');
    const models = await genAI.listModels();
    
    console.log('Available models:');
    models.forEach(model => {
      console.log(`- ${model.name}`);
    });
    
    // Test specific model
    console.log('\nTesting specific model: gemini-2.0-flash');
    try {
      const testModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      console.log('Model loaded successfully');
    } catch (err) {
      console.error('Model loading failed:', err.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkModels(); 