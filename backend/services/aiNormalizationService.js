/**
 * AI Normalization Service
 *
 * Normalizes and enriches stakeholder data using intelligent pattern matching
 * and AI-powered analysis. In production, this can be upgraded to use LLM APIs.
 */

class AINormalizationService {
  /**
   * Normalize job title to standard format
   * Cleans up messy titles, expands abbreviations, standardizes casing
   *
   * @param {string} rawTitle - Raw job title from data source
   * @returns {Promise<string>} Normalized job title
   */
  async normalizeJobTitle(rawTitle) {
    if (!rawTitle) return '';

    let title = rawTitle.trim();

    // Common abbreviation expansions
    const abbreviations = {
      'VP': 'Vice President',
      'SVP': 'Senior Vice President',
      'EVP': 'Executive Vice President',
      'AVP': 'Assistant Vice President',
      'CEO': 'Chief Executive Officer',
      'CFO': 'Chief Financial Officer',
      'CTO': 'Chief Technology Officer',
      'CIO': 'Chief Information Officer',
      'COO': 'Chief Operating Officer',
      'CMO': 'Chief Marketing Officer',
      'CPO': 'Chief Product Officer',
      'CISO': 'Chief Information Security Officer',
      'CDO': 'Chief Data Officer',
      'Dir': 'Director',
      'Mgr': 'Manager',
      'Sr': 'Senior',
      'Jr': 'Junior',
      'Assoc': 'Associate',
      'Asst': 'Assistant',
      'Eng': 'Engineer',
      'Dev': 'Developer',
      'Ops': 'Operations',
      'HR': 'Human Resources',
      'IT': 'Information Technology',
      'QA': 'Quality Assurance',
      'UX': 'User Experience',
      'UI': 'User Interface'
    };

    // Replace abbreviations (word boundaries)
    for (const [abbr, full] of Object.entries(abbreviations)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      title = title.replace(regex, full);
    }

    // Remove extra whitespace
    title = title.replace(/\s+/g, ' ').trim();

    // Remove special characters that don't belong
    title = title.replace(/[|•]/g, '-');

    // Capitalize properly
    title = this.toTitleCase(title);

    return title;
  }

  /**
   * Derive seniority level from job title
   *
   * @param {string} title - Job title
   * @returns {Promise<string>} Seniority level
   */
  async deriveSeniority(title) {
    if (!title) return 'mid';

    const titleLower = title.toLowerCase();

    // C-Suite / Executive
    const cSuitePatterns = [
      'chief', 'ceo', 'cfo', 'cto', 'cio', 'coo', 'cmo', 'cpo', 'ciso', 'cdo',
      'president', 'founder', 'co-founder', 'managing partner'
    ];

    if (cSuitePatterns.some(pattern => titleLower.includes(pattern))) {
      return 'executive';
    }

    // Director / VP
    const directorPatterns = [
      'director', 'vice president', 'vp', 'head of', 'evp', 'svp'
    ];

    if (directorPatterns.some(pattern => titleLower.includes(pattern))) {
      return 'director';
    }

    // Senior
    const seniorPatterns = [
      'senior', 'sr.', 'lead', 'principal', 'staff', 'architect'
    ];

    if (seniorPatterns.some(pattern => titleLower.includes(pattern))) {
      return 'senior';
    }

    // Junior
    const juniorPatterns = [
      'junior', 'jr.', 'associate', 'entry', 'assistant', 'intern', 'trainee', 'graduate'
    ];

    if (juniorPatterns.some(pattern => titleLower.includes(pattern))) {
      return 'junior';
    }

    // Manager
    const managerPatterns = [
      'manager', 'supervisor', 'team lead'
    ];

    if (managerPatterns.some(pattern => titleLower.includes(pattern))) {
      return 'manager';
    }

    // Default to mid-level
    return 'mid';
  }

