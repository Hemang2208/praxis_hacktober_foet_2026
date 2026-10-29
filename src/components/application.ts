export default interface IApplication {
  // Basic Information
  full_name: string;
  position: string;
  expectedPackage?: string;
  area: string;

  // Contact Information
  contactInfo: {
    email: string;
    phone: string;
  };

  // Professional Information
  information: {
    position: string;
    experienceLevel: string;
    yearsOfExperience: string;
    expectedPackage?: string;
    currentEmploymentStatus?: string;
    noticePeriod?: string;
  };

  // Links and Documents
  links: {
    resumeURL: string;
    linkedinURL: string;
    githubURL?: string;
    portfolioURL?: string;
    showcaseURL?: string;
  };

  // Detailed Information
  job: {
    skills: string;
    coverLetter: string;
    achievements?: string;
    message?: string;
  };

  // Additional Details
  additionalInfo?: {
    ip?: string;
    geo?: {
      country?: string;
      region?: string;
      city?: string;
      timezone?: string;
      isp?: string;
      org?: string;
      location?: {
        latitude?: number;
        longitude?: number;
      };
    };
    device?: {
      type?: string;
      brand?: string;
      model?: string;
      browser?: string;
      os?: string;
      memory?: number;
      cores?: number;
      connection?: {
        type?: string;
        speed?: number;
        latency?: number;
        dataSaver?: boolean;
      };
      battery?: {
        charging?: boolean;
        level?: number;
        chargingTime?: number;
        dischargingTime?: number;
      };
      permissions?: {
        notifications?: string;
        geolocation?: string;
        camera?: string;
        microphone?: string;
      };
      screen?: {
        width?: number;
        height?: number;
        colorDepth?: number;
        pixelDepth?: number;
        availWidth?: number;
        availHeight?: number;
      };
      viewport?: {
        width?: number;
        height?: number;
      };
    };
    browser?: {
      name?: string;
      version?: string;
      engine?: string;
      engineVersion?: string;
      vendor?: string;
      mobile?: boolean;
      tablet?: boolean;
      desktop?: boolean;
    };
    security?: {
      doNotTrack?: string;
      secureContext?: boolean;
      cookieEnabled?: boolean;
      javaEnabled?: boolean;
      onLine?: boolean;
      webdriver?: boolean;
      plugins?: string[];
      mimeTypes?: string[];
    };
    session?: {
      timestamp?: number;
      sessionId?: string;
      referrer?: string;
      currentUrl?: string;
      timeZone?: string;
      timeZoneOffset?: number;
      language?: string;
      languages?: string[];
      visitDuration?: number;
      pageLoadTime?: number;
    };
    headers?: {
      userAgent?: string;
      accept?: string;
      acceptLanguage?: string;
      acceptEncoding?: string;
      secChUa?: string;
      secChUaPlatform?: string;
      secChUaMobile?: string;
      secFetchSite?: string;
      secFetchMode?: string;
      secFetchDest?: string;
    };
    timestamp?: string;
  };

  // Legal Consent
  privacyConsent: boolean;
}
