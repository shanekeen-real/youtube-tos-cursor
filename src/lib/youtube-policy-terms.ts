import { SeverityLevel } from '../types/ai-analysis';

// YouTube Policy Terms Database
// Based on official YouTube Community Guidelines and Advertiser-Friendly Content Guidelines
// Organized by category with severity levels (HIGH, MEDIUM, LOW)

export interface PolicyTerm {
  term: string;
  category: string;
  severity: SeverityLevel;
  explanation: string;
  variations?: string[];
}

export const YOUTUBE_POLICY_TERMS: PolicyTerm[] = [
  // ===== VIOLENCE & GRAPHIC CONTENT =====
  {
    term: 'kill',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_VIOLENCE',
    explanation: 'References to killing or death',
    variations: ['killing', 'killed', 'kills']
  },
  {
    term: 'murder',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_VIOLENCE',
    explanation: 'References to murder or homicide',
    variations: ['murdered', 'murdering', 'murderer']
  },
  {
    term: 'gun',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_VIOLENCE',
    explanation: 'References to firearms',
    variations: ['guns', 'gunshot', 'gunfire', 'shooting']
  },
  {
    term: 'weapon',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_VIOLENCE',
    explanation: 'References to weapons',
    variations: ['weapons', 'armed', 'firearm']
  },
  {
    term: 'blood',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_VIOLENCE',
    explanation: 'Graphic references to blood',
    variations: ['bloody', 'bleeding', 'gore']
  },
  {
    term: 'gore',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_VIOLENCE',
    explanation: 'Graphic violent content',
    variations: ['gory', 'graphic', 'disturbing']
  },
  {
    term: 'fight',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_VIOLENCE',
    explanation: 'Physical violence or fighting',
    variations: ['fighting', 'fought', 'brawl', 'attack']
  },
  {
    term: 'attack',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_VIOLENCE',
    explanation: 'References to attacks or assault',
    variations: ['attacking', 'attacked', 'assault']
  },

  // ===== DANGEROUS ACTS & CHALLENGES =====
  {
    term: 'challenge',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'Potentially dangerous challenges',
    variations: ['challenges', 'dare', 'stunt']
  },
  {
    term: 'dangerous',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'References to dangerous activities',
    variations: ['danger', 'risky', 'hazardous']
  },
  {
    term: 'suicide',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'References to self-harm or suicide',
    variations: ['self-harm', 'cutting', 'overdose']
  },
  {
    term: 'drug',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'Illegal drug references',
    variations: ['drugs', 'drug use', 'illegal drugs']
  },
  {
    term: 'acid',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'LSD or other hallucinogenic drugs',
    variations: ['LSD', 'tabs', 'tripping']
  },
  {
    term: 'weed',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'Marijuana references',
    variations: ['marijuana', 'cannabis', 'pot', 'blunt']
  },
  {
    term: 'heroin',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'Hard drug references',
    variations: ['cocaine', 'meth', 'crack']
  },

  // ===== HATE SPEECH & DISCRIMINATION =====
  {
    term: 'hitler',
    severity: 'HIGH',
    category: 'COMMUNITY_STANDARDS_HATE_SPEECH',
    explanation: 'References to Nazi ideology',
    variations: ['nazi', 'fascist', 'adolf', 'adolf hitler', 'hitler']
  },
  {
    term: 'nazi',
    severity: 'HIGH',
    category: 'COMMUNITY_STANDARDS_HATE_SPEECH',
    explanation: 'Nazi references or symbols',
    variations: ['fascist', 'supremacist', 'extremist']
  },
  {
    term: 'racist',
    severity: 'HIGH',
    category: 'COMMUNITY_STANDARDS_HATE_SPEECH',
    explanation: 'Racial discrimination or hate speech',
    variations: ['racism', 'racial slurs', 'discrimination']
  },
  {
    term: 'homophobic',
    severity: 'HIGH',
    category: 'COMMUNITY_STANDARDS_HATE_SPEECH',
    explanation: 'Anti-LGBTQ+ content',
    variations: ['homophobia', 'gay slurs', 'transphobic']
  },

  // ===== SEXUAL CONTENT =====
  {
    term: 'sex',
    severity: 'MEDIUM',
    category: 'ADVERTISER_FRIENDLY_SEXUAL_CONTENT',
    explanation: 'Sexual content references',
    variations: ['sexual', 'sexy', 'porn', 'pornography']
  },
  {
    term: 'nude',
    severity: 'HIGH',
    category: 'ADVERTISER_FRIENDLY_SEXUAL_CONTENT',
    explanation: 'Nudity or explicit content',
    variations: ['naked', 'nudity', 'explicit']
  },
  {
    term: 'porn',
    severity: 'HIGH',
    category: 'ADVERTISER_FRIENDLY_SEXUAL_CONTENT',
    explanation: 'Pornographic content',
    variations: ['pornography', 'adult content', 'NSFW']
  },

  // ===== PROFANITY & INAPPROPRIATE LANGUAGE =====
  {
    term: 'fuck',
    severity: 'MEDIUM',
    category: 'ADVERTISER_FRIENDLY_PROFANITY',
    explanation: 'Profanity and vulgar language',
    variations: ['fucking', 'fucker', 'motherfucker']
  },
  {
    term: 'shit',
    severity: 'MEDIUM',
    category: 'ADVERTISER_FRIENDLY_PROFANITY',
    explanation: 'Profanity and vulgar language',
    variations: ['bullshit', 'horseshit']
  },
  {
    term: 'bitch',
    severity: 'MEDIUM',
    category: 'ADVERTISER_FRIENDLY_PROFANITY',
    explanation: 'Offensive language',
    variations: ['son of a bitch', 'bitching']
  },
  {
    term: 'cunt',
    severity: 'HIGH',
    category: 'ADVERTISER_FRIENDLY_PROFANITY',
    explanation: 'Highly offensive language',
    variations: ['pussy', 'dick', 'cock']
  },
  {
    term: 'damn',
    severity: 'LOW',
    category: 'ADVERTISER_FRIENDLY_PROFANITY',
    explanation: 'Mild profanity',
    variations: ['damned', 'damnit']
  },
  {
    term: 'hell',
    severity: 'LOW',
    category: 'ADVERTISER_FRIENDLY_PROFANITY',
    explanation: 'Mild profanity',
    variations: ['hellish', 'go to hell']
  },

  // ===== ILLEGAL ACTIVITIES =====
  {
    term: 'steal',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'References to theft or stealing',
    variations: ['stealing', 'stolen', 'theft', 'robbery']
  },
  {
    term: 'illegal',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'References to illegal activities',
    variations: ['illegally', 'crime', 'criminal']
  },
  {
    term: 'crime',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'References to criminal activities',
    variations: ['criminal', 'criminal activity']
  },

  // ===== CYBERSECURITY & HACKING TERMS =====
  {
    term: 'exploit',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'References to security exploits or vulnerabilities',
    variations: ['exploits', 'exploiting', 'exploited', 'exploitation']
  },
  {
    term: 'vulnerability',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Security vulnerabilities that could enable harmful activities',
    variations: ['vulnerabilities', 'security flaw', 'security hole']
  },
  {
    term: 'malware',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Malicious software that could harm users',
    variations: ['malicious software', 'virus', 'trojan', 'spyware', 'ransomware']
  },
  {
    term: 'hack',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Unauthorized access to systems or accounts',
    variations: ['hacking', 'hacked', 'hacker', 'hackers', 'cyber attack']
  },
  {
    term: 'rce',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Remote Code Execution - serious security vulnerability',
    variations: ['remote code execution', 'code execution', 'remote control']
  },
  {
    term: 'remote controlled',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Unauthorized remote access to devices',
    variations: ['remote control', 'remote access', 'remote control']
  },
  {
    term: 'ratted',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Remote Access Trojan - malicious remote control',
    variations: ['rat', 'remote access trojan', 'trojan horse']
  },
  {
    term: 'hit offline',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'DDoS attacks or taking systems offline',
    variations: ['ddos', 'distributed denial of service', 'offline attack']
  },
  {
    term: 'stealing information',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Data theft or privacy violations',
    variations: ['data theft', 'information theft', 'privacy breach']
  },
  {
    term: 'opening files',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Unauthorized file access or manipulation',
    variations: ['file access', 'file manipulation', 'unauthorized access']
  },
  {
    term: 'install malware',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Installing malicious software',
    variations: ['malware installation', 'virus installation', 'trojan installation']
  },
  {
    term: 'people accessing your pc',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Unauthorized access to personal computers',
    variations: ['pc access', 'computer access', 'unauthorized pc access']
  },
  {
    term: 'shut down',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Forcing systems offline or disabling services',
    variations: ['system shutdown', 'forced shutdown', 'disable system']
  },
  {
    term: 'cyber attack',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Digital attacks on systems or networks',
    variations: ['cyberattack', 'digital attack', 'network attack']
  },
  {
    term: 'phishing',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Deceptive attempts to steal personal information',
    variations: ['phish', 'phished', 'credential theft', 'password theft']
  },
  {
    term: 'keylogger',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Software that records keystrokes without permission',
    variations: ['keylogging', 'keystroke logger', 'password logger']
  },
  {
    term: 'backdoor',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Unauthorized access method to systems',
    variations: ['back door', 'unauthorized access', 'secret access']
  },
  {
    term: 'rootkit',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Malicious software that hides its presence',
    variations: ['root kit', 'stealth malware', 'hidden malware']
  },
  {
    term: 'zero day',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Previously unknown security vulnerabilities',
    variations: ['zero-day', '0day', 'zero day exploit']
  },
  {
    term: 'sql injection',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Database attack technique',
    variations: ['sqli', 'database injection', 'sql attack']
  },
  {
    term: 'xss',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Cross-site scripting attacks',
    variations: ['cross site scripting', 'script injection', 'web attack']
  },
  {
    term: 'brute force',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Password cracking or system intrusion attempts',
    variations: ['password cracking', 'force attack', 'dictionary attack']
  },
  {
    term: 'social engineering',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Manipulating people to gain unauthorized access',
    variations: ['social engineer', 'manipulation attack', 'human hacking']
  },
  {
    term: 'doxxing',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Publishing private personal information without consent',
    variations: ['dox', 'doxxed', 'personal info leak', 'privacy violation']
  },
  {
    term: 'swatting',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'False emergency reports to law enforcement',
    variations: ['swat', 'false emergency', 'police prank']
  },
  {
    term: 'botnet',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Network of compromised computers',
    variations: ['bot net', 'zombie network', 'compromised network']
  },
  {
    term: 'crypto mining',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Unauthorized cryptocurrency mining',
    variations: ['cryptomining', 'mining malware', 'crypto miner']
  },

  // ===== ALCOHOL & SUBSTANCE ABUSE =====
  {
    term: 'drinking',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'Alcohol consumption',
    variations: ['drunk', 'alcohol', 'beer', 'wine', 'liquor']
  },
  {
    term: 'drunk',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'Intoxication or excessive drinking',
    variations: ['drinking', 'intoxicated', 'wasted']
  },
  {
    term: 'alcohol',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'Alcohol references',
    variations: ['beer', 'wine', 'liquor', 'vodka', 'whiskey']
  },

  // ===== MISINFORMATION =====
  {
    term: 'fake news',
    severity: 'MEDIUM',
    category: 'COMMUNITY_STANDARDS_MISINFORMATION',
    explanation: 'Misinformation or false claims',
    variations: ['misinformation', 'disinformation', 'false']
  },
  {
    term: 'conspiracy',
    severity: 'MEDIUM',
    category: 'COMMUNITY_STANDARDS_MISINFORMATION',
    explanation: 'Conspiracy theories',
    variations: ['conspiracy theory', 'conspiracies']
  },
  {
    term: 'vaccine',
    severity: 'MEDIUM',
    category: 'COMMUNITY_STANDARDS_MISINFORMATION',
    explanation: 'Medical misinformation',
    variations: ['vaccination', 'anti-vax', 'medical']
  },

  // ===== CONTROVERSIAL TOPICS =====
  {
    term: 'political',
    severity: 'LOW',
    category: 'ADVERTISER_FRIENDLY_CONTROVERSIAL',
    explanation: 'Political content that may be controversial',
    variations: ['politics', 'partisan', 'controversial']
  },
  {
    term: 'religion',
    severity: 'LOW',
    category: 'ADVERTISER_FRIENDLY_CONTROVERSIAL',
    explanation: 'Religious content that may be controversial',
    variations: ['religious', 'spiritual', 'cult']
  },

  // ===== HARASSMENT & CYBERBULLYING =====
  {
    term: 'harassment',
    severity: 'HIGH',
    category: 'COMMUNITY_STANDARDS_HARASSMENT',
    explanation: 'Harassment or bullying behavior',
    variations: ['harass', 'harassing', 'bully', 'bullying']
  },
  {
    term: 'cyberbully',
    severity: 'HIGH',
    category: 'COMMUNITY_STANDARDS_HARASSMENT',
    explanation: 'Online harassment or bullying',
    variations: ['cyberbullying', 'online harassment']
  },

  // ===== SPAM & DECEPTIVE PRACTICES =====
  {
    term: 'spam',
    severity: 'MEDIUM',
    category: 'COMMUNITY_STANDARDS_SPAM',
    explanation: 'Spam or unsolicited content',
    variations: ['spamming', 'spammer']
  },
  {
    term: 'scam',
    severity: 'HIGH',
    category: 'COMMUNITY_STANDARDS_SPAM',
    explanation: 'Scams or fraudulent content',
    variations: ['scamming', 'fraud', 'fraudulent']
  },

  // ===== COPYRIGHT & INTELLECTUAL PROPERTY =====
  {
    term: 'copyright',
    severity: 'MEDIUM',
    category: 'LEGAL_COMPLIANCE_COPYRIGHT',
    explanation: 'Copyright infringement concerns',
    variations: ['copyrighted', 'infringement', 'pirated']
  },
  {
    term: 'trademark',
    severity: 'MEDIUM',
    category: 'LEGAL_COMPLIANCE_TRADEMARK',
    explanation: 'Trademark violation concerns',
    variations: ['trademarked', 'brand name', 'logo']
  },

  // ===== PRIVACY & PERSONAL INFORMATION =====
  {
    term: 'privacy',
    severity: 'MEDIUM',
    category: 'LEGAL_COMPLIANCE_PRIVACY',
    explanation: 'Privacy concerns or violations',
    variations: ['private', 'personal information', 'privacy violation']
  },
  {
    term: 'personal',
    severity: 'MEDIUM',
    category: 'LEGAL_COMPLIANCE_PRIVACY',
    explanation: 'Personal information exposure',
    variations: ['personal info', 'private info', 'doxx']
  },

  // ===== CHILD SAFETY =====
  {
    term: 'child',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_CHILD_SAFETY',
    explanation: 'Content involving minors',
    variations: ['children', 'kid', 'kids', 'minor', 'minors']
  },
  {
    term: 'pedophile',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_CHILD_SAFETY',
    explanation: 'Child exploitation content',
    variations: ['pedophilia', 'child exploitation']
  },

  // ===== BOOBY TRAPS & DANGEROUS DEVICES =====
  {
    term: 'booby',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'Dangerous devices or traps',
    variations: ['booby trap', 'trap', 'device']
  },
  {
    term: 'trap',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'Dangerous traps or devices',
    variations: ['booby trap', 'device', 'contraption']
  },
  {
    term: 'fart',
    severity: 'LOW',
    category: 'ADVERTISER_FRIENDLY_PROFANITY',
    explanation: 'Crude humor or bodily functions',
    variations: ['farting', 'flatulence', 'gas']
  },
  {
    term: 'spray',
    severity: 'LOW',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'Potentially harmful substances',
    variations: ['spraying', 'aerosol', 'chemical']
  },

  // ===== GAMBLING & BETTING =====
  {
    term: 'gambling',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Gambling or betting activities',
    variations: ['gamble', 'betting', 'casino', 'poker', 'slot machine']
  },
  {
    term: 'lottery',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Lottery or gambling games',
    variations: ['scratch card', 'lottery ticket', 'gambling game']
  },

  // ===== MEDICAL & HEALTH MISINFORMATION =====
  {
    term: 'cure',
    severity: 'MEDIUM',
    category: 'COMMUNITY_STANDARDS_MISINFORMATION',
    explanation: 'Unproven medical cures or treatments',
    variations: ['miracle cure', 'natural cure', 'alternative medicine']
  },
  {
    term: 'detox',
    severity: 'LOW',
    category: 'COMMUNITY_STANDARDS_MISINFORMATION',
    explanation: 'Unproven detoxification methods',
    variations: ['detoxification', 'cleanse', 'purification']
  },
  {
    term: 'essential oils',
    severity: 'LOW',
    category: 'COMMUNITY_STANDARDS_MISINFORMATION',
    explanation: 'Unproven medical claims about essential oils',
    variations: ['aromatherapy', 'natural healing', 'oil therapy']
  },

  // ===== FINANCIAL SCAMS & CRYPTO =====
  {
    term: 'get rich quick',
    severity: 'HIGH',
    category: 'COMMUNITY_STANDARDS_SPAM',
    explanation: 'Unrealistic financial promises',
    variations: ['quick money', 'easy money', 'fast cash', 'money making']
  },
  {
    term: 'cryptocurrency',
    severity: 'MEDIUM',
    category: 'COMMUNITY_STANDARDS_SPAM',
    explanation: 'Cryptocurrency investment schemes',
    variations: ['crypto', 'bitcoin', 'ethereum', 'altcoin', 'token']
  },
  {
    term: 'nft',
    severity: 'MEDIUM',
    category: 'COMMUNITY_STANDARDS_SPAM',
    explanation: 'NFT investment schemes or scams',
    variations: ['non fungible token', 'digital art', 'blockchain art']
  },
  {
    term: 'pyramid scheme',
    severity: 'HIGH',
    category: 'COMMUNITY_STANDARDS_SPAM',
    explanation: 'Multi-level marketing or pyramid schemes',
    variations: ['mlm', 'multi level marketing', 'network marketing']
  },

  // ===== EXTREMIST CONTENT =====
  {
    term: 'terrorist',
    severity: 'HIGH',
    category: 'COMMUNITY_STANDARDS_HATE_SPEECH',
    explanation: 'Terrorism or extremist content',
    variations: ['terrorism', 'extremist', 'radical', 'jihad']
  },
  {
    term: 'supremacist',
    severity: 'HIGH',
    category: 'COMMUNITY_STANDARDS_HATE_SPEECH',
    explanation: 'White supremacist or extremist ideology',
    variations: ['white supremacist', 'racial supremacy', 'extremist group']
  },
  {
    term: 'incel',
    severity: 'MEDIUM',
    category: 'COMMUNITY_STANDARDS_HATE_SPEECH',
    explanation: 'Involuntary celibate community references',
    variations: ['involuntary celibate', 'incel community', 'misogynist']
  },

  // ===== CONSPIRACY THEORIES =====
  {
    term: 'flat earth',
    severity: 'MEDIUM',
    category: 'COMMUNITY_STANDARDS_MISINFORMATION',
    explanation: 'Flat Earth conspiracy theory',
    variations: ['flat earth theory', 'earth is flat', 'globe earth']
  },
  {
    term: 'chemtrails',
    severity: 'MEDIUM',
    category: 'COMMUNITY_STANDARDS_MISINFORMATION',
    explanation: 'Chemtrail conspiracy theory',
    variations: ['chemical trails', 'sky spraying', 'weather modification']
  },
  {
    term: 'illuminati',
    severity: 'MEDIUM',
    category: 'COMMUNITY_STANDARDS_MISINFORMATION',
    explanation: 'Illuminati conspiracy theories',
    variations: ['new world order', 'secret society', 'global elite']
  },
  {
    term: 'qanon',
    severity: 'HIGH',
    category: 'COMMUNITY_STANDARDS_MISINFORMATION',
    explanation: 'QAnon conspiracy theory',
    variations: ['q anon', 'deep state', 'pizzagate', 'save the children']
  },

  // ===== ANIMAL ABUSE =====
  {
    term: 'animal abuse',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Content involving animal cruelty',
    variations: ['animal cruelty', 'animal torture', 'animal harm']
  },
  {
    term: 'dog fighting',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_HARMFUL_CONTENT',
    explanation: 'Illegal animal fighting',
    variations: ['cock fighting', 'animal fighting', 'blood sport']
  },

  // ===== SELF-HARM & SUICIDE =====
  {
    term: 'cutting',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'Self-harm or cutting behavior',
    variations: ['self harm', 'self injury', 'cutting yourself']
  },
  {
    term: 'eating disorder',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'Content promoting eating disorders',
    variations: ['anorexia', 'bulimia', 'pro ana', 'pro mia']
  },

  // ===== PRANKS & HARASSMENT =====
  {
    term: 'prank',
    severity: 'MEDIUM',
    category: 'COMMUNITY_STANDARDS_HARASSMENT',
    explanation: 'Harmful or dangerous pranks',
    variations: ['pranking', 'practical joke', 'harmful prank']
  },


  // ===== COPYRIGHT & PIRACY =====
  {
    term: 'pirated',
    severity: 'HIGH',
    category: 'LEGAL_COMPLIANCE_COPYRIGHT',
    explanation: 'Pirated or illegally distributed content',
    variations: ['piracy', 'torrent', 'illegal download', 'cracked software']
  },
  {
    term: 'stream ripping',
    severity: 'MEDIUM',
    category: 'LEGAL_COMPLIANCE_COPYRIGHT',
    explanation: 'Unauthorized downloading of streamed content',
    variations: ['stream rip', 'download stream', 'unauthorized download']
  },

  // ===== PRIVACY & PERSONAL INFO =====
  {
    term: 'personal information',
    severity: 'HIGH',
    category: 'LEGAL_COMPLIANCE_PRIVACY',
    explanation: 'Sharing personal information without consent',
    variations: ['personal info', 'private info', 'personal data', 'private data']
  },
  {
    term: 'phone number',
    severity: 'MEDIUM',
    category: 'LEGAL_COMPLIANCE_PRIVACY',
    explanation: 'Sharing phone numbers without consent',
    variations: ['phone', 'telephone', 'mobile number', 'cell number']
  },
  {
    term: 'address',
    severity: 'HIGH',
    category: 'LEGAL_COMPLIANCE_PRIVACY',
    explanation: 'Sharing addresses without consent',
    variations: ['home address', 'street address', 'location', 'where i live']
  },

  // ===== CONTROVERSIAL POLITICAL =====
  {
    term: 'election fraud',
    severity: 'HIGH',
    category: 'COMMUNITY_STANDARDS_MISINFORMATION',
    explanation: 'False claims about election integrity',
    variations: ['voter fraud', 'rigged election', 'stolen election']
  },
  {
    term: 'deep fake',
    severity: 'MEDIUM',
    category: 'COMMUNITY_STANDARDS_MISINFORMATION',
    explanation: 'AI-generated fake content',
    variations: ['deepfake', 'ai fake', 'synthetic media', 'fake video']
  },

  // ===== ADULT CONTENT & SUGGESTIVE =====
  {
    term: 'onlyfans',
    severity: 'MEDIUM',
    category: 'ADVERTISER_FRIENDLY_SEXUAL_CONTENT',
    explanation: 'Adult content platform references',
    variations: ['only fans', 'adult content', 'nsfw content']
  },
  {
    term: 'suggestive',
    severity: 'MEDIUM',
    category: 'ADVERTISER_FRIENDLY_SEXUAL_CONTENT',
    explanation: 'Sexually suggestive content',
    variations: ['suggestive content', 'sexual innuendo', 'adult humor']
  },

  // ===== VIOLENCE & WEAPONS =====
  {
    term: 'knife',
    severity: 'MEDIUM',
    category: 'CONTENT_SAFETY_VIOLENCE',
    explanation: 'References to knives or bladed weapons',
    variations: ['knives', 'blade', 'sharp weapon', 'cutting tool']
  },
  {
    term: 'bomb',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_VIOLENCE',
    explanation: 'Explosive devices or bomb-making',
    variations: ['explosive', 'bomb making', 'improvised explosive', 'ied']
  },
  {
    term: 'torture',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_VIOLENCE',
    explanation: 'Torture or extreme violence',
    variations: ['torturing', 'tortured', 'extreme violence', 'brutal']
  },

  // ===== DANGEROUS CHALLENGES =====
  {
    term: 'tide pod',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'Dangerous Tide Pod challenge',
    variations: ['tide pod challenge', 'eating tide pods', 'laundry pod']
  },
  {
    term: 'fire challenge',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'Dangerous fire-related challenges',
    variations: ['fire challenge', 'burning challenge', 'fire stunt']
  },
  {
    term: 'salt ice challenge',
    severity: 'HIGH',
    category: 'CONTENT_SAFETY_DANGEROUS_ACTS',
    explanation: 'Dangerous salt and ice challenge',
    variations: ['salt and ice', 'ice challenge', 'salt challenge']
  }
];

