// Test script for language detection
const testLanguageDetection = () => {
  // Language detection regex patterns
  const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const isChinese = /[\u4E00-\u9FFF]/;
  const isJapanese = /[\u3040-\u309F\u30A0-\u30FF]/;
  const isKorean = /[\uAC00-\uD7AF]/;
  const isThai = /[\u0E00-\u0E7F]/;
  const isHindi = /[\u0900-\u097F]/;

  // Test cases
  const testCases = [
    {
      text: "Hello world, this is English content",
      expected: "English"
    },
    {
      text: "مرحبا بالعالم، هذا محتوى عربي",
      expected: "Arabic"
    },
    {
      text: "你好世界，这是中文内容",
      expected: "Chinese"
    },
    {
      text: "こんにちは世界、これは日本語のコンテンツです",
      expected: "Japanese"
    },
    {
      text: "안녕하세요 세계, 이것은 한국어 콘텐츠입니다",
      expected: "Korean"
    },
    {
      text: "สวัสดีชาวโลก นี่คือเนื้อหาไทย",
      expected: "Thai"
    },
    {
      text: "नमस्ते दुनिया, यह हिंदी सामग्री है",
      expected: "Hindi"
    }
  ];

  console.log("Testing language detection...\n");

  testCases.forEach((testCase, index) => {
    const text = testCase.text;
    
    // Test detection
    const detectedArabic = isArabic.test(text);
    const detectedChinese = isChinese.test(text);
    const detectedJapanese = isJapanese.test(text);
    const detectedKorean = isKorean.test(text);
    const detectedThai = isThai.test(text);
    const detectedHindi = isHindi.test(text);
    
    // Determine language
    let detectedLanguage = 'English';
    if (detectedArabic) detectedLanguage = 'Arabic';
    else if (detectedChinese) detectedLanguage = 'Chinese';
    else if (detectedJapanese) detectedLanguage = 'Japanese';
    else if (detectedKorean) detectedLanguage = 'Korean';
    else if (detectedThai) detectedLanguage = 'Thai';
    else if (detectedHindi) detectedLanguage = 'Hindi';
    
    const passed = detectedLanguage === testCase.expected;
    
    console.log(`Test ${index + 1}: ${passed ? '✅' : '❌'}`);
    console.log(`  Text: ${text.substring(0, 50)}...`);
    console.log(`  Expected: ${testCase.expected}`);
    console.log(`  Detected: ${detectedLanguage}`);
    console.log(`  Arabic: ${detectedArabic}, Chinese: ${detectedChinese}, Japanese: ${detectedJapanese}, Korean: ${detectedKorean}, Thai: ${detectedThai}, Hindi: ${detectedHindi}`);
    console.log('');
  });
};

testLanguageDetection(); 