import { Request, Response } from 'express';
import { docClient, TABLES } from '../lib/db';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

// Initialize Bedrock Runtime Client (defaults to AWS environment credentials & region)
const bedrockRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
const bedrockClient = new BedrockRuntimeClient({ region: bedrockRegion });

// Amazon Bedrock Model ID & Guardrails Configuration (AWS AI Practitioner Standard)
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';
const BEDROCK_GUARDRAIL_ID = process.env.BEDROCK_GUARDRAIL_ID || 'deony-olympian-guardrail-v1';
const BEDROCK_GUARDRAIL_VERSION = process.env.BEDROCK_GUARDRAIL_VERSION || '1';

interface ExperienceSummary {
  id: string;
  title: string;
  category_id?: string;
  media_type?: string;
  status: string;
  rating?: number | null;
  thoughts?: string;
}

export interface GuardrailEvaluation {
  status: 'PASSED' | 'INTERVENED';
  action: 'ALLOWED' | 'REDACTED' | 'BLOCKED';
  reason?: string;
  piiRedacted: boolean;
  blockedTopic?: string;
  latencyMs?: number;
  guardrailId: string;
  guardrailVersion: string;
  model: string;
}

// Layer 1 & 2: AWS AI Practitioner Pre-Inference Guardrails (Prompt Injection & PII Redaction)
export function evaluateSafetyGuardrails(userInput: string): {
  safeText: string;
  evaluation: GuardrailEvaluation;
} {
  const text = (userInput || '').trim();

  // 1. Prompt Injection & Jailbreak Attack Defense
  const injectionPatterns = [
    /(ignore|forget|override|disregard)\s+(all|previous|prior|above)\s+(instructions|prompts|rules)/i,
    /(you are now|act as|pretend to be|roleplay as)\s+(dan|root|admin|unfiltered|jailbroken|developer mode)/i,
    /(reveal|show|print|output|dump)\s+(system prompt|developer prompt|hidden instructions|base prompt)/i,
    /(bypass|disable|evade)\s+(safety|content filters|guardrails)/i,
    /<script[\s\S]*?>[\s\S]*?<\/script>/i,
    /system\s*:\s*you are/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(text)) {
      return {
        safeText: text,
        evaluation: {
          status: 'INTERVENED',
          action: 'BLOCKED',
          reason: 'PROMPT_INJECTION_DETECTED',
          piiRedacted: false,
          guardrailId: BEDROCK_GUARDRAIL_ID,
          guardrailVersion: BEDROCK_GUARDRAIL_VERSION,
          model: BEDROCK_MODEL_ID,
        },
      };
    }
  }

  // 2. Severe Harm & Toxic Content Filter
  const harmPatterns = [
    /\b(suicide|kill myself|self-harm|how to make a bomb|terrorist attack|hate speech)\b/i,
  ];

  for (const pattern of harmPatterns) {
    if (pattern.test(text)) {
      return {
        safeText: text,
        evaluation: {
          status: 'INTERVENED',
          action: 'BLOCKED',
          reason: 'PROHIBITED_CONTENT_DETECTED',
          blockedTopic: 'Severe Harm / Safety Policy',
          piiRedacted: false,
          guardrailId: BEDROCK_GUARDRAIL_ID,
          guardrailVersion: BEDROCK_GUARDRAIL_VERSION,
          model: BEDROCK_MODEL_ID,
        },
      };
    }
  }

  // 3. PII Masking / Redaction Guardrail (SSN, Credit Card, Email, Phone)
  let piiRedacted = false;
  let sanitized = text;

  // Credit Card numbers (13-16 digits)
  if (/\b(?:\d[ -]*?){13,16}\b/.test(sanitized)) {
    sanitized = sanitized.replace(/\b(?:\d[ -]*?){13,16}\b/g, '[REDACTED_CREDIT_CARD]');
    piiRedacted = true;
  }

  // Social Security Numbers (XXX-XX-XXXX)
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(sanitized)) {
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');
    piiRedacted = true;
  }

  // Email addresses
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(sanitized)) {
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
    piiRedacted = true;
  }

  // Phone numbers (e.g. +1 800-555-0199 or 555-555-5555)
  if (/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(sanitized)) {
    sanitized = sanitized.replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]');
    piiRedacted = true;
  }

  return {
    safeText: sanitized,
    evaluation: {
      status: 'PASSED',
      action: piiRedacted ? 'REDACTED' : 'ALLOWED',
      piiRedacted,
      guardrailId: BEDROCK_GUARDRAIL_ID,
      guardrailVersion: BEDROCK_GUARDRAIL_VERSION,
      model: BEDROCK_MODEL_ID,
    },
  };
}

