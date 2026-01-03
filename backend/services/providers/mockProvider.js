/**
 * Mock Data Provider
 *
 * Demonstrates the provider interface for enrichment
 * In production, replace with real providers (Clearbit, Hunter.io, etc.)
 */

class MockProvider {
  constructor() {
    this.name = 'mock-provider';
  }

  /**
   * Query for enrichment data
   * @param {Object} params - Query parameters
   * @param {string} params.email - Email address
   * @param {string} params.linkedinUrl - LinkedIn URL
   * @param {string} params.name - Full name
   * @param {string} params.company - Company name
   * @returns {Promise<Object>} Enrichment data or null
   */
  async query({ email, linkedinUrl, name, company }) {
    // Simulate API delay
    await this.delay(300);

    // Simple pattern matching for demo purposes
    // In production, this would call a real API

    // Check if we have enough data to return a match
    if (!email && !linkedinUrl && !(name && company)) {
      return null;
    }

    // Mock data based on input
    const mockData = this.generateMockData({ email, linkedinUrl, name, company });

    if (!mockData) {
      return null;
    }

    return {
      source: 'mock-provider',
      data: mockData
    };
  }

  /**
   * Generate mock data for demonstration
   */
  generateMockData({ email, linkedinUrl, name, company }) {
    // Return null if insufficient data (simulating "not found")
    if (!email && !name) {
      return null;
    }

    const data = {};

    // Mock name data
    if (email && !name) {
      // Extract name from email (simple heuristic)
      const localPart = email.split('@')[0];
      const nameParts = localPart.split(/[._-]/);
      if (nameParts.length >= 2) {
        data.name = {
          value: nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' '),
          confidence: 0.65
        };
      }
    }

    // Mock title based on email domain or provided company
    if (email || company) {
      const domain = email ? email.split('@')[1] : '';

      // Simple heuristic: common job titles
      const mockTitles = [
        'Senior Product Manager',
        'VP of Engineering',
        'Director of Marketing',
        'Chief Technology Officer',
        'Software Engineer',
        'Project Manager',
        'Business Analyst'
      ];

      data.title = {
        value: mockTitles[Math.floor(Math.random() * mockTitles.length)],
        confidence: 0.75
      };
    }

    // Mock company if not provided
    if (email && !company) {
      const domain = email.split('@')[1];
      if (domain && !domain.includes('gmail') && !domain.includes('yahoo') && !domain.includes('outlook')) {
        const companyName = domain.split('.')[0];
        data.company = {
          value: companyName.charAt(0).toUpperCase() + companyName.slice(1),
          confidence: 0.7
        };
      }
    }

    // Mock LinkedIn URL if not provided
    if (name && !linkedinUrl) {
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      data.linkedinUrl = {
        value: `https://linkedin.com/in/${slug}`,
        confidence: 0.6
      };
    }

    // Mock location
    const mockLocations = [
      'San Francisco, CA',
      'New York, NY',
      'Austin, TX',
      'Seattle, WA',
      'Boston, MA',
      'London, UK',
      'Toronto, Canada'
    ];

    data.location = {
      value: mockLocations[Math.floor(Math.random() * mockLocations.length)],
      confidence: 0.7
    };

    // Mock industry
    const mockIndustries = [
      'Software & Technology',
      'Financial Services',
      'Healthcare',
      'E-commerce',
      'Consulting',
      'Manufacturing'
    ];

    data.industry = {
      value: mockIndustries[Math.floor(Math.random() * mockIndustries.length)],
      confidence: 0.65
    };

    // Mock company size
    const mockSizes = [
      '1-10 employees',
      '11-50 employees',
      '51-200 employees',
      '201-500 employees',
      '501-1000 employees',
      '1000+ employees'
    ];

    data.companySize = {
      value: mockSizes[Math.floor(Math.random() * mockSizes.length)],
      confidence: 0.7
    };

    // Return null if we couldn't generate meaningful data
    if (Object.keys(data).length === 0) {
      return null;
    }

    return data;
  }

  /**
   * Simulate async delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MockProvider;
