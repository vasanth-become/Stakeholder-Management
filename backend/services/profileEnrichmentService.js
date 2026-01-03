/**
 * Profile Enrichment Service
 *
 * Abstract service layer for enriching stakeholder profiles from public data sources
 * Designed to be provider-agnostic and privacy-focused
 */

class ProfileEnrichmentService {
  constructor() {
    this.providers = [];
    this.confidenceThreshold = 0.6; // Minimum confidence to suggest
  }

  /**
   * Register a data provider
   * @param {Object} provider - Provider instance with a query() method
   */
  registerProvider(provider) {
    this.providers.push(provider);
  }

  /**
   * Enrich stakeholder profile based on available identifiers
   *
   * @param {Object} stakeholderData - Input data
   * @param {string} stakeholderData.email - Email address
   * @param {string} stakeholderData.linkedinUrl - LinkedIn profile URL
   * @param {string} stakeholderData.name - Full name
   * @param {string} stakeholderData.company - Company name
   * @returns {Object} Enrichment suggestions with confidence scores
   */
  async enrichProfile(stakeholderData) {
    try {
      const { email, linkedinUrl, name, company } = stakeholderData;

      // Validate we have at least one identifier
      if (!email && !linkedinUrl && !(name && company)) {
        return {
          success: false,
          message: 'Insufficient data for enrichment. Need email, LinkedIn URL, or name + company.',
          suggestions: null
        };
      }

      // Query all registered providers
      const providerResults = await Promise.allSettled(
        this.providers.map(provider =>
          provider.query({ email, linkedinUrl, name, company })
        )
      );

      // Collect successful results
      const successfulResults = providerResults
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(data => data !== null);

      if (successfulResults.length === 0) {
        return {
          success: false,
          message: 'No enrichment data found',
          suggestions: null
        };
      }

      // Merge and normalize results from multiple providers
      const mergedData = this.mergeProviderResults(successfulResults);

      // Apply AI normalization
      const normalizedData = await this.normalizeData(mergedData);

      // Calculate confidence scores
      const suggestions = this.buildSuggestions(normalizedData);

      // Filter by confidence threshold
      const highConfidenceSuggestions = this.filterByConfidence(suggestions);

      if (Object.keys(highConfidenceSuggestions).length === 0) {
        return {
          success: false,
          message: 'No high-confidence suggestions available',
          suggestions: null
        };
      }

      return {
        success: true,
        suggestions: highConfidenceSuggestions,
        metadata: {
          sources: successfulResults.map(r => r.source),
          queriedAt: new Date().toISOString(),
          providersUsed: this.providers.length
        }
      };

    } catch (error) {
      console.error('[Enrichment] Error enriching profile:', error);
      return {
        success: false,
        message: 'Enrichment service error',
        suggestions: null
      };
    }
  }

  /**
   * Merge results from multiple providers
   * Prioritizes data with higher confidence scores
   */
  mergeProviderResults(results) {
    const merged = {};
    const fieldSources = {};

    for (const result of results) {
      for (const [field, data] of Object.entries(result.data || {})) {
        if (!merged[field] || (data.confidence > merged[field].confidence)) {
          merged[field] = data;
          fieldSources[field] = result.source;
        }
      }
    }

    return { merged, fieldSources };
  }

  /**
   * Normalize data using AI
   */
  async normalizeData(data) {
    const aiNormalizationService = require('./aiNormalizationService');

    const { merged, fieldSources } = data;
    const normalized = {};

    // Normalize job title
    if (merged.title) {
      normalized.title = {
        value: await aiNormalizationService.normalizeJobTitle(merged.title.value),
        confidence: merged.title.confidence,
        source: fieldSources.title
      };
    }

    // Derive seniority from title
    if (merged.title) {
      normalized.seniority = {
        value: await aiNormalizationService.deriveSeniority(merged.title.value),
        confidence: 0.8, // AI-derived
        source: 'ai-inference'
      };
    }

    // Infer department from title
    if (merged.title) {
      const department = await aiNormalizationService.inferDepartment(merged.title.value);
      if (department) {
        normalized.department = {
          value: department,
          confidence: 0.7,
          source: 'ai-inference'
        };
      }
    }

    // Generate friendly bio
    if (merged.title || merged.bio) {
      normalized.bio = {
        value: await aiNormalizationService.generateFriendlyBio({
          title: merged.title?.value,
          bio: merged.bio?.value,
          company: merged.company?.value
        }),
        confidence: 0.85,
        source: 'ai-generated'
      };
    }

    // Pass through other fields
    for (const [field, value] of Object.entries(merged)) {
      if (!normalized[field]) {
        normalized[field] = {
          ...value,
          source: fieldSources[field]
        };
      }
    }

    return normalized;
  }

  /**
   * Build structured suggestions
   */
  buildSuggestions(normalizedData) {
    const suggestions = {};

    const fieldMapping = {
      name: 'Full Name',
      title: 'Job Title',
      department: 'Department',
      company: 'Company',
      companySize: 'Company Size',
      location: 'Location',
      linkedinUrl: 'LinkedIn URL',
      bio: 'Bio',
      industry: 'Industry',
      seniority: 'Seniority Level',
      timezone: 'Timezone',
      languages: 'Languages'
    };

    for (const [field, data] of Object.entries(normalizedData)) {
      if (data && data.value && fieldMapping[field]) {
        suggestions[field] = {
          label: fieldMapping[field],
          value: data.value,
          confidence: data.confidence || 0.5,
          source: data.source || 'unknown'
        };
      }
    }

    return suggestions;
  }

  /**
   * Filter suggestions by confidence threshold
   */
  filterByConfidence(suggestions) {
    const filtered = {};

    for (const [field, data] of Object.entries(suggestions)) {
      if (data.confidence >= this.confidenceThreshold) {
        filtered[field] = data;
      }
    }

    return filtered;
  }

  /**
   * Store enrichment metadata
   */
  async saveEnrichmentMetadata(stakeholderId, suggestions, acceptedFields, userId) {
    const db = require('../database/db');

    try {
      // Store enrichment record
      const stmt = db.prepare(`
        INSERT INTO stakeholder_enrichments (
          stakeholder_id,
          suggestions_data,
          accepted_fields,
          rejected_fields,
          enriched_by,
          enriched_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const allFields = Object.keys(suggestions);
      const rejectedFields = allFields.filter(f => !acceptedFields.includes(f));

      stmt.run(
        stakeholderId,
        JSON.stringify(suggestions),
        JSON.stringify(acceptedFields),
        JSON.stringify(rejectedFields),
        userId
      );

      console.log(`[Enrichment] Saved metadata for stakeholder ${stakeholderId}`);
      return true;
    } catch (error) {
      console.error('[Enrichment] Error saving metadata:', error);
      return false;
    }
  }
}

// Singleton instance
const enrichmentService = new ProfileEnrichmentService();

// Register default providers
const MockProvider = require('./providers/mockProvider');
enrichmentService.registerProvider(new MockProvider());

console.log('[Enrichment] Service initialized with mock provider');

module.exports = enrichmentService;