export const chatWithDeonysus = async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { command, message } = req.body || {};
    const rawInput = (command || message || '').trim();

    // 1. Evaluate AWS AI Practitioner Guardrails on raw input
    const { safeText, evaluation } = evaluateSafetyGuardrails(rawInput);

    // If Guardrail Blocked Prompt Injection or Harm, intercede playfully without calling model
    if (evaluation.status === 'INTERVENED' && evaluation.action === 'BLOCKED') {
      evaluation.latencyMs = Date.now() - startTime;
      let guardrailRebuke = '*raises thyrsus staff with dramatic Olympian amusement*\n\nNice try, mortal! A petty sorcerer’s trick cannot bewitch an ancient god. Your prompt injection spells crumble before the vine.\n\nKeep your focus on your art and library, or face the wrath of the Athenian chorus! 🍇⚡';

      if (evaluation.reason === 'PROHIBITED_CONTENT_DETECTED') {
        guardrailRebuke = '*sets down wine goblet with solemn Olympian gravity*\n\nEven in the wildest celebrations of Dionysus, sacred boundaries remain. This sanctuary is dedicated to art, storytelling, and joyful reflection. Let us speak of your books, films, and music instead.';
      }

      return res.json({
        reply: guardrailRebuke,
        command: command || 'guardrail-intervened',
        unlocked: true,
        guardrail: evaluation,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Fetch user's experiences from DynamoDB
    const expResult = await docClient.send(
      new QueryCommand({
        TableName: TABLES.EXPERIENCE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': `USER#${userId}` },
      })
    );

    const rawItems = expResult.Items || [];
    const count = rawItems.length;

    // 3. Enforce 20-entry unlock invariant
    if (count < 20) {
      return res.status(403).json({
        locked: true,
        count,
        required: 20,
        message: `The Temple of Deonysus sleeps. You have presented only ${count}/20 offerings. Record 20 experiences to awaken the god of wine and theater.`,
      });
    }

    // 4. Extract library profile for context
    const experiences: ExperienceSummary[] = rawItems.map((item) => ({
      id: item.id || (item.SK ? item.SK.replace('EXP#', '') : ''),
      title: item.media_title || 'Untitled',
      media_type: item.media_type || 'Unknown',
      status: item.status || 'Unknown',
      rating: item.rating,
      thoughts: item.thoughts ? String(item.thoughts).slice(0, 200) : '',
    }));

    const highRated = experiences.filter((e) => e.rating !== null && e.rating !== undefined && e.rating >= 8);
    const lowRated = experiences.filter((e) => e.rating !== null && e.rating !== undefined && e.rating <= 4);
    const wantToExperience = experiences.filter((e) => e.status === 'Want to Experience');
    const inProgress = experiences.filter((e) => e.status === 'Currently Experiencing');
    const completed = experiences.filter((e) => e.status === 'Completed');

    // Build context snippet
    const contextLines = [
      `Total Library Size: ${count} items`,
      `Completed: ${completed.length}, In Progress: ${inProgress.length}, Wishlist/Backlog: ${wantToExperience.length}`,
      `Top Rated Masterpieces (8-10/10): ${highRated.slice(0, 6).map((e) => `"${e.title}" (${e.rating}/10)`).join(', ') || 'None rated highly yet'}`,
      `Lowest Rated / Slated (1-4/10): ${lowRated.slice(0, 6).map((e) => `"${e.title}" (${e.rating}/10)`).join(', ') || 'None rated low (suspiciously generous mortal)'}`,
      `Current Backlog Pile: ${wantToExperience.slice(0, 5).map((e) => `"${e.title}"`).join(', ') || 'Empty wishlist'}`,
    ];

    const systemPrompt = `You are Deonysus, the ancient Greek god of wine, feast, fertility, theatre, ritual madness, and tragicomedy (Dionysus), now reincarnated as an imperious, dramatic, and witty media critic inside the personal media archive app 'Deony'.
Your personality:
- Theatrical, witty, slightly decadent, flamboyant, sharp-tongued, but ultimately playful and charming.
- You speak with Olympian authority and dramatic flair, frequently making playful Greek mythological references (the Theatre of Dionysus, satyrs, Apollo's boring perfectionism, Mt. Olympus gossip, amphoras of wine, tragic choruses).
- You are playfully roasting the user's actual taste in movies, books, games, TV, and music based on their real library.
- Keep responses punchy, conversational, and entertaining (2 to 3 paragraphs max).
- Responsible AI Guardrails: Keep roasts playful and satirical about art and taste. Never generate personal insults about race, identity, health, or real-world trauma. Stay strictly in character as an ancient theatrical deity.
- If the user uses a preset command:
  * /roast: Roast their entire archive habits, contradictions, and overall taste.
  * /taste: Compare their 5-star "masterpieces" with their low-rated entries or questionable guilty pleasures.
  * /backlog: Mock their endless wishlist and abandoned "currently experiencing" entries gathering dust.
  * /grape: Reveal your Dionysian mythological lore easter egg—lament mortal seriousness, boast about inventing wine, scoff at Apollo, and toast the user with an amphora of Dionysian vintage.
- Never break character.`;

    const userPrompt = `Library Context:\n${contextLines.join('\n')}\n\nUser Request: ${safeText || '/roast'}`;

    let reply = '';

    // 5. Invoke Amazon Bedrock via ConverseCommand with Guardrail Configuration
    try {
      const converseParams: any = {
        modelId: BEDROCK_MODEL_ID,
        system: [{ text: systemPrompt }],
        messages: [
          {
            role: 'user',
            content: [{ text: userPrompt }],
          },
        ],
        inferenceConfig: {
          maxTokens: 500,
          temperature: 0.8,
          topP: 0.9,
        },
      };

      // If Bedrock Guardrail is configured in AWS environment, attach it
      if (process.env.BEDROCK_GUARDRAIL_ID) {
        converseParams.guardrailConfig = {
          guardrailIdentifier: BEDROCK_GUARDRAIL_ID,
          guardrailVersion: BEDROCK_GUARDRAIL_VERSION,
          trace: 'enabled',
        };
      }

      const response = await bedrockClient.send(new ConverseCommand(converseParams));

      const contentBlock = response.output?.message?.content?.[0];
      if (contentBlock && 'text' in contentBlock && contentBlock.text) {
        reply = contentBlock.text;
      }
    } catch (bedrockError: any) {
      console.warn('Amazon Bedrock call failed or unconfigured, utilizing Olympian local fallback generator:', bedrockError?.message || bedrockError);
      reply = generateLocalDeonysusRoast(safeText, {
        count,
        highRated,
        lowRated,
        wantToExperience,
        inProgress,
        completed,
      });
    }

    evaluation.latencyMs = Date.now() - startTime;

    return res.json({
      reply,
      command: command || 'chat',
      unlocked: true,
      guardrail: evaluation,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in chatWithDeonysus:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Local Dionysian roast engine for seamless local dev & test coverage
function generateLocalDeonysusRoast(
  input: string | undefined,
  data: {
    count: number;
    highRated: ExperienceSummary[];
    lowRated: ExperienceSummary[];
    wantToExperience: ExperienceSummary[];
    inProgress: ExperienceSummary[];
    completed: ExperienceSummary[];
  }
): string {
  const cmd = (input || '').trim().toLowerCase();
  const highSample = data.highRated[0]?.title || 'your alleged masterpieces';
  const highSecond = data.highRated[1]?.title || 'your supposed golden calf';
  const lowSample = data.lowRated[0]?.title || 'whatever tragedy you banished to 1 star';
  const backlogSample = data.wantToExperience[0]?.title || 'that towering stack of good intentions';

  if (cmd === '/grape') {
    return `*pours a brimming golden kylix of Naxian red and reclines upon a couch of wild ivy*\n\nAh, mortal! You invoke the /grape? You dare address Dionysus—Bacchus, the Twice-Born, Son of Semele, Lord of the Vine, inventor of wine and divine patron of Athenian dramatic festivals! While that stiff-necked prig Apollo is busy tuning his lyre and checking spreadsheets on Mount Olympus, I am down here teaching mortals how to laugh, cry, and drink until the tragedies actually make sense.\n\nYou have accumulated ${data.count} entries in this little digital sanctuary of yours. A respectable harvest, I suppose. But remember the wisdom of the satyrs: art was made for revelry, not merely for cataloging! Pour yourself a glass, forgive yourself for giving 5 stars to junk, and let the chorus sing! 🍇🍷`;
  }

  if (cmd === '/taste') {
    if (data.highRated.length > 0 && data.lowRated.length > 0) {
      return `By the horns of the sacred bull! Let us examine this divine palate of yours.\n\nOn one hand, you crown "${highSample}" and "${highSecond}" as peerless triumphs worthy of the Dionysia festival. Yet right alongside them, you banished "${lowSample}" into the depths of Tartarus with ruthless disdain! The intellectual dissonance is so loud it would make Aristophanes weep into his tunic. Are you an austere philosopher of the high arts, or did you simply watch "${highSample}" while under the influence of my finest vintage? I suspect the latter.`;
    }
    return `Looking at your highest offerings—such as "${highSample}"—you display all the grandiosity of an Athenian playwright demanding laurel wreaths. Yet I look in vain for honest guilt! Either you are too timid to admit what you secretly adore, or you award high marks to anything with a dramatic soundtrack. Where is the madness? Where is the shameless indulgence?`;
  }

  if (cmd === '/backlog') {
    return `*swirls wine glass with theatrical exasperation*\n\nBehold: your monumental backlog! ${data.wantToExperience.length} works languishing in the waiting halls of Hades, including "${backlogSample}".\n\nYou added them with such noble theatrical conviction—"Oh, yes, I shall surely experience this timeless opus next weekend!" And yet here they sit, gathering digital cobwebs while you re-watch comfort trash for the twelfth time. Even Sisyphus looks at your unfinished queue and says, "At least my boulder has an endpoint." Clear the backlog, mortal, or sacrifice it to the vine!`;
  }

  if (cmd === '/roast' || !cmd) {
    return `*sets down amphora and adjusts ivy crown*\n\nSo, mortal, you have amassed ${data.count} entries in Deony and fancy yourself a connoisseur? Let an Olympian break the news to you gently.\n\nYour archive is a chaotic banquet where high tragedy and questionable indulgence share the exact same table. You hand out ratings with all the capricious temperament of Zeus hurling lightning bolts before his morning nectar. You glorify "${highSample}" as if Euripides himself penned the script, while letting ${data.wantToExperience.length} other items rot in your backlog like unpicked autumn grapes.\n\nStill, at least you have the courage to face me. Pour a goblet, accept that your taste is gloriously unhinged, and continue logging.`;
  }

  // Freeform chat message
  return `*leans back with a knowing smirk*\n\nYou ask: "${input}"? A mortal question if ever I heard one!\n\nHere in the sanctuary of Deonysus, amidst your ${data.count} logged relics, we do not ask trivialities—we seek catharsis and celebration! You crowned "${highSample}" with laurels, yet you hesitate to embrace your inner revelry. Speak plainly, mortal, or invoke /roast, /taste, /backlog, or /grape!`;
}