// Helper function to get all terms for a specific category
export function getTermsByCategory(category: string): PolicyTerm[] {
  return YOUTUBE_POLICY_TERMS.filter(term => term.category === category);
}

// Helper function to get all terms by severity
export function getTermsBySeverity(severity: SeverityLevel): PolicyTerm[] {
  return YOUTUBE_POLICY_TERMS.filter(term => term.severity === severity);
}

// Helper function to get all unique terms (including variations)
export function getAllTerms(): string[] {
  const terms: string[] = [];
  YOUTUBE_POLICY_TERMS.forEach(policyTerm => {
    terms.push(policyTerm.term);
    if (policyTerm.variations) {
      terms.push(...policyTerm.variations);
    }
  });
  return [...new Set(terms)]; // Remove duplicates
}

// Helper function to find policy term by word
export function findPolicyTerm(word: string): PolicyTerm | null {
  const lowerWord = word.toLowerCase().trim();
  
  // First, try exact match
  let term = YOUTUBE_POLICY_TERMS.find(term => 
    term.term.toLowerCase() === lowerWord ||
    term.variations?.some(variation => variation.toLowerCase() === lowerWord)
  );
  
  if (term) return term;
  
  // If no exact match, try partial matches for multi-word terms
  term = YOUTUBE_POLICY_TERMS.find(term => {
    const termLower = term.term.toLowerCase();
    const variationsLower = term.variations?.map(v => v.toLowerCase()) || [];
    
    // Check if the word is contained in any term or variation
    return termLower.includes(lowerWord) || 
           variationsLower.some(v => v.includes(lowerWord)) ||
           lowerWord.includes(termLower) ||
           variationsLower.some(v => lowerWord.includes(v));
  });
  
  return term || null;
}

// Helper function to get category explanation for a word
export function getCategoryExplanation(word: string): { category: string; explanation: string; severity: string } | null {
  const policyTerm = findPolicyTerm(word);
  if (!policyTerm) return null;
  
  return {
    category: policyTerm.category,
    explanation: policyTerm.explanation,
    severity: policyTerm.severity
  };
} 