  /**
   * Infer department from job title
   * Only returns department when it's obvious from the title
   *
   * @param {string} title - Job title
   * @returns {Promise<string|null>} Department name or null
   */
  async inferDepartment(title) {
    if (!title) return null;

    const titleLower = title.toLowerCase();

    // Department mapping with confidence
    const departmentPatterns = {
      'Engineering': [
        'engineer', 'developer', 'programmer', 'cto', 'software', 'devops',
        'backend', 'frontend', 'full stack', 'fullstack', 'qa', 'sre', 'architect'
      ],
      'Product': [
        'product manager', 'product owner', 'cpo', 'product lead', 'product director'
      ],
      'Design': [
        'designer', 'ux', 'ui', 'user experience', 'user interface', 'creative director'
      ],
      'Marketing': [
        'marketing', 'cmo', 'brand', 'content', 'seo', 'growth', 'demand gen'
      ],
      'Sales': [
        'sales', 'account executive', 'account manager', 'business development', 'bd', 'revenue'
      ],
      'Customer Success': [
        'customer success', 'customer support', 'client services', 'customer experience'
      ],
      'Finance': [
        'finance', 'cfo', 'accounting', 'controller', 'treasurer', 'financial'
      ],
      'Human Resources': [
        'human resources', 'hr', 'people', 'talent', 'recruiter', 'recruiting'
      ],
      'Operations': [
        'operations', 'coo', 'ops', 'logistics', 'supply chain'
      ],
      'Legal': [
        'legal', 'attorney', 'counsel', 'compliance', 'general counsel'
      ],
      'IT': [
        'information technology', 'it', 'infrastructure', 'systems admin', 'network'
      ],
      'Data': [
        'data scientist', 'data engineer', 'data analyst', 'analytics', 'cdo', 'machine learning', 'ml engineer'
      ],
      'Security': [
        'security', 'ciso', 'infosec', 'cybersecurity'
      ]
    };

    // Find matching department
    for (const [department, patterns] of Object.entries(departmentPatterns)) {
      for (const pattern of patterns) {
        if (titleLower.includes(pattern)) {
          return department;
        }
      }
    }

    // No clear department found
    return null;
  }

  /**
   * Generate friendly professional bio
   * Creates a concise 1-sentence summary from available data
   *
   * @param {Object} data - Input data
   * @param {string} data.title - Job title
   * @param {string} data.bio - Existing bio/description
   * @param {string} data.company - Company name
   * @returns {Promise<string>} Generated bio
   */
  async generateFriendlyBio({ title, bio, company }) {
    // If we have a clean existing bio, use it
    if (bio && bio.length > 20 && bio.length < 200) {
      return bio.trim();
    }

    // Generate from title and company
    if (title && company) {
      return `${title} at ${company}`;
    }

    // Just title
    if (title) {
      return title;
    }

    // Fall back to existing bio if available
    if (bio) {
      return bio.trim();
    }

    return '';
  }

  /**
   * Utility: Convert string to title case
   * Handles special cases for job titles
   */
  toTitleCase(str) {
    // Words that should stay lowercase (unless first word)
    const lowercaseWords = new Set(['of', 'and', 'the', 'in', 'at', 'for', 'to', 'a', 'an']);

    return str
      .toLowerCase()
      .split(' ')
      .map((word, index) => {
        // Always capitalize first word
        if (index === 0) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }

        // Keep lowercase words lowercase
        if (lowercaseWords.has(word)) {
          return word;
        }

        // Capitalize other words
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  /**
   * Batch normalize multiple fields
   * Useful for processing enrichment data
   */
  async normalizeProfile(profileData) {
    const normalized = {};

    if (profileData.title) {
      normalized.title = await this.normalizeJobTitle(profileData.title);
      normalized.seniority = await this.deriveSeniority(normalized.title);
      normalized.department = await this.inferDepartment(normalized.title);
    }

    if (profileData.bio || profileData.title || profileData.company) {
      normalized.bio = await this.generateFriendlyBio({
        title: normalized.title || profileData.title,
        bio: profileData.bio,
        company: profileData.company
      });
    }

    return normalized;
  }
}

// Singleton instance
const aiNormalizationService = new AINormalizationService();

module.exports = aiNormalizationService;
