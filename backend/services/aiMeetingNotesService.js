/**
 * AI Meeting Notes Service
 *
 * Processes unstructured meeting notes and extracts structured interaction data
 * Uses AI to analyze sentiment, extract action items, and identify concerns
 */

class AIMeetingNotesService {
  /**
   * Process meeting notes and extract structured data
   *
   * @param {string} notes - Raw meeting notes text
   * @param {string} stakeholderId - ID of the stakeholder (optional, for context)
   * @returns {Object} Structured interaction data
   */
  async processNotes(notes, stakeholderId = null) {
    if (!notes || notes.trim().length === 0) {
      throw new Error('Meeting notes cannot be empty');
    }

    try {
      // Clean the input
      const cleanedNotes = this.cleanNotes(notes);

      // Extract structured data using pattern matching and heuristics
      const extractedData = {
        interactionType: this.detectInteractionType(cleanedNotes),
        dateTime: this.extractDateTime(cleanedNotes),
        stakeholdersInvolved: this.extractStakeholders(cleanedNotes),
        summary: this.generateSummary(cleanedNotes),
        outcomeSentiment: this.analyzeSentiment(cleanedNotes),
        keyConcerns: this.extractConcerns(cleanedNotes),
        actionItems: this.extractActionItems(cleanedNotes),
        owner: this.extractOwner(cleanedNotes),
        aiConfidence: this.calculateConfidence(cleanedNotes),
        suggestedFollowUp: this.suggestFollowUpTiming(cleanedNotes)
      };

      return {
        success: true,
        data: extractedData,
        originalNotes: cleanedNotes,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[AI Meeting Notes] Processing failed:', error);
      throw new Error('Failed to process meeting notes: ' + error.message);
    }
  }

  /**
   * Clean and normalize meeting notes
   */
  cleanNotes(notes) {
    return notes
      .trim()
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .replace(/\t/g, '  '); // Replace tabs with spaces
  }

  /**
   * Detect interaction type from notes
   */
  detectInteractionType(notes) {
    const lowerNotes = notes.toLowerCase();

    // Keywords for different interaction types
    const typePatterns = [
      { type: 'meeting', keywords: ['meeting', 'met with', 'discussion', 'call with', 'zoom', 'teams meeting'] },
      { type: 'call', keywords: ['phone call', 'called', 'spoke on phone', 'telephone'] },
      { type: 'email', keywords: ['email', 'emailed', 'sent email', 'received email'] },
      { type: 'update', keywords: ['update', 'status', 'progress', 'check-in'] }
    ];

    for (const pattern of typePatterns) {
      if (pattern.keywords.some(keyword => lowerNotes.includes(keyword))) {
        return pattern.type;
      }
    }

    return 'meeting'; // Default
  }

  /**
   * Extract date and time from notes
   */
  extractDateTime(notes) {
    // Look for common date patterns
    const datePatterns = [
      /(\d{4}-\d{2}-\d{2})/,  // 2024-01-15
      /(\d{1,2}\/\d{1,2}\/\d{4})/, // 01/15/2024
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i, // Jan 15, 2024
      /(today|yesterday)/i
    ];

    for (const pattern of datePatterns) {
      const match = notes.match(pattern);
      if (match) {
        const dateStr = match[0].toLowerCase();
        if (dateStr === 'today') {
          return new Date().toISOString();
        } else if (dateStr === 'yesterday') {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          return yesterday.toISOString();
        }
        try {
          return new Date(match[0]).toISOString();
        } catch (e) {
          // Continue to next pattern
        }
      }
    }

    // Default to current date/time if not found
    return new Date().toISOString();
  }

  /**
   * Extract stakeholder names from notes
   */
  extractStakeholders(notes) {
    const stakeholders = [];

    // Look for common name patterns
    const namePatterns = [
      /(?:with|met|spoke to|talked to|discussion with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
      /attendees?:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)*)/gi
    ];

    for (const pattern of namePatterns) {
      let match;
      while ((match = pattern.exec(notes)) !== null) {
        const names = match[1].split(',').map(name => name.trim()).filter(n => n.length > 2);
        stakeholders.push(...names);
      }
    }

    // Remove duplicates and return
    return [...new Set(stakeholders)];
  }

  /**
   * Generate a concise summary (2-3 sentences max)
   */
  generateSummary(notes) {
    // Split into sentences
    const sentences = notes
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && s.length < 200); // Filter out very short or very long sentences

    if (sentences.length === 0) {
      return notes.substring(0, 200) + (notes.length > 200 ? '...' : '');
    }

    // Take first 2-3 meaningful sentences
    const summary = sentences.slice(0, 3).join('. ') + '.';

    // Limit to 250 characters
    if (summary.length > 250) {
      return summary.substring(0, 247) + '...';
    }

    return summary;
  }

  /**
   * Analyze sentiment of the interaction
   */
  analyzeSentiment(notes) {
    const lowerNotes = notes.toLowerCase();

    // Positive indicators
    const positiveWords = [
      'great', 'excellent', 'positive', 'supportive', 'enthusiastic', 'agree', 'aligned',
      'happy', 'satisfied', 'pleased', 'excited', 'good progress', 'on track'
    ];

    // Negative indicators
    const negativeWords = [
      'concerned', 'worried', 'issue', 'problem', 'risk', 'delay', 'disagreed', 'resistant',
      'unhappy', 'frustrated', 'disappointed', 'blocked', 'challenge', 'objection'
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      if (lowerNotes.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
      if (lowerNotes.includes(word)) negativeCount++;
    });

    if (positiveCount > negativeCount + 1) return 'positive';
    if (negativeCount > positiveCount + 1) return 'negative';
    return 'neutral';
  }

  /**
   * Extract key concerns from notes
   */
  extractConcerns(notes) {
    const concerns = [];
    const lowerNotes = notes.toLowerCase();

    // Look for concern indicators
    const concernPatterns = [
      /concerns?(?:\s+about)?:?\s*([^\n.]+)/gi,
      /(?:worried|concern(?:ed)?|risk|issue|problem)(?:\s+about|\s+with)?:?\s*([^\n.]+)/gi,
      /(?:raised|mentioned|highlighted)\s+(?:concerns?|issues?|risks?)(?:\s+about)?:?\s*([^\n.]+)/gi
    ];

    for (const pattern of concernPatterns) {
      let match;
      while ((match = pattern.exec(notes)) !== null) {
        const concern = match[1].trim();
        if (concern.length > 10 && concern.length < 200) {
          concerns.push(concern);
        }
      }
    }

    // Remove duplicates
    return [...new Set(concerns)].slice(0, 5); // Limit to top 5 concerns
  }

  /**
   * Extract action items from notes
   */
  extractActionItems(notes) {
    const actions = [];

    // Look for action item indicators
    const actionPatterns = [
      /action items?:?\s*\n([^\n]+(?:\n[^\n]+)*)/gi,
      /next steps?:?\s*\n([^\n]+(?:\n[^\n]+)*)/gi,
      /(?:to do|todo|tasks?):?\s*\n([^\n]+(?:\n[^\n]+)*)/gi,
      /(?:^|\n)[-•*]\s*([^\n]+)/g, // Bullet points
      /(?:will|should|needs? to|must|going to)\s+([^\n.]+(?:by|before|until)[^\n.]+)/gi
    ];

    for (const pattern of actionPatterns) {
      let match;
      while ((match = pattern.exec(notes)) !== null) {
        const actionText = match[1].trim();
        // Split by line breaks or bullet points
        const items = actionText
          .split(/\n|;/)
          .map(item => item.replace(/^[-•*]\s*/, '').trim())
          .filter(item => item.length > 5 && item.length < 200);
        actions.push(...items);
      }
    }

    // Remove duplicates and limit
    return [...new Set(actions)].slice(0, 10);
  }

  /**
   * Extract owner/responsible person
   */
  extractOwner(notes) {
    // Look for owner patterns
    const ownerPatterns = [
      /owner:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /assigned to:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /responsible:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:will|to)\s+(?:follow up|handle|manage)/i
    ];

    for (const pattern of ownerPatterns) {
      const match = notes.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Calculate confidence score (0-1)
   */
  calculateConfidence(notes) {
    let score = 0.5; // Base score

    // Increase confidence based on note quality
    if (notes.length > 100) score += 0.1;
    if (notes.length > 300) score += 0.1;

    // Has date
    if (/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/. test(notes)) score += 0.1;

    // Has names (capitals)
    if (/[A-Z][a-z]+\s+[A-Z][a-z]+/.test(notes)) score += 0.1;

    // Has action items
    if (/action|next step|to do|task/i.test(notes)) score += 0.1;

    // Has structure (bullets, headings)
    if (/^[-•*#]/m.test(notes)) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Suggest follow-up timing based on content
   */
  suggestFollowUpTiming(notes) {
    const lowerNotes = notes.toLowerCase();

    // Look for urgency indicators
    if (lowerNotes.includes('urgent') || lowerNotes.includes('asap') || lowerNotes.includes('immediately')) {
      return { timing: 'Within 24 hours', priority: 'high' };
    }

    if (lowerNotes.includes('this week') || lowerNotes.includes('soon')) {
      return { timing: 'Within this week', priority: 'medium' };
    }

    if (lowerNotes.includes('next week')) {
      return { timing: 'Next week', priority: 'medium' };
    }

    if (lowerNotes.includes('next month')) {
      return { timing: 'Next month', priority: 'low' };
    }

    // Default based on sentiment
    const sentiment = this.analyzeSentiment(notes);
    if (sentiment === 'negative') {
      return { timing: 'Within 2-3 days', priority: 'high' };
    }

    return { timing: 'Within 1-2 weeks', priority: 'medium' };
  }

  /**
   * Validate processed data before saving
   */
  validateProcessedData(data) {
    const errors = [];

    if (!data.summary || data.summary.length < 10) {
      errors.push('Summary too short or missing');
    }

    if (!data.interactionType) {
      errors.push('Interaction type could not be determined');
    }

    if (!data.outcomeSentiment) {
      errors.push('Sentiment analysis failed');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = new AIMeetingNotesService();
